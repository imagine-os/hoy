import type { Bi } from '../specs/types';
import type { ProfileRow, UserRow } from './schema';
import type { LaunchReceipt } from './launchReceipts';
import { formatCOP, formatDateTime } from '../i18n/format';

export type ReceiptEmailUnavailableReason = 'missing-customer' | 'ambiguous-customer' | 'missing-email' | 'invalid-email' | 'placeholder-email';
export interface ReceiptEmailPreview {
  version: 1;
  status: 'unsent-preview';
  paymentId: string;
  reference: string;
  recipient: {
    tenantId: string; customerId: string | null; name: string | null; email: string | null; locale: 'es' | 'en' | null;
    availability: 'available' | 'unavailable'; reason: ReceiptEmailUnavailableReason | null;
  };
  subject: Bi;
  body: Bi;
}
export interface ReceiptRecorderSnapshot { userId: string; name: string | null }
type Receipt = Pick<LaunchReceipt, 'reference' | 'facts' | 'item'>;
const bilingual = (v: unknown): v is Bi => !!v && typeof v === 'object' && typeof (v as Bi).es === 'string' && typeof (v as Bi).en === 'string';
const usableEmail = (v: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) && !/[\u0000-\u001f\u007f]/.test(v);
const placeholder = (v: string) => /@sin-email\.hoyos\.test$/i.test(v);
function observedName(profiles: readonly ProfileRow[], userId: string, tenantId: string): string | null {
  const rows = profiles.filter(p => p.tenant_id === tenantId && p.user_id === userId);
  return rows.length === 1 && typeof rows[0].full_name === 'string' && rows[0].full_name.trim() ? rows[0].full_name.trim() : null;
}
/** Captures the payment owner, never a gift recipient or the current viewer. No send operation exists. */
export function buildReceiptEmailPreview(receipt: Receipt, users: readonly UserRow[], profiles: readonly ProfileRow[]): ReceiptEmailPreview {
  const f = receipt.facts, owners = users.filter(u => u.tenant_id === f.tenantId && u.id === f.customerId);
  const owner = owners.length === 1 ? owners[0] : null;
  const raw = owner && typeof owner.email === 'string' ? owner.email.trim() : '';
  const reason: ReceiptEmailUnavailableReason | null = !f.customerId || !owners.length ? 'missing-customer' : owners.length !== 1 ? 'ambiguous-customer' : !raw ? 'missing-email' : placeholder(raw) ? 'placeholder-email' : !usableEmail(raw) ? 'invalid-email' : null;
  const recipient: ReceiptEmailPreview['recipient'] = {
    tenantId: f.tenantId, customerId: f.customerId ?? null,
    name: owner ? observedName(profiles, owner.id, f.tenantId) : null,
    email: reason === null ? raw : null,
    locale: owner?.locale === 'es' || owner?.locale === 'en' ? owner.locale : null,
    availability: reason === null ? 'available' : 'unavailable', reason,
  };
  const method: Record<string, Bi> = {
    card: { es: 'Tarjeta', en: 'Card' }, cash: { es: 'Efectivo', en: 'Cash' },
    transfer: { es: 'Transferencia', en: 'Transfer' }, pse: { es: 'PSE', en: 'PSE' }, qr: { es: 'QR', en: 'QR' },
  };
  const body = (lang: 'es' | 'en') => [
    lang === 'es' ? 'Vista previa de recibo de pago. Este email no se ha enviado. No es una factura.' : 'Payment receipt preview. This email has not been sent. This is not an invoice.',
    `${lang === 'es' ? 'Referencia' : 'Reference'}: ${receipt.reference}`,
    `${lang === 'es' ? 'Confirmación registrada' : 'Recorded confirmation'}: ${f.confirmedAt ? formatDateTime(f.confirmedAt, lang) : '—'}`,
    `${lang === 'es' ? 'Concepto' : 'Item'}: ${receipt.item?.[lang] ?? (lang === 'es' ? 'Pago registrado' : 'Recorded payment')}`,
    `${lang === 'es' ? 'Importe cobrado' : 'Amount charged'}: ${formatCOP(f.amountCharged, lang)}`,
    `${lang === 'es' ? 'Importe recibido registrado' : 'Recorded amount received'}: ${f.amountReceived === null ? '—' : formatCOP(f.amountReceived, lang)}`,
    `${lang === 'es' ? 'Método registrado' : 'Recorded method'}: ${method[f.method]?.[lang] ?? f.method}`,
  ].join('\n\n');
  return { version: 1, status: 'unsent-preview', paymentId: f.paymentId, reference: receipt.reference, recipient,
    subject: { es: `Recibo demo · ${receipt.reference}`, en: `Demo receipt · ${receipt.reference}` },
    body: { es: body('es'), en: body('en') } };
}
export function buildReceiptRecorderSnapshot(receipt: Receipt, users: readonly UserRow[], profiles: readonly ProfileRow[]): ReceiptRecorderSnapshot | null {
  const userId = receipt.facts.recordedBy;
  if (typeof userId !== 'string' || !userId) return null;
  const owners = users.filter(u => u.id === userId && u.tenant_id === receipt.facts.tenantId);
  return { userId, name: owners.length === 1 ? observedName(profiles, userId, receipt.facts.tenantId) : null };
}
/** Validate saved ownership/shape only. Current names, addresses and templates must never recapture history. */
export function receiptEmailPreviewValid(value: unknown, receipt: Receipt): value is ReceiptEmailPreview {
  if (!value || typeof value !== 'object') return false;
  const p = value as ReceiptEmailPreview, r = p.recipient;
  if (p.version !== 1 || p.status !== 'unsent-preview' || p.paymentId !== receipt.facts.paymentId || p.reference !== receipt.reference || !r || r.tenantId !== receipt.facts.tenantId || r.customerId !== (receipt.facts.customerId ?? null)
    || r.name !== null && typeof r.name !== 'string' || !['es', 'en', null].includes(r.locale) || !bilingual(p.subject) || !bilingual(p.body)) return false;
  if (r.availability === 'available') return r.reason === null && typeof r.email === 'string' && usableEmail(r.email) && !placeholder(r.email) && !!r.customerId;
  return r.availability === 'unavailable' && r.email === null && ['missing-customer', 'ambiguous-customer', 'missing-email', 'invalid-email', 'placeholder-email'].includes(r.reason ?? '');
}
export function receiptRecorderSnapshotValid(value: unknown, receipt: Receipt): value is ReceiptRecorderSnapshot | null {
  if (value === null) return receipt.facts.recordedBy === null;
  if (!value || typeof value !== 'object') return false;
  const r = value as ReceiptRecorderSnapshot;
  return r.userId === receipt.facts.recordedBy && typeof r.userId === 'string' && (r.name === null || typeof r.name === 'string');
}
