import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BaseRow } from './schema';
import type { DataProvider, Query } from './types';
import { MockProvider } from './MockProvider';

const Ctx = createContext<DataProvider | null>(null);

/** Swap the provider here when Supabase is ready: new SupabaseProvider(url, key). */
function createDefaultProvider(): DataProvider { return new MockProvider(); }

export function DataProviderRoot({ provider, children }: { provider?: DataProvider; children: ReactNode }) {
  const p = useMemo(() => provider ?? createDefaultProvider(), [provider]);
  return <Ctx.Provider value={p}>{children}</Ctx.Provider>;
}

export function useData(): DataProvider {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProviderRoot');
  return v;
}

/**
 * Live rows for a table: first render from the synchronous snapshot, then follows change events.
 * When the query changes, the snapshot is re-read synchronously (no stale rows for one render), which is
 * what lets SessionProvider resolve a freshly created account before RequireRole runs.
 */
export function useTable<T extends BaseRow = BaseRow>(table: string, query?: Query): { rows: T[]; loading: boolean; error: boolean; retry: () => void } {
  const data = useData();
  const key = `${table}|${JSON.stringify(query ?? null)}`;
  const q = useMemo(() => (JSON.parse(key.slice(table.length + 1)) as Query | null) ?? undefined, [key, table]);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const [fetched, setFetched] = useState<{ data: DataProvider; key: string; rows: T[] | null; loading: boolean; error: boolean; completed: boolean } | null>(null);
  useEffect(() => {
    let alive = true, generation = 0;
    const refresh = async () => {
      if (!alive) return;
      const request = ++generation;
      setFetched(previous => ({ data, key, rows: previous?.data === data && previous.key === key ? previous.rows : null, loading: true, error: false, completed: previous?.data === data && previous.key === key ? previous.completed : false }));
      try {
        const rows = await data.list<T>(table, q);
        if (alive && request === generation) setFetched({ data, key, rows, loading: false, error: false, completed: true });
      } catch {
        if (alive && request === generation) setFetched(previous => ({ data, key, rows: previous?.data === data && previous.key === key ? previous.rows : null, loading: false, error: true, completed: true }));
      }
    };
    void refresh();
    const off = data.subscribe(table, () => { void refresh(); });
    return () => { alive = false; off(); };
  }, [data, table, key, q, revision]);
  const current = fetched?.data === data && fetched.key === key ? fetched : null;
  const snapshot = useMemo(() => current?.rows == null ? data.peek?.<T>(table, q) : undefined, [current, data, table, q]);
  const emptyRows = useMemo<T[]>(() => [], []);
  // Only the initial read may rely on a synchronous snapshot; retries must confirm the current result.
  const loading = current ? current.loading && (current.completed || snapshot === undefined) : snapshot === undefined;
  return { rows: current?.rows ?? snapshot ?? emptyRows, loading, error: current?.error ?? false, retry };
}

export function useRow<T extends BaseRow = BaseRow>(table: string, id: string | undefined): T | null {
  const data = useData();
  const [fetched, setFetched] = useState<{ id: string; row: T | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const refresh = () => data.get<T>(table, id).then((r) => { if (alive) setFetched({ id, row: r }); });
    refresh();
    const off = data.subscribe(table, refresh);
    return () => { alive = false; off(); };
  }, [data, table, id]);
  if (!id) return null;
  if (fetched && fetched.id === id) return fetched.row;
  return data.peek?.<T>(table, { where: { id } })?.[0] ?? null;
}
