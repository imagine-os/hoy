import type { DataProvider } from '../../../data/types';

/**
 * The Company OS seam for the launch payment screens (H-5). The production provider (H-3, `CompanyOSProvider`)
 * exposes `request()`; paths are relative to `/api/cos/t/<tenant>`. These screens do their own entity mapping, so
 * they never depend on how the provider maps the review build's tables. The review build has no `request()`, and
 * the screens say so instead of guessing.
 */
export type CosMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export interface CosPort {
  request<T>(method: CosMethod, path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T>;
  /** Receipt image bytes, streamed by the Hoy server (the API's signed link never reaches the browser). */
  fileBlob?(fileId: string): Promise<Blob>;
  /** Upload link → PUT → confirm, done by the provider (H-3); returns the confirmed `file` record. */
  uploadFile?(input: { ownerEntity: string; ownerId: string; kind: string; file: File }): Promise<unknown>;
}

export function cosOf(data: DataProvider): CosPort | null {
  const port = data as DataProvider & Partial<CosPort>;
  return typeof port.request === 'function' ? (port as unknown as CosPort) : null;
}

/** A refused call. `code` is the API's `error` value (`amount_mismatch`, `forbidden`, …); a check made in the browser is a 422 too. */
export class CosError extends Error {
  constructor(readonly code: string, readonly status = 422) { super(code); }
}
export const errorCode = (e: unknown): string => {
  const v = e as { code?: unknown; error?: unknown; message?: unknown } | null;
  if (v && typeof v.code === 'string' && v.code) return v.code;
  if (v && typeof v.error === 'string' && v.error) return v.error;
  return 'unknown';
};

/**
 * True when a write may or may not have committed: no answer (network, timeout), a 5xx, or a provider that flags the
 * answer as ambiguous (H-3). A 4xx refusal means nothing was written.
 */
export function outcomeUnknown(e: unknown): boolean {
  const v = e as { status?: unknown; ambiguous?: unknown } | null;
  if (v?.ambiguous === true) return true;
  const status = typeof v?.status === 'number' ? v.status : 0;
  return status === 0 || status >= 500;
}

/** One key per user action, reused on every retry of that action (ADR 0040). Never derived from the data. */
export const newIdempotencyKey = (): string => crypto.randomUUID();

/** A Company OS record as `/query` and the runtime return it. */
export interface CosRecord<D> { id: string; data: D; createdAt?: string; updatedAt?: string; createdBy?: string | null }

export type Filter =
  | { field: string; op: 'eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'is_null' | 'is_not_null'; value?: unknown }
  | { and: Filter[] } | { or: Filter[] } | { all: true };
export interface QuerySpec { entity: string; filter?: Filter; sort?: { field: string; dir?: 'asc' | 'desc' }[]; limit?: number; offset?: number; include?: { field: string; fields?: string[]; as?: string }[] }

/** Reads every page (500 rows each) so a list never silently stops at the first page. */
export async function queryAll<D>(cos: CosPort, spec: QuerySpec, max = 5000): Promise<CosRecord<D>[]> {
  const out: CosRecord<D>[] = [];
  for (let offset = 0; offset < max; offset += 500) {
    const page = await cos.request<{ data: CosRecord<D>[] }>('POST', '/query', { ...spec, limit: 500, offset });
    out.push(...page.data);
    if (page.data.length < 500) break;
  }
  return out;
}

export type BatchOp =
  | { op: 'create'; entity: string; data: Record<string, unknown> }
  | { op: 'update'; entity: string; id: string; data: Record<string, unknown>; ifMatch?: { field: string; value: unknown } }
  | { op: 'delete'; entity: string; id: string };

/** Every money write goes through one `/batch` with the action's key: a double tap or a lost answer replays (PG-09). */
export async function batch(cos: CosPort, ops: BatchOp[], idempotencyKey: string): Promise<string[]> {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) throw new CosError('idempotency_key_invalid');
  const res = await cos.request<{ ids: string[] }>('POST', '/batch', { ops }, { idempotencyKey });
  return res.ids;
}

/** The signed-in person (people `person.user` = the login). */
export async function myPerson(cos: CosPort): Promise<CosRecord<{ name?: string; email?: string }> | null> {
  const res = await cos.request<{ data: CosRecord<{ name?: string; email?: string }>[] }>('POST', '/query', { entity: 'person', filter: { field: 'user', op: 'eq', value: { $me: true } }, limit: 1 });
  return res.data[0] ?? null;
}

/** The caller's login id from `/me` (the id `createdBy` and `approved_by` hold). */
export async function myUserId(cos: CosPort): Promise<string> {
  const me = await cos.request<{ user?: { id?: string } | null }>('GET', '/me');
  if (!me.user?.id) throw new CosError('unauthorized', 401);
  return me.user.id;
}

/** Login ids → display names, for "who took it" / "who confirmed". */
export async function memberNames(cos: CosPort): Promise<Map<string, string>> {
  const res = await cos.request<{ members: { id: string; name?: string | null; email?: string | null }[] }>('GET', '/members');
  return new Map(res.members.map((m) => [m.id, (m.name ?? '').trim() || (m.email ?? '').trim() || m.id]));
}

/** Refusal codes the payment screens can meet, each with ES/EN copy in `strings.ts`; anything else → generic + code. */
export const KNOWN_CODES = [
  'amount_mismatch', 'reason_required', 'invalid_amount', 'invalid_method', 'invalid_status_transition', 'product_inactive', 'audience_not_allowed',
  'trial_used', 'for_record_not_found', 'charge_not_found', 'reference_required', 'hold_expired', 'invalid_transition',
  'refunds_disabled', 'duplicate_provider_ref', 'invoice_system_managed',
  'file_too_large', 'file_type_not_allowed', 'file_upload_expired', 'file_upload_missing', 'file_upload_mismatch', 'file_owner_not_found', 'file_not_pending', 'storage_unavailable',
  'idempotency_conflict', 'idempotency_key_invalid', 'forbidden', 'write_forbidden', 'invalid_settings', 'module_not_installed',
  'stale', 'dates_unsupported', 'unauthorized', 'disconnected',
] as const;
/** `ifMatch mismatch` (409): someone changed the row since this screen read it, e.g. two desks reviewing one payment. */
const ALIASES: Record<string, string> = { 'ifMatch mismatch': 'stale' };
export const refusalKey = (code: string): string => { const c = ALIASES[code] ?? code; return (KNOWN_CODES as readonly string[]).includes(c) ? `payLaunch.code.${c}` : 'payLaunch.code.generic'; };
