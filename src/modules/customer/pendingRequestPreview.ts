import type { DataProvider } from '../../data/types';
import { applyQuery } from '../../data/types';
import type { BaseRow, PaymentRow, UserRow, ProfileRow, TransferReceiptRow } from '../../data/schema';
import { readPaymentQuote } from '../../data/operationalQuotes';
import { readPendingDeskIntent } from '../../data/pendingDeskIntent';
import { readReceiptAlert, alertIntentId } from '../transfers/receiptAlert';
import { tenant } from '../../tenant/tenant';

export type PendingRequestSource = { kind: 'cash'; paymentId: string } | { kind: 'transfer'; receiptId: string };
export interface PendingRequestScope { tenantId: string; actorId: string; role: string; isCurrent: () => boolean }
export interface PendingRequestPreview {
  readonly kind: 'cash' | 'transfer';
  readonly paymentId: string;
  readonly receiptId?: string;
  readonly auditId: string;
  readonly recipient: Readonly<{ email: string; name: string }>;
  readonly amount: number;
  readonly product: Readonly<{ es: string; en: string }>;
  readonly method: 'cash' | 'transfer';
  readonly route: '/app/history';
  readonly contract: Readonly<{ kind: 'builtin-mock'; key: 'pending-payment-request'; revision: 1 }>;
}
export type PendingRequestPreviewResult = { status: 'ready'; preview: PendingRequestPreview } | { status: 'unavailable' | 'error' | 'cancelled'; reason: string };
const atom = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}` : JSON.stringify(value);
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
class Unavailable extends Error {}
class Cancelled extends Error {}
const proof = (condition: unknown, reason = 'proof_mismatch'): void => { if (!condition) throw new Unavailable(reason); };
function freeze<T>(value: T): T { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }

/** Saved browser-demo requests only. No delivery, booking, hold, entitlement or payment mutation. */
export async function buildPendingRequestPreview(data: DataProvider, source: PendingRequestSource | null, scope: PendingRequestScope): Promise<PendingRequestPreviewResult> {
  let check: () => void = () => { throw new Cancelled('context_changed'); };
  try {
    const context = { tenantId: scope.tenantId, actorId: scope.actorId, role: scope.role };
    check = () => { if (!scope.isCurrent() || scope.tenantId !== context.tenantId || scope.actorId !== context.actorId || scope.role !== context.role) throw new Cancelled('context_changed'); };
    check(); proof(data.name === 'mock', 'disconnected');
    proof(context.tenantId === tenant.id && atom(context.actorId) && context.role === 'customer', 'actor_scope');
    proof(source && (source.kind === 'cash' && atom(source.paymentId) || source.kind === 'transfer' && atom(source.receiptId)), 'source_missing_or_invalid');
    const selected = { ...source! } as PendingRequestSource;
    const read = async <T>(action: () => Promise<T>): Promise<T> => { check(); const result = await action(); check(); proof(data.name === 'mock', 'disconnected'); return structuredClone(result); };
    const rows = async (table: string, where: Record<string, unknown>) => {
      const result = await read(() => data.list(table, { where: { tenant_id: context.tenantId, ...where } }));
      proof(Array.isArray(result) && result.every(row => row && typeof row === 'object' && text(row.id, 500) && row.id.trim() && row.tenant_id === context.tenantId && typeof row.created_at === 'string' && Number.isFinite(Date.parse(row.created_at)) && typeof row.updated_at === 'string' && Number.isFinite(Date.parse(row.updated_at)) && Object.entries(where).every(([key, value]) => row[key] === value)) && new Set(result.map(row => row.id)).size === result.length, 'malformed_or_foreign_rows');
      return result;
    };
    const unique = <T extends BaseRow>(items: BaseRow[], id: string): T => { const matches = items.filter(row => row.id === id); proof(matches.length === 1 && matches[0].tenant_id === context.tenantId, 'missing_or_ambiguous_source'); return matches[0] as T; };
    const snapshot = async () => {
      const db: Record<string, BaseRow[]> = {};
      // Keep this first read stable for context fencing and production-browser regression probes.
      db.users = await rows('users', { id: context.actorId });
      const exactUser = await read(() => data.get('users', context.actorId));
      proof(same(exactUser, unique(db.users, context.actorId)));
      db.user_roles = await rows('user_roles', { user_id: context.actorId });
      db.profiles = await rows('profiles', { user_id: context.actorId });
      let paymentId: string;
      let exactReceipt: TransferReceiptRow | null = null;
      if (selected.kind === 'transfer') {
        exactReceipt = await read(() => data.get<TransferReceiptRow>('transfer_receipts', selected.receiptId));
        proof(exactReceipt && exactReceipt.tenant_id === context.tenantId && atom(exactReceipt.payment_id), 'receipt_source');
        paymentId = exactReceipt!.payment_id;
      } else paymentId = selected.paymentId;
      db.payments = await rows('payments', { id: paymentId });
      const exactPayment = await read(() => data.get('payments', paymentId));
      proof(same(exactPayment, unique(db.payments, paymentId)));
      db.transfer_receipts = await rows('transfer_receipts', { payment_id: paymentId });
      if (selected.kind === 'transfer') proof(same(exactReceipt, unique(db.transfer_receipts, selected.receiptId)));
      db.bookings = await rows('bookings', { payment_id: paymentId });
      db.class_ledger = await rows('class_ledger', { payment_id: paymentId });
      db.audit_log = await rows('audit_log', { entity_id: paymentId });
      if (selected.kind === 'transfer') {
        const receiptAudits = await rows('audit_log', { entity_id: selected.receiptId });
        db.audit_log.push(...receiptAudits);
        for (const id of [alertIntentId(context.actorId, selected.receiptId), `${alertIntentId(context.actorId, selected.receiptId)}:simulation`]) {
          const exact = await read(() => data.get('audit_log', id));
          const matches = db.audit_log.filter(row => row.id === id);
          proof(matches.length <= 1 && same(exact, matches[0] ?? null), 'receipt_intent_source');
        }
      }
      const pending = db.audit_log.filter(row => row.action === 'payment.mock.pending' && row.entity_id === paymentId);
      proof(pending.length === 1, 'pending_audit_missing_or_ambiguous');
      const exactAudit = await read(() => data.get('audit_log', pending[0].id));
      proof(same(exactAudit, pending[0]));
      return { db, paymentId };
    };
    const validate = async ({ db, paymentId }: Awaited<ReturnType<typeof snapshot>>) => {
      try {
        const account = unique<UserRow>(db.users, context.actorId);
        proof(account.status === 'active' && db.user_roles.some(row => row.user_id === account.id && (row.role === context.role || row.role === 'super_admin')), 'actor_inactive_or_role');
        proof(text(account.email, 254) && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(account.email) && !/@sin-email\.hoyos\.test$/i.test(account.email), 'recipient_email');
        proof(db.profiles.length <= 1, 'recipient_profile_ambiguous');
        const profile = db.profiles[0] as ProfileRow | undefined;
        proof(!profile || profile.user_id === account.id && text(profile.full_name, 200), 'recipient_name');
        const payment = unique<PaymentRow>(db.payments, paymentId);
        proof(payment.user_id === account.id && payment.status === 'pending' && payment.provider === 'manual' && payment.method === selected.kind && payment.paid_at === null && payment.amount_paid === null && payment.taken_by === null && payment.provider_ref === null && payment.frontend_receipt == null, 'pending_payment_state');
        const quote = readPaymentQuote(payment);
        proof(quote && quote.kind === 'class' && quote.quantity === 1 && quote.tenantId === context.tenantId && quote.planId === payment.plan_id && quote.chargedAmount === payment.amount && text(quote.name.es, 300) && quote.name.es.trim() && text(quote.name.en, 300) && quote.name.en.trim(), 'class_quote');
        proof(!db.bookings.length && !db.class_ledger.length, 'request_already_activated');
        const audit = db.audit_log.find(row => row.action === 'payment.mock.pending' && row.entity_id === paymentId)!;
        proof(atom(audit.id) && audit.actor_id === account.id && audit.entity === 'payments' && same(audit.diff, { source: 'fictional-payment-checkout', simulated: true, method: selected.kind, status: 'pending' }), 'pending_audit');
        if (selected.kind === 'cash') {
          proof(db.transfer_receipts.length === 0, 'cash_has_receipt');
          const intent = readPendingDeskIntent(payment);
          proof(intent && intent.tenantId === context.tenantId && intent.customerId === account.id && intent.planId === payment.plan_id && atom(intent.sessionId), 'cash_intent');
        } else {
          proof(db.transfer_receipts.length === 1, 'receipt_ambiguous');
          const receipt = unique<TransferReceiptRow>(db.transfer_receipts, selected.receiptId);
          proof(receipt.status === 'pending' && receipt.user_id === account.id && receipt.payment_id === paymentId && receipt.product_id === quote!.planId && same(receipt.product_name, quote!.name) && receipt.classes === quote!.classes && receipt.expires_at === quote!.entitlementExpiresAt && receipt.amount_received === null && receipt.review_reason === null && receipt.reviewed_by === null && receipt.reviewed_at === null && receipt.booking_id === null, 'pending_receipt');
          // The existing upload-intent verifier sees only this detached proof snapshot.
          // Every helper read is fenced; the facade exposes no mutation or real-provider method.
          const detached = {
            name: 'mock',
            get: async (table: string, id: string) => { check(); const matches = (db[table] ?? []).filter(row => row.id === id); proof(matches.length <= 1, 'ambiguous_detached_source'); check(); return structuredClone(matches[0] ?? null); },
            list: async (table: string, query?: Parameters<DataProvider['list']>[1]) => { check(); const found = applyQuery(db[table] ?? [], query); check(); return structuredClone(found); },
          } as DataProvider;
          check(); const alert = await readReceiptAlert(detached, account.id, selected.receiptId); check();
          proof(alert.intentId === alertIntentId(account.id, selected.receiptId), 'upload_intent_missing');
        }
        return { account, name: profile?.full_name ?? '', payment, quote: quote!, audit };
      } catch (error) { if (error instanceof Cancelled || error instanceof Unavailable) throw error; throw new Unavailable('malformed_proof'); }
    };
    const first = await snapshot(); check(); await validate(first); check();
    const fresh = await snapshot(); check(); proof(same(first, fresh), 'proof_changed');
    const facts = await validate(fresh); check();
    const preview: PendingRequestPreview = { ...selected, paymentId: fresh.paymentId, auditId: facts.audit.id, recipient: { email: facts.account.email, name: facts.name }, amount: facts.payment.amount, product: { ...facts.quote.name }, method: selected.kind, route: '/app/history', contract: { kind: 'builtin-mock', key: 'pending-payment-request', revision: 1 } };
    return { status: 'ready', preview: freeze(preview) };
  } catch (error) {
    try { check(); } catch { return { status: 'cancelled', reason: 'context_changed' }; }
    return error instanceof Unavailable ? { status: 'unavailable', reason: error.message } : { status: 'error', reason: 'read_failed' };
  }
}
