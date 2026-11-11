/**
 * F2 (owner 2026-11-11, PAG-04): why a transfer payment was rejected. Reception or Administration types a reason when
 * they reject; it is saved in the payment's `status_reason` (payments module, carried by `payment.declined`) and shown to
 * the customer on the booking the payment was for and in their payment history. Plain text only; the screens render it
 * as a text node, never as markup.
 */
type DeclinedPayment = { id: string; status: string; status_reason?: string | null; created_at?: string; for_entity?: string | null; for_id?: string | null };

export const declinedReasonText = (p: Pick<DeclinedPayment, 'status' | 'status_reason'>): string | null => {
  if (p.status !== 'declined' || typeof p.status_reason !== 'string') return null;
  return p.status_reason.trim() || null;
};

/** The reason on the latest declined payment for this booking, or null (none declined, or no reason written). */
export function declinedReasonFor(payments: readonly DeclinedPayment[], bookingId: string): string | null {
  const declined = payments
    .filter((p) => p.for_entity === 'booking' && p.for_id === bookingId && p.status === 'declined')
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  return declined.length ? declinedReasonText(declined[0]) : null;
}
