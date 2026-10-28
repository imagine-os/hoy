import type { BaseRow, BookingRow, ClassSessionRow } from '../../../data/schema';
import { MS } from '../../../i18n/format';
import type { BookingPolicy } from './bookingPolicy';

/**
 * A Company OS booking as the connector (H-3) maps it onto the `bookings` table: the frontend fields plus the server-set
 * hold and policy fields under their Company OS names (bookings 1.4.0). Everything here is read-only display.
 */
export interface ServerBookingRow extends BaseRow, Pick<BookingRow, 'user_id' | 'session_id' | 'paid_with' | 'ledger_id' | 'payment_id' | 'checked_in_at' | 'cancelled_at' | 'rated'> {
  status: BookingRow['status'] | 'held';
  mat_number?: number | null;
  payment_method?: 'transfer' | 'desk' | null;
  hold_until?: string | null;
  hold_frozen_at?: string | null;
  hold_left_minutes?: number | null;
  cancel_reason?: string | null;
  policy_late_cancel_hours?: number | null;
  policy_hold_minutes?: number | null;
  policy_reschedule_hours?: number | null;
}

/**
 * Statuses that hold a place in the class: a booking, a check-in, or a live hold (frozen, or before `hold_until`). A hold
 * that ran out but isn't released yet (the server releases lazily or every 5 minutes) no longer counts: the customer may book again.
 */
export const holdsPlace = (b: Pick<ServerBookingRow, 'status' | 'hold_until' | 'hold_frozen_at'>, now = Date.now()) =>
  b.status === 'booked' || b.status === 'checked_in' || b.status === 'held' && (!!b.hold_frozen_at || Date.parse(b.hold_until ?? '') > now);

/**
 * PG-03 / J1 / J1c — what the customer sees about a held spot.
 * - `waiting_reception`: a receipt is with reception (`hold_frozen_at`); the spot stays held, past the class start too.
 * - `not_started`: booked outside reception hours; the clock starts at `clockStartsAt` (e.g. 08:00).
 * - `until_class`: the hold ends at the class start (a night booking for an early class); send the receipt before it.
 * - `running`: the clock is running until `until`.
 * - `expired`: the hold has run out; the server releases it on its next pass.
 */
export type HoldPhase = 'waiting_reception' | 'not_started' | 'until_class' | 'running' | 'expired';
export interface HoldView { phase: HoldPhase; until: string | null; clockStartsAt: string | null; minutes: number; method: 'transfer' | 'desk' }

export function holdView(booking: ServerBookingRow, classStartsAt: string, policy: BookingPolicy, now = Date.now()): HoldView | null {
  if (booking.status !== 'held') return null;
  const method = booking.payment_method === 'desk' ? 'desk' : 'transfer';
  const minutes = booking.policy_hold_minutes ?? (method === 'desk' ? policy.holdMinutesDesk : policy.holdMinutesTransfer);
  if (booking.hold_frozen_at) return { phase: 'waiting_reception', until: null, clockStartsAt: null, minutes, method };
  const until = Date.parse(booking.hold_until ?? '');
  if (!Number.isFinite(until) || until <= now) return { phase: 'expired', until: booking.hold_until ?? null, clockStartsAt: null, minutes, method };
  const iso = new Date(until).toISOString();
  if (until === Date.parse(classStartsAt)) return { phase: 'until_class', until: iso, clockStartsAt: null, minutes, method };
  const clockStart = until - minutes * MS.min;
  if (clockStart > now) return { phase: 'not_started', until: iso, clockStartsAt: new Date(clockStart).toISOString(), minutes, method };
  return { phase: 'running', until: iso, clockStartsAt: null, minutes, method };
}

/** RS-08 — payment status read from the booking itself: held = pending, a released hold = released, otherwise confirmed. */
export type ServerPaymentStatus = 'pending' | 'confirmed' | 'released' | 'unknown';
export function serverPaymentStatus(booking: ServerBookingRow): ServerPaymentStatus {
  if (booking.status === 'held') return 'pending';
  if (booking.cancel_reason === 'hold_expired') return 'released';
  if (booking.status === 'booked' || booking.status === 'checked_in' || booking.status === 'no_show' || booking.status === 'late_cancel') return 'confirmed';
  return 'unknown';
}

/** RS-09 / J3b — the move deadline: the class start minus the booking's own copy of `reschedule_hours`, else the setting. Null = moving is off. */
export function moveDeadline(booking: ServerBookingRow, classStartsAt: string, policy: BookingPolicy): number | null {
  const hours = booking.policy_reschedule_hours ?? policy.rescheduleHours;
  const start = Date.parse(classStartsAt);
  return hours > 0 && Number.isFinite(start) ? start - hours * MS.hour : null;
}

/** The move button is offered while now is at or before the deadline, for a booking or a live hold. The server still decides. */
export function moveOpen(booking: ServerBookingRow, classStartsAt: string, policy: BookingPolicy, now = Date.now()): boolean {
  const deadline = moveDeadline(booking, classStartsAt, policy);
  if (deadline == null || now > deadline) return false;
  if (booking.status === 'booked') return true;
  const hold = holdView(booking, classStartsAt, policy, now);
  return !!hold && hold.phase !== 'expired';
}

/** Explainer only: what the class detail shows instead of the book button. The server answers `occurrence_not_open` itself. */
export type ClassPhase = 'open' | 'full' | 'started' | 'ended' | 'cancelled' | 'completed';
export function classPhase(session: Pick<ClassSessionRow, 'status' | 'starts_at' | 'ends_at' | 'capacity' | 'booked_count'>, now = Date.now()): ClassPhase {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';
  if (Date.parse(session.ends_at) <= now) return 'ended';
  if (Date.parse(session.starts_at) <= now) return 'started';
  return session.booked_count >= session.capacity ? 'full' : 'open';
}

/** RS-03 — the purchase link for a trial or package keeps the chosen class (and mat) so the customer comes back to it. */
/** The only return targets the purchase screen follows: this app's checkout for one class, with an optional mat. */
export function safeCheckoutReturn(next: string | null): string | null {
  return next && /^\/app\/checkout\/[A-Za-z0-9_-]{1,64}(\?mat=\d{1,2})?$/.test(next) ? next : null;
}

export function purchaseReturnLink(planId: string, sessionId: string, mat: number | null): string {
  const back = `/app/checkout/${encodeURIComponent(sessionId)}${mat ? `?mat=${mat}` : ''}`;
  return `/app/plans?plan=${encodeURIComponent(planId)}&next=${encodeURIComponent(back)}`;
}
