import { addDaysKey } from '../../../i18n/format';
import type { BatchOp, CosPort, CosRecord } from '../../transfers/launch/cos';

/**
 * PR-01 / PR-02 — the product master on Company OS (payments `product`). One row per price period: a price change
 * ends the current row the day before and starts a new row with the same `key`. Sales reference a row by id, so a
 * past sale keeps its price and the history is the list of rows. The server checks the price of every sale; these
 * helpers only shape and pre-check what the admin types.
 */
export const PRODUCT_KINDS = ['single', 'trial', 'pack', 'private', 'gift'] as const;
export type ProductKind = typeof PRODUCT_KINDS[number];
export interface ProductData {
  key: string; name: string; kind: ProductKind; price: number;
  credits?: number | null; validity_days?: number | null; freezable?: boolean | null;
  audience?: string | null; active?: boolean | null;
  valid_from?: string | null; valid_until?: string | null;
}
export type ProductRow = CosRecord<ProductData>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (v: string | null | undefined) => v == null || v === '' || (DAY.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v);
const whole = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const norm = (v: string | null | undefined) => (v ? v : null);

/** Inclusive periods; an empty end is open. */
export function periodsOverlap(a: Pick<ProductData, 'valid_from' | 'valid_until'>, b: Pick<ProductData, 'valid_from' | 'valid_until'>): boolean {
  const aFrom = norm(a.valid_from) ?? '0000-01-01', aTo = norm(a.valid_until) ?? '9999-12-31';
  const bFrom = norm(b.valid_from) ?? '0000-01-01', bTo = norm(b.valid_until) ?? '9999-12-31';
  return aFrom <= bTo && bFrom <= aTo;
}

/** Returns a `products.launch.error.*` suffix, or null when the row may be saved. */
export function validateProduct(d: ProductData, others: ProductRow[], selfId: string | null = null): string | null {
  if (!/^[a-z0-9_]{2,40}$/.test(d.key ?? '')) return 'key';
  if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 100) return 'name';
  if (!(PRODUCT_KINDS as readonly string[]).includes(d.kind)) return 'kind';
  if (!whole(d.price, 0, 1_000_000_000)) return 'price';
  if (d.credits != null && !whole(d.credits, 0, 1000)) return 'credits';
  if (d.validity_days != null && !whole(d.validity_days, 0, 3650)) return 'validity';
  if ((d.kind === 'pack' || d.kind === 'trial') && !whole(d.credits, 1, 1000)) return 'credits';
  if (d.audience != null && d.audience !== '' && !/^[a-z0-9_]+(,[a-z0-9_]+)*$/.test(d.audience)) return 'audience';
  if (!validDay(d.valid_from) || !validDay(d.valid_until)) return 'dates';
  if (norm(d.valid_from) && norm(d.valid_until) && d.valid_from! > d.valid_until!) return 'dates';
  if (d.active !== false && others.some((o) => o.id !== selfId && o.data.key === d.key && o.data.active !== false && periodsOverlap(o.data, d))) return 'overlap';
  return null;
}

/** The rows on sale on a day (studio date), one per key at most when the master is valid. */
export function inForce(rows: ProductRow[], day: string): ProductRow[] {
  return rows.filter((r) => r.data.active !== false && (!norm(r.data.valid_from) || r.data.valid_from! <= day) && (!norm(r.data.valid_until) || r.data.valid_until! >= day));
}
export const rowOnDay = (rows: ProductRow[], key: string, day: string): ProductRow | null => inForce(rows, day).find((r) => r.data.key === key) ?? null;

/** A private class has no public price: the customer contacts the club and the desk quotes it (J4). */
export const publicPrice = (row: ProductRow): number | null => (row.data.kind === 'private' ? null : row.data.price);
/** PR-05: the Santa María pack (audience `affiliate`) is sold only to members the desk marked as affiliates. */
export const isAffiliateOnly = (row: Pick<ProductRow, 'data'>): boolean => (row.data.audience ?? '').split(',').includes('affiliate');

/** Price history of one key, newest period first. */
export function history(rows: ProductRow[], key: string): ProductRow[] {
  return rows.filter((r) => r.data.key === key).sort((a, b) => (norm(b.data.valid_from) ?? '').localeCompare(norm(a.data.valid_from) ?? ''));
}

