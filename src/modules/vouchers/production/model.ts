import type { BaseRow } from '../../../data/schema';
import type { DataProvider } from '../../../data/types';
import { addDaysKey, dateKey } from '../../../i18n/format';

/**
 * H-6 · vouchers on Company OS credits (production build). The server decides everything: the code, `uses`, expiry,
 * single use per person and the classes a redemption adds. The browser only builds the request, shows the result and
 * maps refusal codes to copy. No browser voucher rules (`src/data/vouchers.ts` is the review build's demo).
 *
 * The data seam is four tables (CompanyOSProvider, lane H-3, maps them):
 * - `vouchers`    ↔ `voucher` (credits), rows as Company OS sends them (kind, classes, valid_until, max_uses, code, uses…);
 * - `credit_lots` ↔ `credit_lot` (credits): a create with `{ person, voucher_code }` redeems;
 * - `plans`       ↔ `product` (payments): a gift product is `kind: gift` (frontend shape: family `regalos`);
 * - `payments`    ↔ `payment` (payments): the approved transfer of a gift product.
 */
export const VOUCHER_TABLE = 'vouchers';
export const LOT_TABLE = 'credit_lots';
export const PRODUCT_TABLE = 'plans';
export const PAYMENT_TABLE = 'payments';

export type VoucherKind = 'gift' | 'courtesy';
export interface CosVoucher extends BaseRow {
  kind: VoucherKind; product?: string | null; classes: number; valid_until?: string | null; max_uses?: number | null;
  recipient_email?: string | null; recipient_name?: string | null; buyer?: string | null; note?: string | null;
  code?: string | null; uses?: number | null; redeemed_by?: string | null; redeemed_at?: string | null;
}
export interface Recipient { name: string; email: string }
export interface GiftProduct { id: string; key: string; name: { es: string; en: string }; classes: number; price: number; validityDays: number | null }
export interface GiftPayment { id: string; person: string | null; product: string | null; status: string; notes: string; amount: number | null; date: string | null }

/** Company OS code: 8 characters, A–Z without I/O, 2–9. Redemption accepts any case. */
export const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
export const normalizeCode = (raw: string | null | undefined) => (raw ?? '').toUpperCase().replace(/[\s-]/g, '');
export const isCode = (raw: string | null | undefined) => CODE_RE.test(normalizeCode(raw));
/** The redemption link the gift and courtesy emails carry (`{{links.base}}/#/app/vouchers/{{record.code}}`). */
export const redeemPath = (code: string) => `/app/vouchers/${normalizeCode(code)}`;

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;
export const isEmail = (raw: string) => EMAIL_RE.test(raw.trim()) && raw.trim().length <= 254;

export const isCosVoucher = (row: unknown): row is CosVoucher => {
  const r = row as Partial<CosVoucher> | null;
  return !!r && (r.kind === 'gift' || r.kind === 'courtesy') && Number.isSafeInteger(r.classes);
};

/** Display only (the server refuses on its own): used up when `uses` reached `max_uses` (default 1), expired after `valid_until`. */
export type VoucherState = 'active' | 'used_up' | 'expired';
export function voucherState(v: CosVoucher, today: string): VoucherState {
  if ((v.uses ?? 0) >= (v.max_uses ?? 1)) return 'used_up';
  if (v.valid_until && v.valid_until < today) return 'expired';
  return 'active';
}

// ── refusal codes → copy ───────────────────────────────────────────────────────────────────────────────────────
export const VOUCHER_REFUSALS = ['voucher_invalid', 'voucher_expired', 'voucher_redeemed', 'voucher_used_up', 'invalid_quantity', 'lot_expired', 'forbidden', 'write_forbidden', 'idempotency_conflict'] as const;
/** The refusal code of a failed write, whatever the provider throws (`{ code }`, `{ error: { code } }` or an Error named by its code). */
export function refusalCode(error: unknown): string | null {
  const e = error as { code?: unknown; error?: { code?: unknown }; message?: unknown } | null;
  const code = typeof e?.code === 'string' ? e.code : typeof e?.error?.code === 'string' ? e.error.code : typeof e?.message === 'string' ? e.message : null;
  return code && /^[a-z][a-z0-9_]*$/.test(code) ? code : null;
}
export const refusalKey = (error: unknown) => {
  const code = refusalCode(error);
  return code && (VOUCHER_REFUSALS as readonly string[]).includes(code) ? `vouchers.cos.refusal.${code}` : 'vouchers.cos.refusal.generic';
};

