import type { BaseRow, PaymentRow, UserRow } from '../../data/schema';
import { readPaymentQuote, type FrozenSaleQuote } from '../../data/operationalQuotes';
import { executeVoucherCommand, type VoucherDb, type VoucherRow, type VoucherTerms } from '../../data/vouchers';
import { readLaunchReceipt, receiptReference, type LaunchReceipt } from '../../data/launchReceipts';
import { tenant } from '../../tenant/tenant';
import { demoEmail } from './model';

/** Browser-demo contract only. The provider must validate a fresh published quote before purchase.
 * No bank evidence, secure token, email delivery or real authentication is implied. */
export type GiftPurchaseCommand = { requestId: string; actorId: string; role: string } & (
  | { type: 'purchase'; quote: FrozenSaleQuote; recipientEmail: string }
  | { type: 'approve'; purchaseId: string; amount: number; reason: string; reviewed: true; terms: VoucherTerms }
  | { type: 'reject'; purchaseId: string; reason: string }
  | { type: 'claim'; purchaseId: string }
);
export interface GiftPurchaseResult { purchaseId: string; payment: PaymentRow; voucher: VoucherRow | null; state: 'pending' | 'approved' | 'rejected' | 'claimed' }
export interface GiftPurchaseContext { tenantId: string; now?: string; id?: () => string; currentQuote?: FrozenSaleQuote }
interface Intent { version: 1; buyerId: string; recipientEmail: string; paymentId: string; quote: FrozenSaleQuote }
function fail(code: string): never { throw Error(code); }
const staff = (role: string) => ['admin', 'super_admin'].includes(role);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Detached copy-on-write command. Its returned database may only be committed by a serialized mock provider seam. */
export function executeGiftPurchaseCommand(database: VoucherDb, command: GiftPurchaseCommand, context: GiftPurchaseContext): { db: VoucherDb; result: GiftPurchaseResult } {
  let db = structuredClone(database);
  const c = structuredClone(command), now = context.now ?? new Date().toISOString(), id = context.id ?? (() => crypto.randomUUID());
  if (context.tenantId !== tenant.id || !Number.isFinite(Date.parse(now)) || !c.requestId?.trim() || c.requestId.length > 160) fail('gift_context');
  const actor = (db.users ?? []).find(u => u.id === c.actorId && u.tenant_id === context.tenantId) as UserRow | undefined;
  if (!actor || actor.status !== 'active') fail('gift_actor');
  if (!(db.user_roles ?? []).some(r => r.tenant_id === context.tenantId && r.user_id === actor.id && (r.role === c.role || r.role === 'super_admin'))) fail('gift_forbidden');
  if (c.type === 'purchase' || c.type === 'claim') { if (c.role !== 'customer') fail('gift_forbidden'); }
  else if (!staff(c.role)) fail('gift_forbidden');
  const base = (rowId = id()): BaseRow => ({ id: rowId, tenant_id: context.tenantId, created_at: now, updated_at: now });
  const audit = (db.audit_log ??= []), fingerprint = JSON.stringify(c), requestId = `gift-purchase-request:${c.actorId}:${c.requestId}`;
  const prior = audit.find(r => r.id === requestId);
  if (prior) {
    const saved = prior.diff as { fingerprint?: string; result?: GiftPurchaseResult };
    if (prior.tenant_id !== context.tenantId || prior.actor_id !== actor.id || prior.action !== `gift.mock.${c.type}` || saved?.fingerprint !== fingerprint || !saved.result) fail('gift_request_conflict');
    const result = saved.result;
    const payment = (db.payments ?? []).find(p => p.id === result.payment.id && p.tenant_id === context.tenantId) as PaymentRow | undefined;
    if (!payment || payment.user_id !== result.payment.user_id || payment.amount !== result.payment.amount || !same(payment.frontend_quote, result.payment.frontend_quote)) fail('gift_state_conflict');
    if (payment.status === 'approved' && !readLaunchReceipt(payment) || c.type !== 'purchase' && !same(payment, result.payment)) fail('gift_state_conflict');
    const voucher = result.voucher ? (db.vouchers ?? []).find(v => v.id === result.voucher!.id && v.tenant_id === context.tenantId) as VoucherRow | undefined : null;
    if (result.voucher && (!voucher || voucher.source !== 'purchased_gift' || voucher.benefitTotal !== result.voucher.benefitTotal)) fail('gift_state_conflict');
    if (c.type === 'claim') {
      const intent = audit.find(r => r.id === c.purchaseId && r.tenant_id === context.tenantId)?.diff as Intent | undefined;
      if (!intent || actor.email.trim().toLowerCase() !== intent.recipientEmail || voucher?.claimedBy !== actor.id) fail('gift_recipient');
    }
    const approval = audit.find(r => r.id === `gift-purchase-approval:${payment.id}` && r.tenant_id === context.tenantId);
    const latestVoucherId = (approval?.diff as { voucherId?: string } | undefined)?.voucherId;
    const latestVoucher = latestVoucherId ? db.vouchers?.find(v => v.id === latestVoucherId && v.tenant_id === context.tenantId) as VoucherRow | undefined : voucher;
    if (latestVoucherId && (!latestVoucher || latestVoucher.source !== 'purchased_gift' || latestVoucher.benefitTotal !== readPaymentQuote(payment)?.classes)) fail('gift_state_conflict');
    const state = payment.status === 'declined' ? 'rejected' : latestVoucher?.claimedBy ? 'claimed' : payment.status === 'approved' ? 'approved' : 'pending';
    return { db, result: { ...structuredClone(result), state, payment: structuredClone(payment), voucher: latestVoucher ? structuredClone(latestVoucher) : null } };
  }
  let result: GiftPurchaseResult;
  if (c.type === 'purchase') {
    if (!demoEmail(c.recipientEmail) || !context.currentQuote || !same(c.quote, context.currentQuote) || c.quote.kind !== 'gift' || c.quote.quantity !== 1 || c.quote.tenantId !== context.tenantId) fail('gift_quote');
    const payment: PaymentRow = { ...base(), user_id: actor.id, plan_id: c.quote.planId, amount: c.quote.chargedAmount, amount_paid: null, currency: 'COP', method: 'transfer', provider: 'manual', provider_ref: null, status: 'pending', paid_at: null, taken_by: null, note: null, frontend_quote: structuredClone(c.quote) };
    if (!readPaymentQuote(payment)) fail('gift_quote');
    (db.payments ??= []).push(payment);
    const purchaseId = `gift-purchase:${payment.id}`;
    const intent: Intent = { version: 1, buyerId: actor.id, recipientEmail: c.recipientEmail.trim().toLowerCase(), paymentId: payment.id, quote: structuredClone(c.quote) };
    audit.push({ ...base(purchaseId), actor_id: actor.id, action: 'gift.mock.intent', entity: 'payments', entity_id: payment.id, ip: null, diff: intent });
    result = { purchaseId, payment, voucher: null, state: 'pending' };
  } else {
    const record = audit.find(r => r.id === c.purchaseId && r.tenant_id === context.tenantId && r.action === 'gift.mock.intent');
    const intent = record?.diff as Intent | undefined;
    if (!intent || intent.version !== 1 || record!.entity_id !== intent.paymentId) fail('gift_missing');
    const payment = (db.payments ?? []).find(p => p.id === intent.paymentId && p.tenant_id === context.tenantId) as PaymentRow | undefined;
    if (!payment || payment.user_id !== intent.buyerId || payment.provider !== 'manual' || payment.method !== 'transfer' || payment.amount !== intent.quote.chargedAmount || !same(readPaymentQuote(payment), intent.quote)) fail('gift_state_conflict');
    const approvalId = `gift-purchase-approval:${payment.id}`, approved = audit.find(r => r.id === approvalId);
    if (c.type === 'claim') {
      if (payment.status !== 'approved' || !readLaunchReceipt(payment) || !approved || approved.tenant_id !== context.tenantId) fail('gift_not_approved');
      if (actor.email.trim().toLowerCase() !== intent.recipientEmail || !demoEmail(actor.email)) fail('gift_recipient');
      const approval = approved.diff as { voucherId?: string; terms?: VoucherTerms };
      const voucherId = approval.voucherId;
      const voucher = db.vouchers?.find(v => v.id === voucherId && v.tenant_id === context.tenantId) as VoucherRow | undefined;
      if (approved.action !== 'gift.mock.approved' || approved.entity !== 'payments' || approved.entity_id !== payment.id || !voucherId || !voucher || voucher.source !== 'purchased_gift' || voucher.benefitTotal !== intent.quote.classes || !approval.terms || Object.entries(approval.terms).some(([key,value]) => !same(voucher[key],value))) fail('gift_state_conflict');
      if (voucher.claimedBy) fail('gift_already_claimed');
      const transaction = executeVoucherCommand(db, { type: 'claim', voucherId, userId: actor.id, actorId: actor.id, role: 'customer', requestId: `gift-claim:${c.requestId}` }, { tenantId: context.tenantId, now, id });
      db = transaction.db;
      result = { purchaseId: c.purchaseId, payment, voucher: transaction.result.voucher, state: 'claimed' };
    } else {
      if (payment.status !== 'pending' || approved || payment.frontend_receipt) fail('gift_already_reviewed');
      if (!c.reason.trim() || c.reason.length > 500) fail('gift_review_required');
      if (c.type === 'reject') {
        Object.assign(payment, { status: 'declined', note: c.reason.trim(), taken_by: actor.id, updated_at: now });
        result = { purchaseId: c.purchaseId, payment, voucher: null, state: 'rejected' };
      } else {
        if (c.reviewed !== true || c.amount !== payment.amount || !Number.isSafeInteger(c.amount)) fail('gift_review_required');
        if (c.terms.benefitKind !== 'classes' || c.terms.benefitTotal !== intent.quote.classes || c.terms.recipientContact?.trim().toLowerCase() !== intent.recipientEmail) fail('gift_terms');
        // Staff explicitly supplies existing voucher terms; purchase quote never implies gift expiry or cancellation rules.
        const issue = executeVoucherCommand(db, { ...c.terms, type: 'issue', actorId: actor.id, role: c.role, requestId: `gift-issue:${payment.id}` }, { tenantId: context.tenantId, now, id });
        db = issue.db;
        const voucher = db.vouchers.find(v => v.id === issue.result.voucher.id) as VoucherRow;
        voucher.source = 'purchased_gift';
        const issued = db.voucher_events.find(e => e.id === issue.result.event.id);
        if (issued) ((issued.payload as { result: { voucher: VoucherRow } }).result.voucher).source = 'purchased_gift';
        const current = db.payments.find(p => p.id === payment.id) as PaymentRow;
        Object.assign(current, { status: 'approved', amount_paid: c.amount, note: c.reason.trim(), taken_by: actor.id, paid_at: now, updated_at: now });
        const receipt: LaunchReceipt = { version: 1, kind: 'fictional-payment-receipt', reference: receiptReference(current.id), source: 'transfer-review', facts: { paymentId: current.id, tenantId: current.tenant_id, customerId: current.user_id, planId: current.plan_id, amountCharged: current.amount, amountReceived: current.amount_paid, currency: current.currency, method: current.method, provider: current.provider, confirmedAt: current.paid_at, recordedBy: current.taken_by ?? null, quote: readPaymentQuote(current) }, item: structuredClone(intent.quote.name), recordedTax: structuredClone(intent.quote.taxTotals ?? null), previewChannels: ['email'], delivery: 'preview-only' };
        current.frontend_receipt = receipt;
        if (!readLaunchReceipt(current)) fail('gift_receipt');
        db.audit_log.push({ ...base(approvalId), actor_id: actor.id, action: 'gift.mock.approved', entity: 'payments', entity_id: payment.id, ip: null, diff: { voucherId: voucher.id, terms: structuredClone(c.terms), receiptDelivery: 'preview-only' } });
        result = { purchaseId: c.purchaseId, payment: current, voucher, state: 'approved' };
      }
    }
  }
  db.audit_log.push({ ...base(requestId), actor_id: actor.id, action: `gift.mock.${c.type}`, entity: 'payments', entity_id: result.payment.id, ip: null, diff: { fingerprint, result: structuredClone(result), simulated: true } });
  return { db, result: structuredClone(result) };
}
