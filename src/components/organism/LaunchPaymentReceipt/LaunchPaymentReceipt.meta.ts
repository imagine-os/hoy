import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LaunchPaymentReceipt } from './LaunchPaymentReceipt';
import type { PaymentRow, UserRow, ProfileRow } from '../../../data/schema';
import { receiptReference, type LaunchReceipt } from '../../../data/launchReceipts';
import { buildReceiptEmailPreview, buildReceiptRecorderSnapshot } from '../../../data/receiptEmailPreview';
import { tenant } from '../../../tenant/tenant';
const payment: PaymentRow = { id: 'fictional-receipt', tenant_id: tenant.id, user_id: 'fictional-person', plan_id: null, amount: 35000, amount_paid: 35000, currency: 'COP', method: 'cash', provider: 'manual', paid_at: '2026-10-23T12:00:00Z', taken_by: 'fictional-recorder', status: 'approved', note: null, created_at: '2026-10-23T12:00:00Z', updated_at: '2026-10-23T12:00:00Z' };
const owner = { id: payment.user_id, tenant_id: tenant.id, email: 'fictional-buyer@example.test', locale: 'es' } as UserRow;
const recorder = { id: payment.taken_by, tenant_id: tenant.id } as UserRow;
const profiles = [{ user_id: owner.id, tenant_id: tenant.id, full_name: 'Fictional buyer / Comprador ficticio' }, { user_id: recorder.id, tenant_id: tenant.id, full_name: 'Fictional recorder / Registro ficticio' }] as ProfileRow[];
const receipt: LaunchReceipt = { version: 1, kind: 'fictional-payment-receipt', reference: receiptReference(payment.id), source: 'desk-sale', facts: { paymentId: payment.id, tenantId: tenant.id, customerId: payment.user_id, planId: null, amountCharged: 35000, amountReceived: 35000, currency: 'COP', method: 'cash', provider: 'manual', confirmedAt: payment.paid_at, recordedBy: 'fictional-recorder', quote: null }, item: { es: 'Clase ficticia', en: 'Fictional class' }, recordedTax: null, previewChannels: ['email'], delivery: 'preview-only' };
function saved(users = [owner]): PaymentRow { const snapshot = structuredClone(receipt); snapshot.emailPreview = buildReceiptEmailPreview(snapshot, users, profiles); snapshot.recordedBySnapshot = buildReceiptRecorderSnapshot(snapshot, [recorder], profiles); return { ...payment, frontend_receipt: snapshot }; }
const example = (value: PaymentRow) => h(LaunchPaymentReceipt, { payment: value, customer: 'Known fallback / Nombre conocido' });
export default defineMeta({
 tier: 'organism', name: 'LaunchPaymentReceipt',
 description: { es: 'Recibo demo y copia de email sin enviar guardados; no consulta datos actuales ni envía.', en: 'Saved demo receipt and unsent email copy; no live lookup or delivery.' },
 props: [{ name: 'payment / customer / historicalReference', type: 'PaymentRow / string / string?', description: { es: 'Pago autorizado por quien llama; nombre conocido como respaldo y referencia histórica opcional.', en: 'Caller-authorized payment; known customer fallback and optional historical reference.' } }],
 states: ['saved available unsent email', 'saved unavailable: missing/ambiguous customer or missing/invalid/placeholder email', 'unknown recorder snapshot', 'legacy email/recorder not recorded', 'malformed snapshot rejected', 'pending receipt absent'],
 usages: [
  { title: { es: 'Email guardado disponible / sin nombre de registro', en: 'Saved available email / recorder name unavailable' }, render: () => { const unknown = saved(); unknown.frontend_receipt!.recordedBySnapshot = { userId: recorder.id, name: null }; return h('div', { className: 'stack' }, example(saved()), example(unknown)); } },
  { title: { es: 'Destinatario no disponible: cinco motivos', en: 'Unavailable recipient: five reasons' }, render: () => h('div', { className: 'stack' }, ...[[], [owner, owner], [{ ...owner, email: '' }], [{ ...owner, email: 'invalid' }], [{ ...owner, email: '1@sin-email.hoyos.test' }]].map(users => example(saved(users)))) },
  { title: { es: 'Anterior sin captura / captura inválida / pendiente', en: 'Legacy snapshot absent / malformed snapshot / pending' }, render: () => { const malformed = saved(); malformed.frontend_receipt!.emailPreview!.body.en = undefined as unknown as string; return h('div', { className: 'stack' }, example({ ...payment, frontend_receipt: receipt }), example(malformed), example({ ...payment, status: 'pending', frontend_receipt: undefined })); } },
 ],
 a11y: [{ es: 'Email sin acciones, contenido literal en párrafos y motivos escritos; no depende del color.', en: 'Email has no actions, literal paragraph content and written reasons; never color alone.' }],
 usedBy: ['C-11', 'S-04', 'S-09', 'C-37'],
});