// ── courtesy (BO-03) ───────────────────────────────────────────────────────────────────────────────────────────
export interface CourtesyForm { classes: string; validUntil: string; maxUses: string; name: string; email: string }
const whole = (raw: string) => /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
export function courtesyErrors(f: CourtesyForm, today: string): Partial<Record<keyof CourtesyForm, string>> {
  const e: Partial<Record<keyof CourtesyForm, string>> = {};
  const classes = whole(f.classes), uses = whole(f.maxUses);
  if (!Number.isSafeInteger(classes) || classes < 1 || classes > 100) e.classes = 'vouchers.cos.err.classes';
  if (!Number.isSafeInteger(uses) || uses < 1 || uses > 500) e.maxUses = 'vouchers.cos.err.maxUses';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.validUntil) || f.validUntil < today) e.validUntil = 'vouchers.cos.err.validUntil';
  if (f.name.trim().length < 2) e.name = 'vouchers.cos.err.name';
  if (!isEmail(f.email)) e.email = 'vouchers.cos.err.email';
  return e;
}
/** Exactly the Company OS fields: no value in pesos, attendee cap, booking scope or restore-on-cancel. */
export const courtesyBody = (f: CourtesyForm) => ({
  kind: 'courtesy' as const, classes: whole(f.classes), valid_until: f.validUntil, max_uses: whole(f.maxUses),
  recipient_name: f.name.trim(), recipient_email: f.email.trim().toLowerCase(),
});

// ── gift (BO-01, BO-02) ────────────────────────────────────────────────────────────────────────────────────────
/** The recipient travels on the pending payment's `notes` until the desk issues the voucher. */
export const GIFT_NOTE_PREFIX = 'gift-recipient:';
export const giftPaymentNotes = (r: Recipient) => `${GIFT_NOTE_PREFIX}${JSON.stringify({ name: r.name.trim(), email: r.email.trim().toLowerCase() })}`;
export function parseGiftNotes(notes: string | null | undefined): Recipient | null {
  const line = (notes ?? '').split('\n').find((l) => l.startsWith(GIFT_NOTE_PREFIX));
  if (!line) return null;
  try {
    const v = JSON.parse(line.slice(GIFT_NOTE_PREFIX.length)) as Partial<Recipient>;
    return typeof v.name === 'string' && typeof v.email === 'string' ? { name: v.name, email: v.email } : null;
  } catch { return null; }
}
/** The voucher's `note` names the payment it was issued for, so a payment issues one gift voucher. */
export const giftVoucherNote = (paymentId: string) => `payment:${paymentId}`;
/** Where the buyer pays by transfer: lane H-5's pay screen, by product `key`. `paymentNotes` goes in the router state and
 * H-5 writes it into the pending payment's `notes` (a string of at most 1000 characters starting with `gift-recipient:`). */
export const giftCheckoutPath = (productKey: string) => `/app/pay/product/${encodeURIComponent(productKey)}`;

