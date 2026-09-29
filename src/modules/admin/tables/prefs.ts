import { useCallback, useState } from 'react';

/**
 * 0043 — per-viewer conveniences of the table manager, kept in localStorage `hoyos.tables.prefs`: the sidebar state,
 * which groups are closed, pinned and recent tables and the "technical names" switch. Never shared state (saved views
 * live in the `table_views` table), and the page renders the same when storage is blocked.
 */
export type SidebarMode = 'expanded' | 'rail';
export interface TablesPrefs {
  sidebar: SidebarMode;
  closedGroups: string[];
  pinned: string[];
  recent: string[];
  /** null = follow dev mode (on when dev mode is on). */
  technical: boolean | null;
}

const KEY = 'hoyos.tables.prefs';
const DEFAULTS: TablesPrefs = { sidebar: 'expanded', closedGroups: [], pinned: [], recent: [], technical: null };

function read(): TablesPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<TablesPrefs>;
    return { ...DEFAULTS, ...p, closedGroups: p.closedGroups ?? [], pinned: p.pinned ?? [], recent: p.recent ?? [] };
  } catch { return DEFAULTS; }
}

export function useTablesPrefs(): [TablesPrefs, (fn: (p: TablesPrefs) => TablesPrefs) => void] {
  const [prefs, setPrefs] = useState<TablesPrefs>(read);
  const update = useCallback((fn: (p: TablesPrefs) => TablesPrefs) => setPrefs((p) => {
    const next = fn(p);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep it in memory */ }
    return next;
  }), []);
  return [prefs, update];
}

export const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
export const pushRecent = (list: string[], v: string) => [v, ...list.filter((x) => x !== v)].slice(0, 5);
