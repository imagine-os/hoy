import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BaseRow } from './schema';
import type { DataProvider, Query } from './types';
import { MockProvider } from './MockProvider';
import { CompanyOSProvider } from './companyos/CompanyOSProvider';
import { configureLaunch, launchConfig, type LaunchConfig } from '../config/launch';
import { onAppConfigLoaded } from '../auth/appConfig';

const Ctx = createContext<DataProvider | null>(null);

/**
 * The production build (`VITE_HOY_BUILD=production`) talks to Company OS through the Hoy server (lane H-3); the review
 * build keeps the in-browser MockProvider. The launch settings the server publishes (`launch` in /app-config.json) are
 * applied at boot.
 */
function createDefaultProvider(): DataProvider {
  if (import.meta.env?.VITE_HOY_BUILD !== 'production') return new MockProvider();
  const provider = new CompanyOSProvider();
  let applied = false, applying = false;
  const apply = () => {
    if (applying) return Promise.resolve();
    applying = true;
    return provider.launchSettings().then((launch) => {
      if (!launch) return;
      applied = true;
      configureLaunch(launch as Partial<LaunchConfig>);
      watchGoLive();
    }).catch(() => {}).finally(() => { applying = false; });
  };
  void apply();
  // A first /app-config.json read that failed leaves the defaults (Coming Soon): the session's retry loads it again.
  onAppConfigLoaded(() => { if (!applied) void apply(); });
  return provider;
}

/** The longest single wait (setTimeout overflows past ~24.8 days); a later go-live re-arms. */
const MAX_WAIT_MS = 6 * 60 * 60 * 1000;
let goLiveTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * SW-08: a `siteLiveAt` still ahead re-checks the root gate when it arrives, so an open Coming Soon page turns into the
 * website without a reload (`configureLaunch({})` notifies the screens, which re-read `siteIsLive` with the new time).
 */
function watchGoLive() {
  if (goLiveTimer) { clearTimeout(goLiveTimer); goLiveTimer = null; }
  const at = launchConfig().siteLiveAt;
  const wait = at ? Date.parse(at) - Date.now() : NaN;
  if (!(wait > 0)) return;
  goLiveTimer = setTimeout(() => { goLiveTimer = null; configureLaunch({}); watchGoLive(); }, Math.min(wait + 1000, MAX_WAIT_MS));
}

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
export function useTable<T extends BaseRow = BaseRow>(table: string, query?: Query): { rows: T[]; loading: boolean; error?: unknown } {
  const data = useData();
  const key = `${table}|${JSON.stringify(query ?? null)}`;
  const q = useMemo(() => (JSON.parse(key.slice(table.length + 1)) as Query | null) ?? undefined, [key, table]);
  const [fetched, setFetched] = useState<{ key: string; rows: T[]; error?: unknown } | null>(null);
  useEffect(() => {
    let alive = true;
    // A failed read (Company OS refused or unreachable) keeps the last rows it had, stops loading and reports the error.
    const refresh = () => data.list<T>(table, q).then(
      (r) => { if (alive) setFetched({ key, rows: r }); },
      (error) => { if (alive) setFetched((prev) => ({ key, rows: prev && prev.key === key ? prev.rows : [], error })); },
    );
    refresh();
    const off = data.subscribe(table, refresh);
    return () => { alive = false; off(); };
  }, [data, table, key, q]);
  const current = fetched && fetched.key === key ? fetched.rows : null;
  const snapshot = useMemo(() => (current ? null : (data.peek?.<T>(table, q) ?? [])), [current, data, table, q]);
  return { rows: current ?? snapshot!, loading: !current && !data.peek, error: fetched && fetched.key === key ? fetched.error : undefined };
}

export function useRow<T extends BaseRow = BaseRow>(table: string, id: string | undefined): T | null {
  const data = useData();
  const [fetched, setFetched] = useState<{ id: string; row: T | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const refresh = () => data.get<T>(table, id).then((r) => { if (alive) setFetched({ id, row: r }); }, () => { if (alive) setFetched((prev) => ({ id, row: prev && prev.id === id ? prev.row : null })); });
    refresh();
    const off = data.subscribe(table, refresh);
    return () => { alive = false; off(); };
  }, [data, table, id]);
  if (!id) return null;
  if (fetched && fetched.id === id) return fetched.row;
  return data.peek?.<T>(table, { where: { id } })?.[0] ?? null;
}