/** Groups rows by key for the master list (one card per product, its periods inside). */
export function byKey(rows: ProductRow[]): { key: string; rows: ProductRow[] }[] {
  const keys = [...new Set(rows.map((r) => r.data.key))].sort();
  return keys.map((key) => ({ key, rows: history(rows, key) }));
}

const clean = (d: ProductData): Record<string, unknown> => ({
  key: d.key, name: d.name.trim(), kind: d.kind, price: d.price, credits: d.credits ?? null, validity_days: d.validity_days ?? null,
  freezable: !!d.freezable, audience: d.audience ? d.audience : null, active: d.active !== false,
  valid_from: norm(d.valid_from), valid_until: norm(d.valid_until),
});

export function createOps(d: ProductData): BatchOp[] { return [{ op: 'create', entity: 'product', data: clean(d) }]; }

/**
 * Editing a row in place is for corrections (name, classes, active, dates). The price of a row that may already have
 * sales never changes in place: `newPriceOps` ends it and opens the next period. `ifMatch` on the price refuses the
 * write if someone else changed it meanwhile.
 */
export function editOps(row: ProductRow, d: ProductData): BatchOp[] {
  if (d.price !== row.data.price) throw new Error('price_in_place');
  return [{ op: 'update', entity: 'product', id: row.id, data: clean(d), ifMatch: { field: 'price', value: row.data.price } }];
}

/** PR-02: a new price from `from` (inclusive). The current row ends the day before; past sales keep their row. */
export function newPriceOps(current: ProductRow, price: number, from: string, all: ProductRow[]): BatchOp[] {
  if (!validDay(from) || !from) throw new Error('dates');
  if (norm(current.data.valid_from) && from <= current.data.valid_from!) throw new Error('dates');
  if (norm(current.data.valid_until) && from > current.data.valid_until!) throw new Error('dates');
  const next: ProductData = { ...current.data, price, valid_from: from, valid_until: norm(current.data.valid_until) };
  const ended: ProductData = { ...current.data, valid_until: addDaysKey(from, -1) };
  const others = all.filter((r) => r.id !== current.id);
  const problem = validateProduct(next, [...others, { ...current, data: ended }]);
  if (problem) throw new Error(problem);
  return [
    { op: 'update', entity: 'product', id: current.id, data: { valid_until: ended.valid_until }, ifMatch: { field: 'price', value: current.data.price } },
    { op: 'create', entity: 'product', data: clean(next) },
  ];
}

/**
 * G1: dated prices need payments 2.7.0 (`product.valid_from` / `valid_until`, CO-6). Before that the API answers 400 to a
 * filter on an unknown field and drops the fields on write, so the screen asks first and refuses dated saves until then.
 */
export async function datesSupported(cos: CosPort): Promise<boolean> {
  try { await cos.request('POST', '/query', { entity: 'product', filter: { field: 'valid_from', op: 'is_null' }, limit: 1 }); return true; }
  catch (e) { if ((e as { status?: number }).status === 400) return false; throw e; }
}
/** Without server dates a row has none: creating one with dates, or a "new price from a date", must not be sent. */
export const undated = (d: ProductData): ProductData => ({ ...d, valid_from: null, valid_until: null });

/** G1: until the server stores `valid_from` / `valid_until`, it drops them silently. A save is "done" only if they stuck. */
export function datesStored(sent: Partial<Pick<ProductData, 'valid_from' | 'valid_until'>>, saved: Pick<ProductData, 'valid_from' | 'valid_until'> | undefined): boolean {
  if (!saved) return false;
  return (!('valid_from' in sent) || norm(sent.valid_from) === norm(saved.valid_from)) && (!('valid_until' in sent) || norm(sent.valid_until) === norm(saved.valid_until));
}

/** After a batch: did every row we wrote keep the dates we sent? */
export function opsDatesStored(ops: BatchOp[], ids: string[], after: ProductRow[]): boolean {
  return ops.every((o, i) => o.op === 'delete' || datesStored(o.data as Partial<ProductData>, after.find((r) => r.id === ids[i])?.data));
}
