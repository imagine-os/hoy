import type { BaseRow } from './schema';
import type { ChangeEvent, DataProvider, Query } from './types';

/**
 * Stub for the real backend. Same interface as MockProvider, so swapping is a one-line change in
 * src/data/DataContext.tsx. See docs/data-model.md for the mapping and supabase/schema.sql.
 *
 * TODO(supabase): npm i @supabase/supabase-js; createClient(import.meta.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * TODO(supabase): list → from(table).select('*').match(where).order(col).range(offset, offset+limit-1)
 * TODO(supabase): tenant_id is enforced by RLS from the JWT claim `tenant_id`; never pass it from the client.
 * TODO(supabase): subscribe → channel(`table:${table}`).on('postgres_changes', { event: '*', schema: 'public', table }, …)
 * TODO(supabase): auth → supabase.auth (email/password, Apple, Google, WhatsApp OTP via edge function)
 */
export class SupabaseProvider implements DataProvider {
  readonly name = 'supabase';
  constructor(private url: string, private anonKey: string) {
    if (!url || !anonKey) throw new Error('SupabaseProvider needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  async list<T extends BaseRow>(_table: string, _query?: Query): Promise<T[]> { throw notReady(); }
  async get<T extends BaseRow>(_table: string, _id: string): Promise<T | null> { throw notReady(); }
  async insert<T extends BaseRow>(_table: string, _row: Partial<T>): Promise<T> { throw notReady(); }
  async update<T extends BaseRow>(_table: string, _id: string, _patch: Partial<T>): Promise<T> { throw notReady(); }
  async remove(_table: string, _id: string): Promise<void> { throw notReady(); }
  subscribe(_table: string, _cb: (e: ChangeEvent) => void): () => void { return () => {}; }
}

function notReady() { return new Error('SupabaseProvider is a stub. Follow the TODOs in src/data/SupabaseProvider.ts'); }
