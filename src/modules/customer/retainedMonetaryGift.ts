import type { BaseRow, PaymentRow, UserRow } from '../../data/schema';
import type { DataProvider } from '../../data/types';
import type { Role } from '../../auth/roles';
import { checkSaleQuote, quotePurchaseDate, readPaymentQuote, type FrozenSaleQuote } from '../../data/operationalQuotes';
import { validProductDate } from '../../data/productCatalog';
import { readLaunchReceipt } from '../../data/launchReceipts';
import { atStudioTime, fromDateKey, isPhone } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { recordPayment, wompiCheckout } from './payments';

/** Browser-only monetary drafts. This never issues a class voucher, claims it or sends a message. */
export interface RetainedMonetaryGift {
  version: 1; id: string; tenantId: string; userId: string; role: Role; createdAt: string;
  quote: FrozenSaleQuote; recipientName: string; recipientContact: string; deliveryDate: string;
  paymentId?: string; giftId?: string;
}
export interface MonetaryGiftDraft extends BaseRow {
  code: string; buyer_user_id: string; recipient_name: string; recipient_contact: string;
  amount: number; balance: number; deliver_at: string; redeemed_by: null; status: 'draft'; frontend_quote: FrozenSaleQuote;
}
export interface RetainedMonetaryGiftResult {
  attemptId: string; tenantId: string; userId: string; role: Role; quote: FrozenSaleQuote;
  recipientName: string; recipientContact: string; deliveryDate: string;
  payment: PaymentRow; gift: MonetaryGiftDraft | null; status: 'approved' | 'declined';
}
export interface MonetaryGiftControl { isCurrent: () => boolean; role: Role }
interface AssignedRole extends BaseRow { user_id: string; role: Role }
type ErrorCode = 'invalid' | 'storage' | 'marker' | 'context' | 'proof' | 'owner' | 'committed';
export class RetainedMonetaryGiftError extends Error {
  constructor(public readonly code: ErrorCode) { super(`retained_gift_${code}`); this.name = 'RetainedMonetaryGiftError'; }
}
const fail = (code: ErrorCode = 'invalid'): never => { throw new RetainedMonetaryGiftError(code); };
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 500 && !/[\u0000-\u001f]/.test(v);
const roles: Role[] = ['customer', 'teacher', 'super_admin'];
const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v !== null && typeof v === 'object' ? `{${Object.entries(v).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => `${JSON.stringify(k)}:${canonical(value)}`).join(',')}}`
  : JSON.stringify(v);
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const storageKey = (userId: string) => { if (!text(userId)) fail(); return `hoyos.retained-monetary-gift.v1:${tenant.id}:${encodeURIComponent(userId)}`; };
const transactionKey = (a: RetainedMonetaryGift) => `monetary-gift:${a.tenantId}:${a.userId}:${a.id}`;
const validQuote = (q: FrozenSaleQuote) => q && q.kind === 'gift' && q.tenantId === tenant.id && !!readPaymentQuote({ tenant_id: tenant.id, plan_id: q.planId, currency: q.currency, amount: q.chargedAmount, frontend_quote: q } as unknown as PaymentRow);
function validate(value: unknown, userId: string): RetainedMonetaryGift {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const a = value as RetainedMonetaryGift;
  if (Object.keys(a).some(k => !['version', 'id', 'tenantId', 'userId', 'role', 'createdAt', 'quote', 'recipientName', 'recipientContact', 'deliveryDate', 'paymentId', 'giftId'].includes(k))
    || a.version !== 1 || !text(a.id) || a.tenantId !== tenant.id || a.userId !== userId || !text(a.userId) || !roles.includes(a.role)
    || typeof a.createdAt !== 'string' || !Number.isFinite(Date.parse(a.createdAt)) || !validQuote(a.quote)
    || !text(a.recipientName) || a.recipientName !== a.recipientName.trim() || a.recipientName.length < 2
    || !text(a.recipientContact) || a.recipientContact !== a.recipientContact.trim() || !a.recipientContact.includes('@') && !isPhone(a.recipientContact)
    || !validProductDate(a.deliveryDate) || a.paymentId !== undefined && !text(a.paymentId) || a.giftId !== undefined && (!text(a.giftId) || !a.paymentId)) return fail();
  return structuredClone(a);
}
/** Local contact fields remain only in this browser, like its existing draft gift records. Corrupt storage never becomes a fresh purchase. */
export function readRetainedMonetaryGift(userId: string): RetainedMonetaryGift | null {
  let raw: string | null; try { raw = localStorage.getItem(storageKey(userId)); } catch { return fail('storage'); }
  if (raw === null) return null;
  try { return validate(JSON.parse(raw), userId); } catch { return fail('invalid'); }
}
function store(a: RetainedMonetaryGift) {
  try { localStorage.setItem(storageKey(a.userId), JSON.stringify(a)); } catch { fail('storage'); }
  if (!same(readRetainedMonetaryGift(a.userId), a)) fail('storage');
}
const intent = (a: RetainedMonetaryGift) => ({ version: a.version, id: a.id, tenantId: a.tenantId, userId: a.userId, role: a.role, createdAt: a.createdAt, quote: a.quote, recipientName: a.recipientName, recipientContact: a.recipientContact, deliveryDate: a.deliveryDate });
function retained(input: RetainedMonetaryGift) {
  const a = validate(input, input.userId), saved = readRetainedMonetaryGift(a.userId);
  if (!saved || !same(intent(saved), intent(a))) return fail('marker');
  return saved;
}
export function retainMonetaryGift(input: { userId: string; role: Role; quote: FrozenSaleQuote; recipientName: string; recipientContact: string; deliveryDate: string }): RetainedMonetaryGift {
  const prior = readRetainedMonetaryGift(input.userId);
  if (prior) {
    if (prior.role !== input.role || !same(prior.quote, input.quote) || prior.recipientName !== input.recipientName.trim() || prior.recipientContact !== input.recipientContact.trim() || prior.deliveryDate !== input.deliveryDate) return fail('marker');
    return prior;
  }
  const a = validate({ version: 1, id: crypto.randomUUID(), tenantId: tenant.id, userId: input.userId, role: input.role, quote: structuredClone(input.quote), recipientName: input.recipientName.trim(), recipientContact: input.recipientContact.trim(), deliveryDate: input.deliveryDate, createdAt: new Date().toISOString() }, input.userId);
  store(a); return a;
}
function checker(data: DataProvider, a: RetainedMonetaryGift, control: MonetaryGiftControl) {
  if (data.name !== 'mock' || typeof control?.isCurrent !== 'function' || control.role !== a.role) return fail('context');
  return () => { if (!control.isCurrent()) fail('context'); };
}
async function exact<T extends BaseRow>(data: DataProvider, table: string, id: string, check: () => void): Promise<T | null> {
  check(); const rows = await data.list<T>(table, { where: { tenant_id: tenant.id, id } }); check();
  if (rows.length > 1 || rows.some(r => r.id !== id || r.tenant_id !== tenant.id)) return fail('proof');
  return rows[0] ?? null;
}
async function owner(data: DataProvider, a: RetainedMonetaryGift, check: () => void) {
  const user = await exact<UserRow>(data, 'users', a.userId, check);
  if (!user || user.status !== 'active') fail('owner');
  check(); const assigned = await data.list<AssignedRole>('user_roles', { where: { tenant_id: tenant.id, user_id: a.userId } }); check();
  if (assigned.some(r => r.tenant_id !== tenant.id || r.user_id !== a.userId) || new Set(assigned.map(r => r.role)).size !== assigned.length
    || !assigned.some(r => r.role === a.role || r.role === 'super_admin')) fail('owner');
}
/** Mock-only final point-in-time read: no await between current user/roles and returning or releasing the marker. */
function currentOwner(data: DataProvider, a: RetainedMonetaryGift, check: () => void) {
  check(); if (!data.peek) return fail('context');
  const users = data.peek<UserRow>('users', { where: { tenant_id: tenant.id, id: a.userId } });
  const assigned = data.peek<AssignedRole>('user_roles', { where: { tenant_id: tenant.id, user_id: a.userId } });
  if (!users || !assigned) return fail('context');
  if (users.length !== 1 || users[0].tenant_id !== tenant.id || users[0].id !== a.userId || users[0].status !== 'active'
    || assigned.some(r => r.tenant_id !== tenant.id || r.user_id !== a.userId) || new Set(assigned.map(r => r.role)).size !== assigned.length
    || !assigned.some(r => r.role === a.role || r.role === 'super_admin')) return fail('owner');
  check();
}
async function finalOwner(data: DataProvider, a: RetainedMonetaryGift, check: () => void) {
  await owner(data, a, check); currentOwner(data, a, check);
}
async function recover(data: DataProvider, a: RetainedMonetaryGift, check: () => void): Promise<RetainedMonetaryGiftResult | null> {
  await owner(data, a, check);
  const receiptId = `mock_transaction_${transactionKey(a)}`, receipt = await exact<BaseRow>(data, 'audit_log', receiptId, check);
  if (!receipt) {
    if (a.paymentId && await exact<PaymentRow>(data, 'payments', a.paymentId, check) || a.giftId && await exact<MonetaryGiftDraft>(data, 'gift_cards', a.giftId, check)) fail('proof');
    await finalOwner(data, a, check);
    return null; // Both precommit candidate IDs are absent: retry the same intent, never guess from amounts or timestamps.
  }
  const cached = (receipt.diff as { result?: RetainedMonetaryGiftResult } | null)?.result;
  if (receipt.action !== 'mock.transaction' || receipt.entity !== 'mock' || receipt.entity_id !== receiptId || !cached
    || cached.attemptId !== a.id || cached.tenantId !== a.tenantId || cached.userId !== a.userId || cached.role !== a.role
    || !same(cached.quote, a.quote) || cached.recipientName !== a.recipientName || cached.recipientContact !== a.recipientContact || cached.deliveryDate !== a.deliveryDate
    || !['approved', 'declined'].includes(cached.status) || !text(cached.payment?.id) || cached.payment.id !== a.paymentId) return fail('proof');
  const payment = await exact<PaymentRow>(data, 'payments', cached.payment.id, check);
  if (!payment || !same(payment, cached.payment) || payment.user_id !== a.userId || payment.plan_id !== a.quote.planId || payment.status !== cached.status
    || payment.method !== 'card' || payment.provider !== 'wompi' || payment.amount !== a.quote.chargedAmount || !same(readPaymentQuote(payment), a.quote)
    || cached.status === 'approved' && (!readLaunchReceipt(payment) || payment.amount_paid !== payment.amount)
    || cached.status === 'declined' && payment.amount_paid !== null) return fail('proof');
  let gift: MonetaryGiftDraft | null = null;
  if (cached.status === 'approved') {
    if (!a.giftId || !cached.gift || cached.gift.id !== a.giftId) return fail('proof');
    gift = await exact<MonetaryGiftDraft>(data, 'gift_cards', a.giftId, check);
    if (!gift || !same(gift, cached.gift) || gift.buyer_user_id !== a.userId || gift.recipient_name !== a.recipientName || gift.recipient_contact !== a.recipientContact
      || gift.amount !== a.quote.chargedAmount || gift.balance !== gift.amount || gift.status !== 'draft' || gift.redeemed_by !== null
      || gift.deliver_at !== atStudioTime(fromDateKey(a.deliveryDate), 8).toISOString() || !same(gift.frontend_quote, a.quote)) return fail('proof');
    check(); const codes = await data.list<MonetaryGiftDraft>('gift_cards', { where: { tenant_id: tenant.id, code: gift.code } }); check();
    if (codes.length !== 1 || codes[0].id !== gift.id || codes[0].buyer_user_id !== a.userId) return fail('proof');
  } else if (cached.gift !== null || a.giftId !== undefined) return fail('proof');
  await finalOwner(data, a, check); return structuredClone({ ...cached, payment, gift });
}
export async function recoverRetainedMonetaryGift(data: DataProvider, input: RetainedMonetaryGift, control: MonetaryGiftControl) {
  const a = retained(input), check = checker(data, a, control); check();
  const result = await recover(data, a, check); check(); retained(a); currentOwner(data, a, check); return result;
}
export async function executeRetainedMonetaryGift(data: DataProvider, input: RetainedMonetaryGift, control: MonetaryGiftControl & { ivaRate: number; simulate?: 'approved' | 'declined' }): Promise<RetainedMonetaryGiftResult> {
  const a = retained(input), check = checker(data, a, control); check();
  if (!data.atomic || !Number.isFinite(control.ivaRate) || control.ivaRate < 0 || control.ivaRate > 1) return fail('context');
  const previous = await recover(data, a, check); check(); currentOwner(data, a, check); if (previous) return previous;
  await data.atomic(async staged => {
    const tx = new Proxy({} as DataProvider, { get(_target, key) { const v = Reflect.get(staged, key); return typeof v === 'function' ? (...args: unknown[]) => { check(); const r = v.apply(staged, args); if (r instanceof Promise) return r.then(value => { check(); return value; }); check(); return r; } : v; } });
    const current = retained(a); await owner(tx, current, check); await checkSaleQuote(tx, current.quote); check();
    if (current.deliveryDate < quotePurchaseDate()) return fail('invalid');
    const response = await wompiCheckout({ amount: current.quote.chargedAmount, method: 'card', simulate: control.simulate }); check();
    const payment = await recordPayment(tx, { userId: current.userId, planId: current.quote.planId, amount: current.quote.chargedAmount, method: 'card', result: response, ivaRate: control.ivaRate, quote: current.quote }); check();
    const gift = response.status === 'approved' ? await tx.insert<MonetaryGiftDraft>('gift_cards', { code: `${tenant.invoicePrefix}-REGALO-DEMO-${payment.id}`, buyer_user_id: current.userId, recipient_name: current.recipientName, recipient_contact: current.recipientContact, amount: current.quote.chargedAmount, balance: current.quote.chargedAmount, deliver_at: atStudioTime(fromDateKey(current.deliveryDate), 8).toISOString(), redeemed_by: null, status: 'draft', frontend_quote: structuredClone(current.quote) }) : null;
    check(); retained(current); store({ ...intent(current), paymentId: payment.id, ...(gift ? { giftId: gift.id } : {}) }); check();
    return { attemptId: current.id, tenantId: current.tenantId, userId: current.userId, role: current.role, quote: current.quote, recipientName: current.recipientName, recipientContact: current.recipientContact, deliveryDate: current.deliveryDate, payment, gift, status: response.status } satisfies RetainedMonetaryGiftResult;
  }, { idempotencyKey: transactionKey(a) });
  check(); const result = await recover(data, retained(a), check); check(); if (!result) return fail('proof'); currentOwner(data, a, check); return result;
}
export async function acknowledgeRetainedMonetaryGift(data: DataProvider, input: RetainedMonetaryGift, result: RetainedMonetaryGiftResult, control: MonetaryGiftControl): Promise<void> {
  const a = retained(input), check = checker(data, a, control); check();
  if (!same(await recover(data, a, check), result)) return fail('proof');
  await finalOwner(data, a, check); retained(a); currentOwner(data, a, check); remove(a); check();
}
export async function discardRetainedMonetaryGift(data: DataProvider, input: RetainedMonetaryGift, control: MonetaryGiftControl): Promise<void> {
  const a = retained(input), check = checker(data, a, control); check();
  if (await recover(data, a, check)) return fail('committed');
  await finalOwner(data, a, check); if (!same(retained(a), a)) return fail('marker'); currentOwner(data, a, check); remove(a); check();
}
function remove(a: RetainedMonetaryGift) {
  try { localStorage.removeItem(storageKey(a.userId)); } catch { fail('storage'); }
  if (readRetainedMonetaryGift(a.userId) !== null) fail('storage');
}
