import type { BaseRow } from './schema';
import { tableNames } from './schema';
import { applyQuery, type ChangeEvent, type DataProvider, type Query } from './types';
import { buildSeed } from './seed';
import { tenant } from '../tenant/tenant';

const KEY = 'hoyos.db.v1';
type Db = Record<string, BaseRow[]>;

export const newId = (prefix = 'row'): string => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * In-browser database: seeded from src/data/seed, persisted to localStorage, emits change events
 * to simulate Supabase realtime. Reseeds when the seed day changes so "today" always has classes.
 */
export class MockProvider implements DataProvider {
  readonly name = 'mock';
  private db: Db;
  private listeners = new Map<string, Set<(e: ChangeEvent) => void>>();

  constructor() {
    this.db = this.load();
    // Cross-tab realtime: another tab's persist() fires `storage` here; reload and tell every subscriber.
    if (typeof window !== 'undefined') window.addEventListener('storage', (e) => this.onStorage(e));
  }

  private onStorage(e: StorageEvent) {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as { seededOn: string; db: Db };
      if (!tableNames.every((t) => Array.isArray(parsed.db[t]))) return;
      this.db = parsed.db;
      for (const t of Object.keys(this.db)) this.emit({ table: t, type: 'reset' });
    } catch { /* ignore a half-written value */ }
  }

  private load(): Db {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { seededOn: string; db: Db };
        if (parsed.seededOn === new Date().toDateString() && tableNames.every((t) => Array.isArray(parsed.db[t]))) return parsed.db;
      }
    } catch { /* fall through to reseed */ }
    const db = buildSeed();
    this.persist(db);
    return db;
  }
  private persist(db = this.db) {
    try { localStorage.setItem(KEY, JSON.stringify({ seededOn: new Date().toDateString(), db })); } catch { /* quota or private mode */ }
  }
  private emit(e: ChangeEvent) {
    this.listeners.get(e.table)?.forEach((cb) => cb(e));
    this.listeners.get('*')?.forEach((cb) => cb(e));
  }
  private rows(table: string): BaseRow[] {
    if (!this.db[table]) this.db[table] = [];
    return this.db[table];
  }

  peek<T extends BaseRow>(table: string, query?: Query): T[] { return applyQuery(this.rows(table) as T[], query); }
  async list<T extends BaseRow>(table: string, query?: Query): Promise<T[]> { return this.peek<T>(table, query); }
  async get<T extends BaseRow>(table: string, id: string): Promise<T | null> { return (this.rows(table).find((r) => r.id === id) as T) ?? null; }

  async insert<T extends BaseRow>(table: string, row: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    const full = { id: newId(table.slice(0, 3)), tenant_id: tenant.id, created_at: now, updated_at: now, ...row } as T;
    this.rows(table).push(full);
    this.persist();
    this.emit({ table, type: 'insert', row: full });
    return full;
  }
  async update<T extends BaseRow>(table: string, id: string, patch: Partial<T>): Promise<T> {
    const rows = this.rows(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`${table}/${id} not found`);
    const next = { ...rows[i], ...patch, updated_at: new Date().toISOString() } as T;
    rows[i] = next;
    this.persist();
    this.emit({ table, type: 'update', row: next, id });
    return next;
  }
  async remove(table: string, id: string): Promise<void> {
    this.db[table] = this.rows(table).filter((r) => r.id !== id);
    this.persist();
    this.emit({ table, type: 'remove', id });
  }
  subscribe(table: string, cb: (e: ChangeEvent) => void): () => void {
    if (!this.listeners.has(table)) this.listeners.set(table, new Set());
    this.listeners.get(table)!.add(cb);
    return () => { this.listeners.get(table)?.delete(cb); };
  }
  async reset(): Promise<void> {
    this.db = buildSeed();
    this.persist();
    for (const t of Object.keys(this.db)) this.emit({ table: t, type: 'reset' });
  }
}
