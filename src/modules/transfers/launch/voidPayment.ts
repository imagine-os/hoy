import { hasRefusalCopy, refusalCopy } from '../../../data/companyos/refusals';
import type { Lang } from '../../../i18n/types';
import { batch, CosError, refusalKey, type BatchOp, type CosPort } from './cos';

/**
 * The payment void on Company OS (credits and payments void settings): the server takes back the classes, refuses with a
 * named code, and marks the receipt. These helpers only build the write and read the result; the field names are here
 * and nowhere else. An approved payment only: a pending one keeps its reject and its delete.
 */
export const VOIDABLE_STATUS = 'approved';
const MIN_REASON = 3, MAX_REASON = 500;

export function voidOps(paymentId: string, reason: string): BatchOp[] {
  const why = reason.trim();
  if (why.length < MIN_REASON) throw new CosError('reason_required');
  return [{ op: 'update', entity: 'payment', id: paymentId, data: { status: 'voided', status_reason: why.slice(0, MAX_REASON) }, ifMatch: { field: 'status', value: VOIDABLE_STATUS } }];
}

export const voidPayment = (cos: CosPort, paymentId: string, reason: string, key: string): Promise<string[]> => batch(cos, voidOps(paymentId, reason), key);

/**
 * The `/me` Super Admin flag, never the session's role: an Administration login that also holds Super Admin resolves to
 * `admin` first (AD-04). The review build has no Company OS, so it never gets the action.
 */
export const canVoidPayment = (i: { superAdmin: boolean; connected: boolean; status: unknown }): boolean => i.superAdmin && i.connected && i.status === VOIDABLE_STATUS;

/** Whether this receipt screen shows the void's reason (owner, 2026-11-04): staff yes; the customer's says voided, without it. */
export const showVoidReason = (staff: boolean): boolean => staff;

/** A receipt is voided when the server set `voided_at`; a payment with no receipt, by its own status. */
export function receiptVoid(payment: { status?: unknown; status_reason?: string | null }, invoice?: { voided_at?: string | null; void_reason?: string | null } | null): { voided: boolean; reason: string | null } {
  const voided = !!invoice?.voided_at || payment.status === 'voided';
  return { voided, reason: voided ? (invoice?.void_reason || payment.status_reason || '').trim() || null : null };
}

/** The line for a refused void: the code→copy table first, then the payment screens' own codes (`stale`) or the generic line with its code. */
export function voidRefusalLine(code: string, lang: Lang, t: (key: string, vars?: Record<string, string | number>) => string): string {
  // The table's `reason_required` is about a new reason; here the reason is new, and what's missing is its length.
  if (code === 'reason_required') return t(refusalKey(code), { code });
  return hasRefusalCopy(code) ? refusalCopy(code, lang) : t(refusalKey(code), { code });
}
