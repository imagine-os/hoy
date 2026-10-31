/**
 * C-08 / C-10 · "the studio cancelled this class and gave your class back", read by the customer for their own booking.
 *
 * Production (Company OS): the studio's cancel is a status update on the occurrence; bookings and credits do the rest
 * on the server (each active booking is cancelled and its class returned to its lot as a credit entry with the reason
 * `studio_cancel`, which the class ledger reads as `cancel_return`, linked to the booking). So the return is verified
 * when the person's own ledger holds a `cancel_return` entry for this booking. Nothing is made up when it is missing.
 * Review build: the browser transaction's receipt checks (`studioCancellation.ts`).
 */
import type { DataProvider } from '../../data/types';
import type { BookingRow, ClassLedgerRow, ClassSessionRow, PaymentRow } from '../../data/schema';
import { PRODUCTION_BUILD } from '../../config/launch';
import { approvedPackageRows, packageState } from '../../data/packages';
import { dateKey } from '../../i18n/format';
import { readOwnStudioReturn as readReviewStudioReturn, type OwnStudioReturn, type StudioActor, type StudioControl } from './studioCancellation';

export type { OwnStudioReturn } from './studioCancellation';

const fail = (code: string): never => { throw Error(`studio_cancel_${code}`); };
type Ledger = ClassLedgerRow & { booking_id?: string | null };

async function readLiveStudioReturn(data: DataProvider, identity: StudioActor, bookingId: string, control: StudioControl = {}): Promise<OwnStudioReturn> {
  const who = { ...identity }, id = String(bookingId);
  const current = () => { const now = control.currentActor?.() ?? who; if (now.actorId !== who.actorId || now.role !== who.role) fail('context'); if (control.signal?.aborted) fail('cancelled'); };
  if (!['customer', 'teacher', 'super_admin'].includes(who.role) || !who.actorId) fail('denied');
  current();
  const bookings = (await data.list<BookingRow>('bookings', { where: { id, user_id: who.actorId } })).filter((b) => b.id === id && b.user_id === who.actorId);
  current();
  if (bookings.length !== 1) fail('scope');
  const booking = bookings[0];
  if (booking.status !== 'cancelled') return { status: 'unverified' };
  const [session, rows, payments] = await Promise.all([
    data.get<ClassSessionRow>('class_sessions', booking.session_id),
    data.list<Ledger>('class_ledger', { where: { user_id: who.actorId } }),
    data.list<PaymentRow>('payments', { where: { user_id: who.actorId } }),
  ]);
  current();
  if (!session || session.status !== 'cancelled') return { status: 'unverified' };
  const own = rows.filter((r) => r.user_id === who.actorId);
  const returned = own.filter((r) => r.booking_id === booking.id && r.reason === 'cancel_return' && r.delta > 0);
  if (!returned.length) return { status: 'unverified' };
  const now = control.now?.() ?? Date.now();
  if (!Number.isFinite(now)) fail('validation');
  const today = dateKey(new Date(now));
  const lot = own.find((r) => r.id === returned[0].purchase_ledger_id) ?? null;
  const state = packageState(approvedPackageRows(own, payments.filter((p) => p.user_id === who.actorId)), today);
  return {
    status: 'verified', units: 1, balance: state.balance, expiresAt: returned[0].expires_at ?? lot?.expires_at ?? null,
    frozen: !!lot?.frozen_from && !!lot.frozen_until && lot.frozen_from <= today && today <= lot.frozen_until,
  };
}

/** The customer's own studio-cancel return: Company OS in production, the review build's receipt checks otherwise. */
export const readOwnStudioReturn: (data: DataProvider, identity: StudioActor, bookingId: string, control?: StudioControl) => Promise<OwnStudioReturn> =
  PRODUCTION_BUILD ? readLiveStudioReturn : readReviewStudioReturn;
