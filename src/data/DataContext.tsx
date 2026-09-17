import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BaseRow } from './schema';
import type { DataProvider, Query } from './types';
import { MockProvider } from './MockProvider';

const Ctx = createContext<DataProvider | null>(null);

/** Swap the provider here when Supabase is ready: new SupabaseProvider(url, key). */
export function createDefaultProvider(): DataProvider { return new MockProvider(); }

export function DataProviderRoot({ provider, children }: { provider?: DataProvider; children: ReactNode }) {
  const p = useMemo(() => provider ?? createDefaultProvider(), [provider]);
  return <Ctx.Provider value={p}>{children}</Ctx.Provider>;
}

export function useData(): DataProvider {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProviderRoot');
  return v;
}

/** Live rows for a table: first render from the synchronous snapshot, then follows change events. */
export function useTable<T extends BaseRow = BaseRow>(table: string, query?: Query): { rows: T[]; loading: boolean } {
  const data = useData();
  const key = JSON.stringify(query ?? null);
  const [rows, setRows] = useState<T[]>(() => data.peek?.<T>(table, query) ?? []);
  const [loading, setLoading] = useState(!data.peek);
  useEffect(() => {
    let alive = true;
    const q = key === 'null' ? undefined : (JSON.parse(key) as Query);
    const refresh = () => data.list<T>(table, q).then((r) => { if (alive) { setRows(r); setLoading(false); } });
    refresh();
    const off = data.subscribe(table, refresh);
    return () => { alive = false; off(); };
  }, [data, table, key]);
  return { rows, loading };
}

export function useRow<T extends BaseRow = BaseRow>(table: string, id: string | undefined): T | null {
  const data = useData();
  const [row, setRow] = useState<T | null>(() => (id ? (data.peek?.<T>(table, { where: { id } })?.[0] ?? null) : null));
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const refresh = () => data.get<T>(table, id).then((r) => { if (alive) setRow(r); });
    refresh();
    const off = data.subscribe(table, refresh);
    return () => { alive = false; off(); };
  }, [data, table, id]);
  return row;
}
