import type { BookingRow, ClassSessionRow, PaymentRow } from '../../../data/schema';

/**
 * RC-01 · the front desk's numbers for today, from one function. The home tiles, the check-in header and the pending
 * payments badge all read this, so the same booking or payment can never be counted two ways.
 *
 * - arrivals: today's bookings marked Arrived (`checked_in`);
 * - expected: today's bookings still to arrive (`booked`, and `held` while a payment is on its way);
 * - noShows: today's bookings marked No-show;
 * - pendingPayments: payments waiting for the desk (`pending`), the same rule the pending list uses;
 * - next: the first class today that hasn't ended, not cancelled.
 */
export interface DeskFigures { arrivals: number; expected: number; noShows: number; pendingPayments: number; classesToday: number; next: ClassSessionRow | null }

/** Statuses that hold a place today (the roster's Expected group). */
export const EXPECTED_STATUSES: ReadonlySet<string> = new Set(['booked', 'held']);
export const isPendingPayment = (p: Pick<PaymentRow, 'status'>) => p.status === 'pending';

export function deskFigures(input: { sessions: ClassSessionRow[]; bookings: BookingRow[]; payments: PaymentRow[]; now: number; isToday: (iso: string) => boolean }): DeskFigures {
  const today = input.sessions.filter(s => s.status !== 'cancelled' && input.isToday(s.starts_at)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const ids = new Set(today.map(s => s.id));
  const mine = input.bookings.filter(b => ids.has(b.session_id));
  return {
    arrivals: mine.filter(b => b.status === 'checked_in').length,
    expected: mine.filter(b => EXPECTED_STATUSES.has(b.status)).length,
    noShows: mine.filter(b => b.status === 'no_show').length,
    pendingPayments: input.payments.filter(isPendingPayment).length,
    classesToday: today.length,
    next: today.find(s => Date.parse(s.ends_at) > input.now) ?? null,
  };
}

/** One class's counter: arrived out of everyone holding a place (cancelled, late cancel and no-show have given it up). */
export function sessionCounter(bookings: BookingRow[]): { arrived: number; holding: number } {
  const holding = bookings.filter(b => b.status === 'checked_in' || EXPECTED_STATUSES.has(b.status));
  return { arrived: holding.filter(b => b.status === 'checked_in').length, holding: holding.length };
}
