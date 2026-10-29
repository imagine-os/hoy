import { PRODUCTION_BUILD } from '../../../config/launch';
import type { DataProvider } from '../../../data/types';

/**
 * H-7 · the Company OS calls reception and administration make, beyond list/get/insert/update.
 *
 * The production provider (H-3) exposes `request(method, path, body?, { idempotencyKey })`, with `path` relative to
 * `/api/cos/t/<tenant>` (`/batch`, `/api/booking/<id>`, `/query`, `/modules/bookings/settings`, `/invitations`…), and
 * throws an error carrying `{ status, code }` for a refusal. That is the shape lane H-5 proposed; this file only
 * feature-detects it, so the review build (MockProvider, no `request`) keeps its browser commands.
 */
export type CosMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type CosRequest = <T = unknown>(method: CosMethod, path: string, body?: unknown, options?: { idempotencyKey?: string }) => Promise<T>;

/** One `/batch` op (integration guide §5). `{ $ref: n }` as a top-level data value is op n's new id. */
export type BatchOp =
  | { op: 'create'; entity: string; data: Record<string, unknown> }
  | { op: 'update'; entity: string; id: string; data: Record<string, unknown>; ifMatch?: { field: string; value: unknown } }
  | { op: 'delete'; entity: string; id: string };
export const ref = (n: number) => ({ $ref: n });

const bound = new WeakMap<DataProvider, CosRequest>();
/** The production provider's request function, or null. Stable per provider, so React effects can depend on it. */
export function cosRequest(data: DataProvider): CosRequest | null {
  const r = (data as DataProvider & { request?: unknown }).request;
  if (typeof r !== 'function') return null;
  let f = bound.get(data);
  if (!f) { f = r.bind(data) as CosRequest; bound.set(data, f); }
  return f;
}

/** Which implementation the desk and admin hooks use: the server's rules in production, the browser copies in review. */
export function backendFor(data: DataProvider): { kind: 'server'; request: CosRequest } | { kind: 'review' } | { kind: 'disconnected' } {
  const request = cosRequest(data);
  if (request) return { kind: 'server', request };
  return PRODUCTION_BUILD ? { kind: 'disconnected' } : { kind: 'review' };
}

/** All ops in one transaction, with the user action's key so a double tap or retry never writes twice (ADR 0040). */
export async function batch(request: CosRequest, ops: BatchOp[], idempotencyKey: string): Promise<string[]> {
  if (!ops.length) return [];
  const res = await request<{ ids: string[] }>('POST', '/batch', { ops }, { idempotencyKey });
  return res.ids;
}

/** The refusal code of an error from either build: `.code` (server), else the message (browser commands throw `Error(code)`). */
export function errorCode(e: unknown): string {
  if (e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string') return (e as { code: string }).code;
  return e instanceof Error ? e.message : 'failed';
}

/** A fresh key for one user action; reused only by that action's retries. */
export const newActionKey = () => crypto.randomUUID();

/**
 * One idempotency key per user action: the same intent (same button, same record and state, same inputs) reuses its
 * key until it succeeds, so a retry after a lost answer replays instead of writing twice; a success forgets it, and a
 * changed input is a new action with a new key (never the old key with a new body, which the server refuses).
 */
export function createActionKeys(make: () => string = newActionKey) {
  const keys = new Map<string, string>();
  return {
    keyFor: (intent: unknown[]) => { const k = JSON.stringify(intent); let v = keys.get(k); if (!v) { v = make(); keys.set(k, v); } return v; },
    done: (intent: unknown[]) => { keys.delete(JSON.stringify(intent)); },
  };
}
