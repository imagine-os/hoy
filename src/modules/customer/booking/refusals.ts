/**
 * Rule C7 — every refusal code the booking flows can get back has Spanish and English copy (`customer.refusal.<code>` in
 * `strings.ts`). Any other code shows the generic message with the code, so support can trace it.
 */
export const BOOKING_REFUSALS = [
  // bookings
  'occurrence_full', 'occurrence_not_open', 'already_booked', 'daily_limit_reached', 'spot_required', 'spot_invalid', 'spot_taken',
  'hold_expired', 'reschedule_window_closed', 'invalid_transition', 'booking_system_managed', 'reason_required',
  // credits (a booking from the balance, a redeemed voucher)
  'no_credits', 'lot_expired', 'lot_frozen', 'trial_used', 'voucher_invalid', 'voucher_expired', 'voucher_redeemed', 'voucher_used_up',
  // payments and files (the receipt for a held class)
  'product_inactive', 'audience_not_allowed', 'for_record_not_found',
  'file_too_large', 'file_type_not_allowed', 'file_upload_expired', 'file_upload_missing', 'storage_unavailable',
  // requests
  'idempotency_conflict', 'idempotency_key_invalid', 'forbidden',
] as const;
export type BookingRefusal = (typeof BOOKING_REFUSALS)[number];

/**
 * The server's refusal code (`err.code`, set by the connector on a 4xx answer), or null when the outcome is unknown: no
 * answer (offline, timeout, `network_error`, `service_unavailable`), a 5xx, or an error the connector flags `ambiguous`.
 * Then the same key is retried, so a write that did land is replayed, not repeated. A bare `Error(message)` never counts
 * as an answer, so it never rotates the key. A browser-side refusal (status 0, e.g. `not_in_launch`) is final.
 */
export function refusalCode(error: unknown): string | null {
  const e = error as { code?: unknown; status?: unknown; ambiguous?: unknown } | null;
  if (e?.ambiguous === true || (typeof e?.status === 'number' && e.status >= 500)) return null;
  const code = e?.code;
  if (code === 'network_error' || code === 'service_unavailable') return null;
  return typeof code === 'string' && /^[a-z][a-z0-9_]*$/.test(code) ? code : null;
}

/** The string key for an error; `vars.code` fills the generic message. */
export function refusalMessage(error: unknown): { key: string; vars: { code: string } } {
  const code = refusalCode(error);
  if (!code) return { key: 'customer.refusal.network', vars: { code: '' } };
  return (BOOKING_REFUSALS as readonly string[]).includes(code) ? { key: `customer.refusal.${code}`, vars: { code } } : { key: 'customer.refusal.generic', vars: { code } };
}
