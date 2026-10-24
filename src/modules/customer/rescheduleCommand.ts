import { requireExistingBookingContact } from '../../data/bookingContact';
import { requireDailyAdmission } from '../../data/dailyAdmission';
import { requireSessionAdmission, assertAdmissionContext, type AdmissionControl } from '../../data/sessionAdmission';
import { assertRescheduleAllowed } from './reschedule';
import type { DataProvider } from '../../data/types';
import type { BookingRow, ClassLedgerRow, ClassSessionRow, PaymentRow } from '../../data/schema';
import { approvedPackageRows, packageLots } from '../../data/packages';
import { dateKey, isSameDay, MS } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { policy } from './policy';
import { readLaunchReceipt } from '../../data/launchReceipts';
import { bookingPaymentStatus } from './bookingPaymentStatus';

type RescheduleTerms = Pick<ClassLedgerRow, 'expires_at' | 'frozen_from' | 'frozen_until'>;

/** Preserve the class already spent, rather than spending a different live package. */
export function reschedulePurchase(rows: ClassLedgerRow[], booking: BookingRow): ClassLedgerRow | null {
  if (!booking.ledger_id && booking.paid_with !== 'package') return null;
  const lots = packageLots(rows).filter(lot => lot.debits.some(debit => debit.ledgerId === booking.ledger_id));
  if (lots.length !== 1) throw new Error('reschedule_entitlement_unresolved');
  return lots[0].purchase;
}

/** Use recorded purchased terms only; a known single/trial charge is not an ambiguous legacy booking. */
export function rescheduleEntitlement(rows: ClassLedgerRow[], payments: PaymentRow[], booking: BookingRow): RescheduleTerms | null {
  if (booking.ledger_id != null && (typeof booking.ledger_id !== 'string' || !booking.ledger_id.trim())) throw Error('reschedule_entitlement_unresolved');
  if (booking.payment_id != null && bookingPaymentStatus(booking, rows, payments) !== 'confirmed') throw Error('reschedule_entitlement_unresolved');
  if (booking.ledger_id || booking.paid_with === 'package') return reschedulePurchase(rows, booking);
  if (!['single', 'trial'].includes(booking.paid_with) || booking.payment_id == null) return null;
  const matches = payments.filter(payment => payment.id === booking.payment_id);
  if (typeof booking.payment_id !== 'string' || !booking.payment_id.trim() || matches.length !== 1) throw Error('reschedule_entitlement_unresolved');
  const payment = matches[0];
  if (payment.user_id !== booking.user_id || payment.tenant_id !== booking.tenant_id || payment.status !== 'approved') throw Error('reschedule_entitlement_unresolved');
  const quote = readLaunchReceipt(payment)?.facts.quote;
  // Unusable legacy terms retain the existing same-day fallback; never invent expiry for another day.
  if (!quote) return null;
  if (quote.kind !== 'class' || quote.itemId !== booking.paid_with || quote.classes !== 1 || quote.quantity !== 1) throw Error('reschedule_entitlement_unresolved');
  if (!quote.entitlementExpiresAt) return null;
  return { expires_at: quote.entitlementExpiresAt, frozen_from: null, frozen_until: null };
}

export function assertRescheduleValidity(purchase: RescheduleTerms | null, startsAt: string): void {
  if (!purchase) return;
  const targetDay = dateKey(new Date(startsAt));
  if (purchase.expires_at && targetDay > purchase.expires_at) throw new Error('package_expired');
  if (purchase.frozen_from && purchase.frozen_until && purchase.frozen_from <= targetDay && targetDay <= purchase.frozen_until) throw new Error('package_frozen');
}

/** Execute inside the isolated mock atomic adapter. Production needs an authorized server command. */
export async function rescheduleBooking(data: DataProvider, input: { userId: string; role?: string; bookingId: string; fromSessionId: string; toSessionId: string; now?: number; control?: AdmissionControl }): Promise<BookingRow> {
  const now = input.now ?? Date.now();
  assertAdmissionContext(input.control);
  const booking = await data.get<BookingRow>('bookings', input.bookingId);
  const original = await data.get<ClassSessionRow>('class_sessions', input.fromSessionId);
  if (!booking || booking.tenant_id !== tenant.id || booking.user_id !== input.userId || booking.status !== 'booked' || booking.session_id !== original?.id || original.tenant_id !== tenant.id || original.status !== 'scheduled') throw new Error('booking_unavailable');
  assertRescheduleAllowed(original.starts_at, now);
  const target = await requireSessionAdmission(data, input.toSessionId, { ...input.control, now });
  if (!target || target.id === original.id || target.tenant_id !== tenant.id || target.status !== 'scheduled' || !Number.isFinite(Date.parse(target.starts_at)) || Date.parse(target.starts_at) <= now) throw new Error('session_unavailable');
  await requireExistingBookingContact(data, input.userId, tenant.id, input.control);
  if (target.booked_count >= target.capacity) throw new Error('session_full');
  const bookings = await data.list<BookingRow>('bookings', { where: { user_id: input.userId } });
  const others = bookings.filter(b => b.id !== booking.id && b.status !== 'cancelled' && b.status !== 'late_cancel');
  if (others.some(b => b.session_id === target.id)) throw new Error('booking_exists');
  await requireDailyAdmission(data, target, input.userId, input.control, booking.id);
  {
    const rows = await data.list<ClassLedgerRow>('class_ledger', { where: { user_id: input.userId } });
    const payments = await data.list<PaymentRow>('payments', { where: { user_id: input.userId } });
    const purchase = rescheduleEntitlement(approvedPackageRows(rows, payments), payments, booking);
    if (!purchase && !isSameDay(original.starts_at, target.starts_at)) throw new Error('reschedule_entitlement_unresolved');
    assertRescheduleValidity(purchase, target.starts_at);
  }
  assertRescheduleAllowed(original.starts_at, input.now ?? Date.now());
  await requireSessionAdmission(data, target.id, { ...input.control, now });
  assertAdmissionContext(input.control);
  // Both writes remain inside the caller's atomic transaction; exclude the replaced admission.
  await data.update('bookings', booking.id, { status: 'cancelled', cancelled_at: new Date(now).toISOString() });
  const next = await data.insert<BookingRow>('bookings', { user_id: booking.user_id, session_id: target.id, status: 'booked', paid_with: booking.paid_with, ledger_id: booking.ledger_id, payment_id: booking.payment_id ?? null, checked_in_at: null, cancelled_at: null, rated: false });
  // MockProvider recalculates both occupancies from bookings; do not add or subtract capacity again.
  const waiting = await data.list('waitlist', { where: { session_id: original.id, status: 'waiting' }, orderBy: { column: 'position' } });
  let offerAllowed = false;
  try { await requireSessionAdmission(data, original.id, { ...input.control, now }); offerAllowed = true; } catch (error) { if (!(error instanceof Error) || error.message !== 'session_unavailable') throw error; }
  if (offerAllowed && waiting[0]) await data.update('waitlist', waiting[0].id, { status: 'offered', offered_at: new Date(now).toISOString(), claim_until: new Date(now + policy.claimWindowMinutes * MS.min).toISOString() });
  await data.insert('audit_log', { actor_id: input.userId, action: 'booking.reschedule', entity: 'bookings', entity_id: booking.id, ip: null,
    diff: { ...(input.role ? {role:input.role} : {}), source: 'app', from_session_id: original.id, to_session_id: target.id, replacement_booking_id: next.id } });
  assertAdmissionContext(input.control);
  return next;
}
