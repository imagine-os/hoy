import type { BookingRow, ClassLedgerRow, PaymentRow } from '../../data/schema';
export type BookingPaymentStatus = 'pending' | 'confirmed' | 'released' | 'unknown';
/** Read exact saved payment or debit → payment links. Never infer a charge from dates or amounts. */
export function bookingPaymentStatus(booking: BookingRow, ledger: ClassLedgerRow[], payments: PaymentRow[]): BookingPaymentStatus {
  const hasDebit = booking.ledger_id != null;
  if (hasDebit && (typeof booking.ledger_id !== 'string' || !booking.ledger_id.trim())) return 'unknown';
  const debits = hasDebit ? ledger.filter(row => row.id === booking.ledger_id) : [];
  if (hasDebit && (debits.length !== 1 || debits[0].user_id !== booking.user_id || debits[0].tenant_id !== booking.tenant_id || debits[0].delta !== -1)) return 'unknown';
  const indirect = debits[0]?.payment_id;
  const direct = booking.payment_id;
  if (direct != null && (typeof direct !== 'string' || !direct.trim())) return 'unknown';
  if (direct && indirect && direct !== indirect) return 'unknown';
  const id = direct ?? indirect;
  if (!id) return 'unknown';
  const matches = payments.filter(row => row.id === id);
  if (matches.length !== 1) return 'unknown';
  const payment = matches[0];
  if (payment.user_id !== booking.user_id || payment.tenant_id !== booking.tenant_id) return 'unknown';
  if (payment?.status === 'approved') return 'confirmed';
  if (payment?.status === 'pending') return 'pending';
  if (payment?.status === 'released') return 'released';
  return 'unknown';
}
