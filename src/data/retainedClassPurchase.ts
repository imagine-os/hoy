import type { BaseRow, BookingRow, ClassLedgerRow, PaymentRow, UserRow } from './schema';
import type { DataProvider } from './types';
import { checkSaleQuote, readPaymentQuote, type FrozenSaleQuote } from './operationalQuotes';
import { readLaunchReceipt } from './launchReceipts';
import { activatePaidPackage, recordPayment, wompiCheckout } from '../modules/customer/payments';
import { tenant } from '../tenant/tenant';
import { freezePatch, resumePatch } from './packages';
import { validProductDate } from './productCatalog';
import { addDaysKey, dateKey, fromDateKey, MS } from '../i18n/format';
import { cancellationDigest, customerReturnId } from '../modules/customer/customerCancellation';
import { studioReturnId } from '../modules/classSchedule/studioCancellation';

/** One browser/mock dataset only. The marker contains quote facts and scoped identifiers, never contacts or credentials. */
export interface RetainedClassPurchase {
  version: 1; id: string; tenantId: string; userId: string; quote: FrozenSaleQuote; createdAt: string;
  paymentId?: string; grantId?: string;
}
export interface RetainedClassPurchaseResult {
  attemptId: string; tenantId: string; userId: string; quote: FrozenSaleQuote;
  payment: PaymentRow; grant: ClassLedgerRow | null; status: 'approved' | 'declined';
}
export interface RetainedClassPurchaseControl { isCurrent: () => boolean }
export type RetainedClassPurchaseErrorCode = 'invalid' | 'storage' | 'marker' | 'context' | 'proof' | 'owner' | 'committed';
export class RetainedClassPurchaseError extends Error {
  constructor(public readonly code: RetainedClassPurchaseErrorCode) { super(`retained_purchase_${code}`); this.name = 'RetainedClassPurchaseError'; }
}
const fail = (code: RetainedClassPurchaseErrorCode = 'invalid'): never => { throw new RetainedClassPurchaseError(code); };
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160 && !/[\u0000-\u001f]/.test(v);
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
};
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const storageKey = (userId: string) => { if (!text(userId)) fail(); return `hoyos.retained-class-purchase.v1:${tenant.id}:${encodeURIComponent(userId)}`; };
const transactionKey = (a: RetainedClassPurchase) => `class-purchase:${a.tenantId}:${a.userId}:${a.id}`;
const receiptId = (a: RetainedClassPurchase) => `mock_transaction_${transactionKey(a)}`;
const paymentIdentity = (p: PaymentRow) => { const { note: _note, updated_at: _updated, ...facts } = p; return facts; };
const grantIdentity = (g: ClassLedgerRow) => { const { expires_at: _expiry, frozen_from: _from, frozen_until: _until, updated_at: _updated, ...facts } = g; return facts; };
const temporal = (g: ClassLedgerRow) => ({ expires_at: g.expires_at, frozen_from: g.frozen_from ?? null, frozen_until: g.frozen_until ?? null });
const validTimestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
/** Validate evolution using the same freeze/resume transforms; neither quantity nor purchase lineage can evolve. */
function validGrantEvolution(original: ClassLedgerRow, current: ClassLedgerRow): boolean {
  if (!same(grantIdentity(original), grantIdentity(current)) || !validTimestamp(current.updated_at) || !validTimestamp(original.created_at) || current.expires_at !== null && !validProductDate(current.expires_at)) return false;
  if (current.frozen_from == null && current.frozen_until == null) return current.expires_at === original.expires_at;
  const start = current.frozen_from, end = current.frozen_until;
  if (typeof start !== 'string' || typeof end !== 'string' || !validProductDate(start) || !validProductDate(end) || start < dateKey(new Date(original.created_at)) || start > dateKey()) return false;
  const used = Math.round((fromDateKey(end).getTime() - fromDateKey(start).getTime()) / MS.day) + 1;
  if (!Number.isSafeInteger(used) || used < 0) return false;
  if (used > 0 && same(temporal(current), temporal({ ...original, ...freezePatch(original, used, start) }))) return true;
  // After early resume, the original planned duration is not retained. A minimal one-day-longer freeze
  // produces the same observed state. Do not retroactively apply today's mutable maximum to old history.
  const resumeDay = addDaysKey(start, used);
  if (resumeDay > dateKey()) return false;
  const frozen = { ...original, ...freezePatch(original, used + 1, start) };
  return same(temporal(current), temporal({ ...frozen, ...resumePatch(frozen, resumeDay) }));
}
const outcomeIdentity = (r: RetainedClassPurchaseResult) => ({ attemptId: r.attemptId, tenantId: r.tenantId, userId: r.userId, quote: r.quote, status: r.status, payment: paymentIdentity(r.payment), grant: r.grant ? grantIdentity(r.grant) : null });
function validQuote(value: unknown): value is FrozenSaleQuote {
  if (!value || typeof value !== 'object') return false;
  const q = value as FrozenSaleQuote;
  return q.kind === 'class' && q.quantity === 1 && q.tenantId === tenant.id && !!readPaymentQuote({ tenant_id: tenant.id, plan_id: q.planId, currency: q.currency, amount: q.chargedAmount, frontend_quote: q } as unknown as PaymentRow);
}
function validate(value: unknown, userId: string): RetainedClassPurchase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const a = value as RetainedClassPurchase;
  if (Object.keys(a).some(k => !['version', 'id', 'tenantId', 'userId', 'quote', 'createdAt', 'paymentId', 'grantId'].includes(k)) || a.version !== 1 || !text(a.id) || a.tenantId !== tenant.id || a.userId !== userId || !text(a.userId) || typeof a.createdAt !== 'string' || !Number.isFinite(Date.parse(a.createdAt)) || !validQuote(a.quote) || a.paymentId !== undefined && !text(a.paymentId) || a.grantId !== undefined && (!text(a.grantId) || !a.paymentId)) return fail();
  return structuredClone(a);
}
/** Null means absent. Corrupt/unavailable storage throws, preventing accidental replacement by a fresh attempt. */
export function readRetainedClassPurchase(userId: string): RetainedClassPurchase | null {
  let raw: string | null;
  try { raw = localStorage.getItem(storageKey(userId)); } catch { return fail('storage'); }
  if (raw === null) return null;
  try { return validate(JSON.parse(raw), userId); } catch { return fail('invalid'); }
}
export function retainClassPurchase(userId: string, quote: FrozenSaleQuote): RetainedClassPurchase {
  const prior = readRetainedClassPurchase(userId);
  if (prior) return prior; // An unacknowledged intent always wins, even if another product was selected.
  if (!validQuote(quote)) return fail();
  const attempt: RetainedClassPurchase = { version: 1, id: crypto.randomUUID(), tenantId: tenant.id, userId, quote: structuredClone(quote), createdAt: new Date().toISOString() };
  store(attempt);
  return validate(attempt, userId);
}
function store(attempt: RetainedClassPurchase) {
  try { localStorage.setItem(storageKey(attempt.userId), JSON.stringify(attempt)); } catch { fail('storage'); }
  const saved = readRetainedClassPurchase(attempt.userId);
  if (!saved || !same(saved, attempt)) fail('storage');
}
function retained(input: RetainedClassPurchase): RetainedClassPurchase {
  const a = validate(input, input.userId), saved = readRetainedClassPurchase(a.userId);
  if (!saved || saved.id !== a.id || !same(saved.quote, a.quote) || saved.createdAt !== a.createdAt) return fail('marker');
  // Candidate IDs may change after a proven rollback; immutable intent identity stays fixed.
  // Only the current persisted candidate IDs are authoritative, including for callers surviving a retry.
  return saved;
}
function checker(data: DataProvider, control: RetainedClassPurchaseControl) {
  if (data.name !== 'mock' || typeof control?.isCurrent !== 'function') fail('context');
  return () => { if (!control.isCurrent()) fail('context'); };
}
async function exact<T extends BaseRow>(data: DataProvider, table: string, id: string, check: () => void): Promise<T | null> {
  check(); const rows = await data.list<T>(table, { where: { id } }); check();
  if (rows.length > 1 || rows.some(r => r.id !== id || r.tenant_id !== tenant.id)) return fail('proof');
  return rows[0] ?? null;
}
async function owner(data: DataProvider, a: RetainedClassPurchase, check: () => void) {
  const user = await exact<UserRow>(data, 'users', a.userId, check);
  if (!user || user.status !== 'active') fail('owner');
}
/** Mock-only final read: no await between fresh owner validation and result/marker release. */
function currentOwner(data: DataProvider, a: RetainedClassPurchase, check: () => void) {
  check(); if (!data.peek) return fail('context');
  const users = data.peek<UserRow>('users', { where: { id: a.userId } });
  if (!Array.isArray(users)) return fail('context');
  if (users.length !== 1 || users[0].id !== a.userId || users[0].tenant_id !== a.tenantId || users[0].status !== 'active') return fail('owner');
  check();
}
interface ReturnProofItem { bookingId: string; userId?: string; debitId: string; grantId: string; returnId: string; bookingDigest: string; debitDigest: string; grantDigest: string; returnDigest: string }
interface ReturnProof extends BaseRow { action: string; actor_id: string; entity: string; entity_id: string; diff: { version: number; source: string; role: string; fingerprint: string; result: ReturnProofItem & { outcome?: { bookingId: string; sessionId: string; late: boolean; returned: boolean; expiresAt: string | null }; sessionId?: string; items?: ReturnProofItem[] } } }
const hex = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
async function scoped<T extends BaseRow>(data: DataProvider, table: string, where: Record<string, unknown>, check: () => void): Promise<T[]> {
  check(); const rows = await data.list<T>(table, { where: { tenant_id: tenant.id, ...where } }); check();
  if (new Set(rows.map(r => r.id)).size !== rows.length || rows.some(r => !text(r.id) || r.tenant_id !== tenant.id || Object.entries(where).some(([k, v]) => r[k] !== v))) return fail('proof');
  return rows;
}
/** Only canonical, durably recorded cancellation returns can accompany the single origin purchase. */
async function validatePurchaseHistory(data: DataProvider, a: RetainedClassPurchase, origin: ClassLedgerRow, rows: ClassLedgerRow[], check: () => void) {
  const history = rows.filter(r => r.id !== origin.id);
  if (!history.length) return;
  const bookings = await scoped<BookingRow>(data, 'bookings', { user_id: a.userId }, check);
  for (const row of history) {
    if (row.purchase_ledger_id !== origin.id || row.plan_id !== origin.plan_id || row.payment_id !== origin.payment_id || !validTimestamp(row.created_at) || !validTimestamp(row.updated_at) || row.frozen_from != null || row.frozen_until != null) fail('proof');
    if (!same(await exact<ClassLedgerRow>(data, 'class_ledger', row.id, check), row)) fail('proof');
    if (row.delta === -1 && row.reason === 'booking') {
      const uses = bookings.filter(b => b.ledger_id === row.id);
      if (row.expires_at !== null || !uses.length || uses.some(b => !text(b.session_id) || !['booked', 'checked_in', 'cancelled', 'late_cancel', 'no_show'].includes(b.status) || !validTimestamp(b.created_at))) fail('proof');
      for (const booking of uses) if (!same(await exact<BookingRow>(data, 'bookings', booking.id, check), booking)) fail('proof');
      continue;
    }
    if (row.delta !== 1 || !['cancel_return', 'refund'].includes(row.reason) || row.expires_at !== null && !validProductDate(row.expires_at)) fail('proof');
    const matching: BookingRow[] = [];
    for (const booking of bookings.filter(b => b.status === 'cancelled' && text(b.ledger_id))) {
      check(); const id = row.reason === 'cancel_return' ? await customerReturnId(booking.id) : await studioReturnId(booking.session_id, booking.id); check();
      if (id === row.id) matching.push(booking);
    }
    if (matching.length !== 1) fail('proof');
    const booking = matching[0], debit = rows.find(r => r.id === booking.ledger_id);
    if (!same(await exact<BookingRow>(data, 'bookings', booking.id, check), booking) || !debit || debit.delta !== -1 || debit.reason !== 'booking' || debit.purchase_ledger_id !== origin.id) fail('proof');
    const own = row.reason === 'cancel_return';
    const receipts = await scoped<ReturnProof>(data, 'audit_log', own ? { action: 'booking.customer_cancel', entity: 'bookings', entity_id: booking.id, actor_id: a.userId } : { action: 'session.cancel', entity: 'class_sessions', entity_id: booking.session_id }, check);
    const proofs = receipts.flatMap(receipt => {
      const d = receipt.diff, r = d?.result;
      if (d?.version !== 1 || !hex(d.fingerprint) || !text(receipt.actor_id) || !r) return [];
      if (own) {
        if (!/^customer_cancel_v1_[a-f0-9]{64}$/.test(receipt.id) || d.source !== 'fictional-own-cancellation' || !['customer', 'teacher', 'super_admin'].includes(d.role) || r.returnId !== row.id || r.outcome?.bookingId !== booking.id || r.outcome.sessionId !== booking.session_id || r.outcome.late !== false || r.outcome.returned !== true || r.outcome.expiresAt !== row.expires_at) return [];
        return [{ ...r, bookingId: booking.id }];
      }
      if (!/^studio_cancel_v1_[a-f0-9]{64}$/.test(receipt.id) || d.source !== 'fictional-studio-cancellation' || !['admin', 'super_admin'].includes(d.role) || r.sessionId !== booking.session_id || !Array.isArray(r.items)) return [];
      return r.items.filter(item => item.returnId === row.id && item.userId === a.userId);
    });
    if (proofs.length !== 1) fail('proof');
    const proof = proofs[0];
    if (proof.bookingId !== booking.id || proof.debitId !== debit!.id || proof.grantId !== origin.id || proof.returnId !== row.id || ![proof.bookingDigest, proof.debitDigest, proof.grantDigest, proof.returnDigest].every(hex)) fail('proof');
    check(); const bookingHash = await cancellationDigest(booking); check(); const debitHash = await cancellationDigest(debit); check(); const returnHash = await cancellationDigest(row); check();
    if (proof.bookingDigest !== bookingHash || proof.debitDigest !== debitHash || proof.returnDigest !== returnHash) fail('proof');
    // The recorded grant digest may predate a legitimate later freeze/resume; origin identity is independently strict.
  }
}
async function recover(data: DataProvider, a: RetainedClassPurchase, check: () => void): Promise<RetainedClassPurchaseResult | null> {
  await owner(data, a, check);
  const receipt = await exact<BaseRow>(data, 'audit_log', receiptId(a), check);
  if (!receipt) {
    // Candidate IDs were saved before the database commit. Existing rows without their receipt are ambiguous history.
    if (a.paymentId && await exact<PaymentRow>(data, 'payments', a.paymentId, check) || a.grantId && await exact<ClassLedgerRow>(data, 'class_ledger', a.grantId, check)) fail('proof');
    currentOwner(data, a, check);
    return null;
  }
  const cached = (receipt.diff as { result?: RetainedClassPurchaseResult } | null)?.result;
  if (receipt.action !== 'mock.transaction' || receipt.entity !== 'mock' || receipt.entity_id !== receipt.id || !cached || cached.attemptId !== a.id || cached.tenantId !== a.tenantId || cached.userId !== a.userId || !same(cached.quote, a.quote) || !['approved', 'declined'].includes(cached.status) || !text(cached.payment?.id) || cached.payment.id !== a.paymentId) return fail('proof');
  const payment = await exact<PaymentRow>(data, 'payments', cached.payment.id, check);
  if (!payment || !same(paymentIdentity(payment), paymentIdentity(cached.payment)) || !validTimestamp(payment.updated_at) || !(payment.note === null || typeof payment.note === 'string') || payment.user_id !== a.userId || payment.plan_id !== a.quote.planId || payment.status !== cached.status || payment.provider !== 'wompi' || payment.method !== 'card' || payment.amount !== a.quote.chargedAmount || !same(readPaymentQuote(payment), a.quote) || cached.status === 'approved' && (!readLaunchReceipt(payment) || payment.amount_paid !== payment.amount) || cached.status === 'declined' && payment.amount_paid !== null) return fail('proof');
  check(); const rows = await data.list<ClassLedgerRow>('class_ledger', { where: { payment_id: payment.id } }); check();
  if (new Set(rows.map(r => r.id)).size !== rows.length || rows.some(r => r.tenant_id !== a.tenantId || r.user_id !== a.userId || r.payment_id !== payment.id)) return fail('proof');
  // Subsequent consumption is separate history. This command creates exactly one positive purchase grant.
  const grants = rows.filter(r => r.reason === 'purchase');
  let grant: ClassLedgerRow | null = null;
  if (cached.status === 'approved') {
    if (!cached.grant || !a.grantId || cached.grant.id !== a.grantId || grants.length !== 1 || cached.grant.expires_at !== a.quote.entitlementExpiresAt || cached.grant.frozen_from != null || cached.grant.frozen_until != null) return fail('proof');
    grant = await exact<ClassLedgerRow>(data, 'class_ledger', a.grantId, check);
    if (!grant || !validGrantEvolution(cached.grant, grant) || grant.reason !== 'purchase' || grant.delta !== a.quote.classes || grant.plan_id !== a.quote.planId || grant.user_id !== a.userId || grant.payment_id !== payment.id || !same(grant.frontend_quote, a.quote)) return fail('proof');
    await validatePurchaseHistory(data, a, grant, rows, check);
  } else if (cached.grant !== null || a.grantId !== undefined || rows.length) return fail('proof');
  currentOwner(data, a, check); return structuredClone({ ...cached, payment, grant });
}
/** A missing receipt is retryable only when its pre-commit candidate IDs are also absent. No catalogue repricing on recovery. */
export async function recoverRetainedClassPurchase(data: DataProvider, attempt: RetainedClassPurchase, control: RetainedClassPurchaseControl): Promise<RetainedClassPurchaseResult | null> {
  const check = checker(data, control); check();
  const a = retained(attempt), result = await recover(data, a, check); check(); retained(a);
  currentOwner(data, a, check);
  return result;
}
export async function executeRetainedClassPurchase(data: DataProvider, attempt: RetainedClassPurchase, control: RetainedClassPurchaseControl & { ivaRate: number }): Promise<RetainedClassPurchaseResult> {
  const check = checker(data, control); check();
  if (!data.atomic || !Number.isFinite(control.ivaRate) || control.ivaRate < 0 || control.ivaRate > 1) return fail('context');
  const a = retained(attempt), existing = await recover(data, a, check); check();
  currentOwner(data, a, check);
  if (existing) return existing;
  await data.atomic(async staged => {
    // Every nested command read/write checks the captured caller, including after simulated checkout resolves.
    const tx = new Proxy({} as DataProvider, { get(_target, key) { const v = Reflect.get(staged, key); return typeof v === 'function' ? (...args: unknown[]) => { check(); const value = v.apply(staged, args); if (value instanceof Promise) return value.then(r => { check(); return r; }); check(); return value; } : v; } });
    check(); const current = retained(a); await owner(tx, current, check); currentOwner(data, current, check);
    await checkSaleQuote(tx, current.quote); check();
    const response = await wompiCheckout({ amount: current.quote.chargedAmount, method: 'card' }); check();
    currentOwner(tx, current, check); currentOwner(data, current, check);
    const payment = await recordPayment(tx, { userId: current.userId, planId: current.quote.planId, amount: current.quote.chargedAmount, method: 'card', result: response, ivaRate: control.ivaRate, quote: current.quote }); check();
    const grant = await activatePaidPackage(tx, { paymentId: payment.id, userId: current.userId, planId: current.quote.planId, classes: current.quote.classes, expiresAt: current.quote.entitlementExpiresAt }); check();
    currentOwner(tx, current, check); currentOwner(data, current, check);
    const saved = retained(current); store({ ...saved, paymentId: payment.id, ...(grant ? { grantId: grant.id } : {}) }); check();
    return { attemptId: current.id, tenantId: current.tenantId, userId: current.userId, quote: current.quote, payment, grant, status: response.status } satisfies RetainedClassPurchaseResult;
  }, { idempotencyKey: transactionKey(a) });
  check(); const result = await recover(data, retained(a), check); check();
  if (!result) return fail('proof');
  currentOwner(data, a, check);
  return result;
}
/** Only a fresh, verified durable result can clear the exact current marker. It never rewrites historical rows. */
export async function acknowledgeRetainedClassPurchase(data: DataProvider, attempt: RetainedClassPurchase, result: RetainedClassPurchaseResult, control: RetainedClassPurchaseControl): Promise<void> {
  const check = checker(data, control); check(); const a = retained(attempt), saved = await recover(data, a, check); check();
  if (!saved || !result?.payment || !same(outcomeIdentity(saved), outcomeIdentity(result))) return fail('proof');
  retained(a); currentOwner(data, a, check);
  try { localStorage.removeItem(storageKey(a.userId)); } catch { return fail('storage'); }
  check(); if (readRetainedClassPurchase(a.userId) !== null) fail('storage');
}

/** Explicit cancellation of a proven uncommitted intent only. Caller must first cancel its active work generation. */
export async function discardRetainedClassPurchase(data: DataProvider, attempt: RetainedClassPurchase, control: RetainedClassPurchaseControl): Promise<void> {
  const check = checker(data, control); check(); const a = retained(attempt);
  if (await recover(data, a, check)) return fail('committed');
  check(); const latest = retained(a);
  if (!same(latest, a)) return fail('marker');
  currentOwner(data, a, check);
  try { localStorage.removeItem(storageKey(a.userId)); } catch { return fail('storage'); }
  check(); if (readRetainedClassPurchase(a.userId) !== null) fail('storage');
}
