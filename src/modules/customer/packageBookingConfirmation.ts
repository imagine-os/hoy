import type { DataProvider } from '../../data/types';
import type { BaseRow, BookingRow, ClassLedgerRow, ClassSessionRow, UserRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';

export interface PackageConfirmationRequest { userId: string; sessionId: string; checkoutKey?: string }
export type PackageConfirmation = { kind: 'saved'; booking: BookingRow; source: 'attempt' | 'existing' } | { kind: 'missing' };

/** Read-only browser-demo evidence. A production adapter needs an authorized confirmation endpoint.
 * A transaction receipt is only a locator: never present its cached/staged booking as confirmed.
 * Historical validity is retained; a consumed last class, later expiry or withdrawal is not a new admission.
 */
export async function readPackageBookingConfirmation(data: DataProvider, request: PackageConfirmationRequest, isCurrent: () => boolean): Promise<PackageConfirmation> {
  const check = () => { if (!isCurrent()) throw Error('package_confirmation_context_changed'); };
  const get = async <T extends BaseRow>(table: string, id: string): Promise<T> => {
    check(); const row = await data.get<T>(table, id); check();
    if (!row || row.id !== id || row.tenant_id !== tenant.id) throw Error('package_confirmation_invalid');
    return row;
  };
  check();
  if (data.name !== 'mock' || !request.userId || !request.sessionId) throw Error('package_confirmation_unavailable');
  const user = await get<UserRow>('users', request.userId);
  if (user.status !== 'active') throw Error('package_confirmation_invalid');
  let bookingId: string | undefined, source: 'attempt' | 'existing' = 'existing';
  if (request.checkoutKey) {
    const id = `mock_transaction_checkout:${request.userId}:${request.checkoutKey}`;
    check(); const receipt = await data.get<BaseRow>('audit_log', id); check();
    if (receipt) {
      const result = (receipt.diff as { result?: { booking?: BookingRow; pending?: boolean } } | null)?.result;
      if (receipt.id !== id || receipt.tenant_id !== tenant.id || receipt.action !== 'mock.transaction' || receipt.entity !== 'mock' || receipt.entity_id !== id || result?.pending !== false || !result.booking?.id || result.booking.user_id !== request.userId || result.booking.session_id !== request.sessionId) throw Error('package_confirmation_invalid');
      bookingId = result.booking.id; source = 'attempt';
    }
  }
  if (!bookingId) {
    check(); const rows = await data.list<BookingRow>('bookings', { where: { tenant_id: tenant.id, user_id: request.userId, session_id: request.sessionId } }); check();
    const owned = rows.filter(row => row.tenant_id === tenant.id && row.user_id === request.userId && row.session_id === request.sessionId && ['booked', 'checked_in'].includes(row.status));
    if (!owned.length) return { kind: 'missing' };
    if (owned.length !== 1) throw Error('package_confirmation_invalid');
    bookingId = owned[0].id;
  }
  const booking = await get<BookingRow>('bookings', bookingId);
  if (booking.user_id !== request.userId || booking.session_id !== request.sessionId || booking.paid_with !== 'package' || !['booked', 'checked_in'].includes(booking.status) || !booking.ledger_id) throw Error('package_confirmation_invalid');
  await get<ClassSessionRow>('class_sessions', request.sessionId);
  const debit = await get<ClassLedgerRow>('class_ledger', booking.ledger_id);
  if (debit.user_id !== request.userId || debit.reason !== 'booking' || debit.delta !== -1 || !debit.purchase_ledger_id) throw Error('package_confirmation_invalid');
  const grant = await get<ClassLedgerRow>('class_ledger', debit.purchase_ledger_id);
  if (grant.user_id !== request.userId || !Number.isSafeInteger(grant.delta) || grant.delta <= 0 || grant.purchase_ledger_id || debit.payment_id !== grant.payment_id || debit.plan_id !== grant.plan_id) throw Error('package_confirmation_invalid');
  check();
  return { kind: 'saved', booking, source };
}
