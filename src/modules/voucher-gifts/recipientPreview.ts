import type { DataProvider } from '../../data/types';
import type { BaseRow, PaymentRow, UserRow } from '../../data/schema';
import type { VoucherRow, VoucherEventRow, VoucherDb } from '../../data/vouchers';
import { tenant } from '../../tenant/tenant';
import { demoEmail } from './model';
import { verifiedPurchasedGift, sameGiftFact as same, type GiftPurchaseResult, type GiftPurchaseIntent, type GiftPurchaseRequest } from './purchaseFacts';

export interface VoucherRecipientSource { purchaseId: string; paymentId: string; voucherId: string; approvalRequestId: string }
export interface VoucherRecipientScope { tenantId: string; actorId: string; role: string; isCurrent: () => boolean }
type Bi = Readonly<{ es: string; en: string }>;
export interface VoucherRecipientPreview extends Readonly<VoucherRecipientSource> {
  readonly auditId: string;
  readonly issueEventId: string;
  readonly recipient: Readonly<{ email: string; name: string }>;
  readonly copy: Readonly<{ subject: Bi; body: Bi; ctaLabel: Bi }>;
  readonly route: string;
  readonly contract: Readonly<{ kind: 'builtin-mock'; key: 'class-voucher-recipient-ready'; revision: 1 }>;
}
export type VoucherRecipientPreviewResult = { status: 'ready'; preview: VoucherRecipientPreview } | { status: 'unavailable' | 'error' | 'cancelled'; reason: string };
const atom = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(s);
const scalar = (s: unknown, max: number): s is string => typeof s === 'string' && s.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(s);
const requestAtom = (s: unknown): s is string => scalar(s, 160) && /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(s);
const validSource = (s: VoucherRecipientSource) => atom(s.paymentId) && atom(s.voucherId) && s.purchaseId === `gift-purchase:${s.paymentId}` && scalar(s.approvalRequestId, 350);
/** Capture the successful command identity, never a later inferred purchase. */
export function voucherRecipientSource(result: GiftPurchaseResult, commandRequestId: string, actorId: string): VoucherRecipientSource | null {
  try {
    if (!atom(actorId) || !requestAtom(commandRequestId) || result.state !== 'approved' || result.payment.status !== 'approved' || result.voucher?.source !== 'purchased_gift') return null;
    const source = { purchaseId: result.purchaseId, paymentId: result.payment.id, voucherId: result.voucher.id, approvalRequestId: `gift-purchase-request:${actorId}:${commandRequestId}` };
    return validSource(source) ? Object.freeze(source) : null;
  } catch { return null; }
}
class Unavailable extends Error {}
class Cancelled extends Error {}
const requireProof = (ok: unknown, reason = 'proof_mismatch'): void => { if (!ok) throw new Unavailable(reason); };
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
/** Read-only, explicitly unsent rehearsal. A recipient account or recipient locale is never inferred. */
export async function buildVoucherRecipientPreview(data: DataProvider, source: VoucherRecipientSource | null, scope: VoucherRecipientScope): Promise<VoucherRecipientPreviewResult> {
  let check: () => void = () => { throw new Cancelled('context_changed'); };
  try {
    const context = { tenantId: scope.tenantId, actorId: scope.actorId, role: scope.role };
    check = () => { if (!scope.isCurrent() || scope.tenantId !== context.tenantId || scope.actorId !== context.actorId || scope.role !== context.role) throw new Cancelled('context_changed'); };
    check();
    requireProof(data.name === 'mock', 'disconnected');
    requireProof(context.tenantId === tenant.id && atom(context.actorId) && ['admin', 'super_admin'].includes(context.role), 'actor_scope');
    requireProof(source && validSource(source), 'source_missing_or_invalid');
    const selected = { ...source! } as VoucherRecipientSource;
    requireProof(selected.approvalRequestId.startsWith(`gift-purchase-request:${context.actorId}:`), 'approval_actor');
    requireProof(requestAtom(selected.approvalRequestId.slice(`gift-purchase-request:${context.actorId}:`.length)), 'approval_request');
    const read = async <T>(action: () => Promise<T>): Promise<T> => { check(); const value = await action(); check(); requireProof(data.name === 'mock', 'disconnected'); return structuredClone(value); };
    const snapshot = async () => {
      const db: VoucherDb = {};
      for (const [table, where] of [
        ['users', { id: context.actorId }], ['user_roles', { user_id: context.actorId }],
        ['gift_purchase_intents', { id: selected.purchaseId }], ['gift_purchase_requests', {}],
        ['payments', { id: selected.paymentId }], ['vouchers', { id: selected.voucherId }],
        ['audit_log', { entity_id: selected.paymentId }], ['voucher_events', { voucherId: selected.voucherId }],
      ] as const) {
        const rows = await read(() => data.list(table, { where: { ...where, tenant_id: context.tenantId } }));
        requireProof(Array.isArray(rows) && rows.every(r => r && typeof r === 'object' && scalar(r.id, 350) && scalar(r.tenant_id, 160)), 'malformed_rows');
        db[table] = rows;
      }
      const linked = await read(() => data.list<GiftPurchaseIntent>('gift_purchase_intents', { where: { voucherId: selected.voucherId, tenant_id: context.tenantId } }));
      requireProof(Array.isArray(linked) && linked.length === 1 && same(linked[0], db.gift_purchase_intents[0]));
      for (const [table, id] of [['gift_purchase_intents', selected.purchaseId], ['gift_purchase_requests', selected.approvalRequestId], ['payments', selected.paymentId], ['vouchers', selected.voucherId]] as const) {
        const exact = await read(() => data.get(table, id));
        const matching = db[table].filter(r => r.id === id);
        requireProof(matching.length === 1 && same(exact, matching[0]), 'missing_or_ambiguous_source');
      }
      return db;
    };
    const validate = (db: VoucherDb) => {
      const unique = <T extends BaseRow>(table: string, id: string): T => { const rows = db[table].filter(r => r.id === id); requireProof(rows.length === 1 && rows[0].tenant_id === context.tenantId); return rows[0] as T; };
      const actor = unique<UserRow>('users', context.actorId);
      requireProof(actor.status === 'active' && db.user_roles.some(r => r.tenant_id === context.tenantId && r.user_id === actor.id && (r.role === context.role || r.role === 'super_admin')), 'actor_inactive_or_role');
      const intent = unique<GiftPurchaseIntent>('gift_purchase_intents', selected.purchaseId), payment = unique<PaymentRow>('payments', selected.paymentId), voucher = unique<VoucherRow>('vouchers', selected.voucherId), approval = unique<GiftPurchaseRequest>('gift_purchase_requests', selected.approvalRequestId);
      requireProof(intent.paymentId === payment.id && intent.voucherId === voucher.id && intent.approvalRequestId === approval.id && approval.actorId === actor.id && payment.taken_by === actor.id && voucher.issuedBy === actor.id);
      requireProof(payment.status === 'approved' && voucher.source === 'purchased_gift' && ['issued', 'claimed'].includes(voucher.status));
      requireProof(db.gift_purchase_requests.filter(r => r.type === 'approve' && (r as GiftPurchaseRequest).result?.purchaseId === intent.id).length === 1);
      const purchases = (db.gift_purchase_requests as GiftPurchaseRequest[]).filter(r => r.type === 'purchase' && r.result?.purchaseId === intent.id);
      requireProof(purchases.length === 1);
      const purchased = purchases[0];
      let ac, pc;
      try { ac = JSON.parse(approval.fingerprint); pc = JSON.parse(purchased.fingerprint); } catch { throw new Unavailable('malformed_fingerprint'); }
      requireProof(ac && pc && requestAtom(ac.requestId) && requestAtom(pc.requestId) && atom(pc.actorId));
      requireProof(approval.id === `gift-purchase-request:${actor.id}:${ac.requestId}` && ac.actorId === actor.id && ac.role === context.role && ac.reviewed === true && ac.reason?.trim() && scalar(ac.reason, 500));
      requireProof(purchased.id === `gift-purchase-request:${pc.actorId}:${pc.requestId}` && purchased.actorId === intent.buyerId && pc.role === 'customer');
      try { requireProof(same(verifiedPurchasedGift(db, voucher, context.tenantId), intent)); } catch { throw new Unavailable('protected_purchase_mismatch'); }
      requireProof(approval.result.state === 'approved' && same(approval.result.voucher, voucher), 'voucher_changed');
      requireProof(scalar(intent.recipientEmail, 160) && demoEmail(intent.recipientEmail) && intent.recipientEmail === intent.recipientEmail.trim().toLowerCase() && scalar(voucher.recipientContact, 160) && voucher.recipientContact.trim().toLowerCase() === intent.recipientEmail, 'recipient_invalid');
      requireProof(scalar(voucher.recipientName, 200) && scalar(voucher.title, 300) && voucher.title.trim() && voucher.benefitKind === 'classes' && Number.isSafeInteger(voucher.benefitTotal) && voucher.benefitTotal > 0 && voucher.benefitTotal === intent.quote.classes, 'class_terms_invalid');
      const audits = db.audit_log.filter(r => r.action === 'gift.mock.approve');
      requireProof(audits.length === 1);
      const audit = audits[0], diff = audit.diff as Record<string, unknown> | null;
      requireProof(atom(audit.id) && audit.tenant_id === context.tenantId && audit.actor_id === actor.id && audit.entity === 'payments' && audit.entity_id === payment.id && diff && same(diff, { request_id: approval.id, purchase_id: intent.id, voucher_id: voucher.id, simulated: true }), 'approval_audit_mismatch');
      const issues = (db.voucher_events as VoucherEventRow[]).filter(e => e.kind === 'issue');
      requireProof(issues.length === 1);
      const issue = issues[0];
      let issueCommand; try { issueCommand = JSON.parse(issue.fingerprint); } catch { throw new Unavailable('malformed_issue'); }
      requireProof(issueCommand && typeof issueCommand === 'object');
      const { type, actorId, role, requestId, ...terms } = issueCommand;
      requireProof(atom(issue.id) && issue.tenant_id === context.tenantId && issue.actorId === actor.id && issue.bookingId === null && issue.requestId === `gift-issue:${payment.id}` && type === 'issue' && actorId === actor.id && role === ac.role && requestId === issue.requestId && same(terms, intent.terms), 'issue_mismatch');
      const issued = issue.payload?.result as { voucher?: VoucherRow; event?: VoucherEventRow } | undefined;
      requireProof(issued && same(issued.voucher, approval.result.voucher) && issued.event?.id === issue.id && issued.event.voucherId === voucher.id && issued.event.actorId === actor.id && issued.event.requestId === issue.requestId && issued.event.fingerprint === issue.fingerprint && issued.event.kind === 'issue' && issued.event.tenant_id === context.tenantId && same(issued.event, { ...issue, payload: {} }), 'issue_result_mismatch');
      return { intent, voucher, audit, issue };
    };
    const checked = (db: VoucherDb) => { try { return validate(db); } catch (error) { if (error instanceof Unavailable) throw error; throw new Unavailable('malformed_proof'); } };
    const first = await snapshot(); check(); checked(first);
    const fresh = await snapshot(); check(); requireProof(same(first, fresh), 'proof_changed');
    const { intent, voucher, audit, issue } = checked(fresh);
    check();
    const preview: VoucherRecipientPreview = { ...selected, auditId: audit.id, issueEventId: issue.id, recipient: { email: intent.recipientEmail, name: voucher.recipientName }, copy: {
      subject: { es: 'SIN ENVIAR · Vista previa ficticia de regalo de clases', en: 'UNSENT · Fictional class gift preview' },
      body: { es: `Vista previa ficticia SIN ENVIAR. Regalo registrado: ${voucher.title}. Beneficio registrado: ${voucher.benefitTotal} ${voucher.benefitTotal === 1 ? 'clase' : 'clases'}. Destinatario: ${voucher.recipientName || intent.recipientEmail}. El enlace abre el regalo en este navegador de demostración.`, en: `UNSENT fictional preview. Recorded gift: ${voucher.title}. Recorded benefit: ${voucher.benefitTotal} ${voucher.benefitTotal === 1 ? 'class' : 'classes'}. Recipient: ${voucher.recipientName || intent.recipientEmail}. The link opens the gift in this demo browser.` },
      ctaLabel: { es: 'Ver regalo de clases', en: 'View class gift' },
    }, route: `/app/voucher-gifts?gift=${encodeURIComponent(selected.paymentId)}`, contract: { kind: 'builtin-mock', key: 'class-voucher-recipient-ready', revision: 1 } };
    return { status: 'ready', preview: freeze(preview) };
  } catch (error) {
    try { check(); } catch { return { status: 'cancelled', reason: 'context_changed' }; }
    return error instanceof Unavailable ? { status: 'unavailable', reason: error.message } : { status: 'error', reason: 'read_failed' };
  }
}
