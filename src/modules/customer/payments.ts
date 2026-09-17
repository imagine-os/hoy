/**
 * ============================================================================
 * INTEGRATION SEAM — Wompi (payments, Colombia)
 * ============================================================================
 * Everything the customer app knows about charging money goes through this file.
 * Today it is a simulator: `wompiCheckout` resolves after a short delay with an
 * approved (or, on request, declined) result and a fake reference. When Wompi is
 * wired, replace the body of `wompiCheckout` with the Wompi Widget/Checkout call
 * (`https://checkout.wompi.co/p/?public-key=…&currency=COP&amount-in-cents=…&reference=…`)
 * and resolve from the redirect / webhook. Pages and the `payments` table do not change.
 *
 * Manual transfer and cash never touch Wompi: they create a `payments` row with
 * provider 'manual' and status 'pending' that the front desk settles (S-04).
 */
import type { DataProvider } from '../../data/types';
import type { PaymentRow } from '../../data/schema';
import { splitIva } from '../../data/tax';
import { tenant } from '../../tenant/tenant';

export type ElectronicMethod = 'card' | 'pse' | 'nequi';
export type ManualMethod = 'transfer' | 'cash';
export type PayMethod = ElectronicMethod | ManualMethod;

export interface WompiResult { status: 'approved' | 'declined'; ref: string; reason?: { es: string; en: string } }

export interface PaymentMethodOption {
  id: PayMethod;
  provider: 'wompi' | 'manual';
  label: { es: string; en: string };
  hint: { es: string; en: string };
  glyph: string;
}

/** The Colombian payment reality from C-05, in display order. Flags come from feature_flags later. */
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'card', provider: 'wompi', label: { es: 'Tarjeta', en: 'Card' }, hint: { es: 'Crédito o débito · vía Wompi', en: 'Credit or debit · via Wompi' }, glyph: '▭' },
  { id: 'pse', provider: 'wompi', label: { es: 'PSE', en: 'PSE' }, hint: { es: 'Débito desde tu banco · vía Wompi', en: 'Bank debit · via Wompi' }, glyph: '⇄' },
  { id: 'nequi', provider: 'wompi', label: { es: 'Nequi', en: 'Nequi' }, hint: { es: 'Billetera · vía Wompi', en: 'Wallet · via Wompi' }, glyph: '◎' },
  { id: 'transfer', provider: 'manual', label: { es: 'Transferencia', en: 'Transfer' }, hint: { es: 'Transferencia bancaria · la confirma recepción', en: 'Bank transfer · front desk confirms' }, glyph: '⇥' },
  { id: 'cash', provider: 'manual', label: { es: 'Efectivo', en: 'Cash' }, hint: { es: 'Solo en recepción · cupo retenido 60 min', en: 'Front desk only · spot held 60 min' }, glyph: '$' },
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** A fake provider reference (`wmp_3F9KQ2`) for the simulated Wompi flows; MockProvider ids are a different thing. */
export const fakeRef = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const ref = () => fakeRef('wmp');

export const DECLINE_REASONS: Record<string, { es: string; en: string }> = {
  insufficient_funds: { es: 'El banco respondió: fondos insuficientes.', en: 'The bank replied: insufficient funds.' },
  do_not_honor: { es: 'El banco no autorizó la transacción.', en: 'The bank did not authorise the transaction.' },
};

/** Simulated Wompi checkout. `simulate: 'declined'` forces the E-02 path for testing. */
export async function wompiCheckout(input: { amount: number; method: ElectronicMethod; simulate?: 'approved' | 'declined' }): Promise<WompiResult> {
  await wait(900);
  if (input.simulate === 'declined') return { status: 'declined', ref: ref(), reason: DECLINE_REASONS.insufficient_funds };
  return { status: 'approved', ref: ref() };
}

/** Writes the payment (+ invoice on approval) the way the seed does, so history and admin agree. */
export async function recordPayment(data: DataProvider, input: { userId: string; planId: string | null; amount: number; method: PayMethod; result?: WompiResult; takenBy?: string | null; ivaRate: number }): Promise<PaymentRow> {
  const manual = input.method === 'transfer' || input.method === 'cash';
  const status = manual ? 'pending' : input.result?.status === 'approved' ? 'approved' : 'declined';
  const now = new Date().toISOString();
  const payment = await data.insert<PaymentRow>('payments', {
    user_id: input.userId, plan_id: input.planId, amount: input.amount, amount_paid: status === 'approved' ? input.amount : null, note: null, currency: 'COP', method: input.method,
    provider: manual ? 'manual' : 'wompi', provider_ref: input.result?.ref ?? null, status, paid_at: status === 'approved' ? now : null, taken_by: input.takenBy ?? null,
  } as Partial<PaymentRow>);
  if (status === 'approved') {
    const { subtotal, tax } = splitIva(input.amount, input.ivaRate);
    await data.insert('invoices', { payment_id: payment.id, number: `${tenant.invoicePrefix}-${Date.now().toString().slice(-6)}`, subtotal, tax, total: input.amount, issued_at: now, pdf_url: null, dian_cufe: null });
  }
  return payment;
}

/**
 * INTEGRATION SEAM — Wompi tokenisation (C-05 "save this method").
 * Today it fabricates a demo reference so `payment_methods.token_ref` is never a real token.
 * With Wompi live, the widget returns `tokenized_card.token` (or the Nequi/PSE mandate) and this
 * function resolves with it; the row shape and every page stay the same.
 */
export async function wompiTokenise(input: { kind: ElectronicMethod }): Promise<{ tokenRef: string; brand: string; last4: string | null; expires: string | null }> {
  await wait(700);
  const n = Math.random().toString().slice(2, 6);
  if (input.kind === 'card') return { tokenRef: `tok_demo_${n}${n}`, brand: Math.random() < 0.5 ? 'Visa' : 'Mastercard', last4: n, expires: '12/29' };
  if (input.kind === 'nequi') return { tokenRef: `tok_demo_nequi_${n}`, brand: 'Nequi', last4: null, expires: null };
  return { tokenRef: `tok_demo_pse_${n}`, brand: 'Bancolombia', last4: null, expires: null };
}