type Loose = Record<string, unknown>;
/** A raw Company OS record (`{ id, data: { … } }`) or an already flat row, as one flat row. */
const flat = (r: Loose): Loose => (r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? { ...(r.data as Loose), id: r.id, created_at: r.created_at ?? (r.data as Loose).created_at } : r);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Gift products for sale. Reads the Company OS shape (`kind`, `credits`) or the frontend `plans` shape (`family`, `classes`). */
export function giftProducts(rows: Loose[]): GiftProduct[] {
  return rows.map(flat).flatMap((r) => {
    const gift = r.kind === 'gift' || r.family === 'regalos';
    const classes = num(r.credits) ?? num(r.classes);
    const price = num(r.price);
    if (!gift || r.active === false || !classes || classes < 1 || price == null || typeof r.id !== 'string') return [];
    const es = str(r.name_es) ?? str(r.name) ?? '', en = str(r.name_en) ?? es;
    return [{ id: r.id, key: str(r.key) ?? str(r.slug) ?? r.id, name: { es, en }, classes, price, validityDays: num(r.validity_days) }];
  });
}
export function giftPayment(row: Loose): GiftPayment | null {
  const r = flat(row);
  if (typeof r.id !== 'string') return null;
  return {
    id: r.id, person: str(r.person) ?? str(r.user_id), product: str(r.product) ?? str(r.plan_id), status: str(r.status) ?? '',
    notes: str(r.notes) ?? str(r.note) ?? '', amount: num(r.amount), date: str(r.date) ?? str(r.paid_at) ?? str(r.created_at),
  };
}
/** Approved payments of a gift product that have no voucher yet: the desk issues these (BO-02). */
export function giftsToIssue(payments: Loose[], products: GiftProduct[], vouchers: CosVoucher[]): { payment: GiftPayment; product: GiftProduct; recipient: Recipient | null }[] {
  const issued = new Set(vouchers.map((v) => v.note).filter(Boolean));
  return payments.flatMap((row) => {
    const payment = giftPayment(row);
    const product = payment && products.find((p) => p.id === payment.product);
    if (!payment || !product || payment.status !== 'approved' || issued.has(giftVoucherNote(payment.id))) return [];
    return [{ payment, product, recipient: parseGiftNotes(payment.notes) }];
  });
}
/** Default last valid day: the product's validity from today (`validity_days`, counting today), else no end. */
export const giftValidUntil = (product: GiftProduct, today: string, addDaysKey: (key: string, n: number) => string) =>
  product.validityDays && product.validityDays > 0 ? addDaysKey(today, product.validityDays - 1) : '';
export const giftBody = (payment: GiftPayment, product: GiftProduct, recipient: Recipient, validUntil: string) => ({
  kind: 'gift' as const, product: product.id, classes: product.classes, max_uses: 1,
  ...(validUntil ? { valid_until: validUntil } : {}),
  recipient_name: recipient.name.trim(), recipient_email: recipient.email.trim().toLowerCase(),
  ...(payment.person ? { buyer: payment.person } : {}), note: giftVoucherNote(payment.id),
});

/** Lane H-5's `/batch` operation (`src/modules/transfers/launch/cos.ts`), restated so this file doesn't import another lane's. */
export interface VoucherBatchOp { op: 'create'; entity: 'voucher'; data: Record<string, unknown> }
/**
 * BO-02 inside the approval: H-5 appends these ops to the batch that approves a gift product's payment (and to the desk
 * sale), so the money and the voucher commit together under one Idempotency-Key. No ops when the product isn't a gift or
 * the payment carries no recipient (the desk then issues it from M-13/S-08). Status isn't checked: the batch approves it.
 * Rows may be raw Company OS records (`{ id, data }`): H-5 registers it with `registerApprovalOps(giftVoucherOps)`.
 */
export function giftVoucherOps(payment: Loose, product: Loose, today: string = dateKey()): VoucherBatchOp[] {
  const p = giftPayment(payment), g = giftProducts([product])[0], r = p && parseGiftNotes(p.notes);
  if (!p || !g || !r || !isEmail(r.email) || r.name.trim().length < 2) return [];
  return [{ op: 'create', entity: 'voucher', data: giftBody(p, g, r, giftValidUntil(g, today, addDaysKey)) }];
}

// ── writes ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** One create with an `Idempotency-Key` (one key per submit, reused on retry): `atomic` is the provider's keyed write. */
export function keyedInsert<T extends BaseRow>(data: DataProvider, table: string, body: Loose, idempotencyKey: string): Promise<T> {
  return data.atomic ? data.atomic((d) => d.insert<T>(table, body as Partial<T>), { idempotencyKey }) : data.insert<T>(table, body as Partial<T>);
}
export const createVoucher = (data: DataProvider, body: Loose, key: string) => keyedInsert<CosVoucher>(data, VOUCHER_TABLE, body, key);
/** BO-02 for lane H-5: call right after approving a gift product's payment; the voucher's create sends the recipient's email. */
export const issueGiftVoucher = (data: DataProvider, payment: GiftPayment, product: GiftProduct, recipient: Recipient, validUntil: string, key: string) =>
  createVoucher(data, giftBody(payment, product, recipient, validUntil), key);

export interface RedeemedLot extends BaseRow { quantity?: number; valid_until?: string | null; source?: string }
/** BO-04: a `credit_lot` create with the person and the code; the voucher decides the classes and the expiry. */
export const redeemVoucher = (data: DataProvider, person: string, code: string, key: string) =>
  keyedInsert<RedeemedLot>(data, LOT_TABLE, { person, voucher_code: normalizeCode(code) }, key);
