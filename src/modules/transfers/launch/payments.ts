import { reportCsv } from '../../../data/reportCsv';
import type { ProductRow } from '../../products/launch/productMaster';
import { batch, CosError, type BatchOp, type CosPort, type CosRecord } from './cos';

/**
 * PG-01 … PG-10 on Company OS (payments 2.6.0, bookings 1.4.0, files). The server decides prices, holds, receipt
 * numbers and what an approval activates; these helpers only build the writes and read the results.
 */
export type PayMethod = 'transfer' | 'cash' | 'card_terminal';
export const DESK_METHODS: PayMethod[] = ['cash', 'card_terminal', 'transfer'];
export interface PaymentData {
  person?: string | null; product?: string | null; amount: number; method?: string | null; status?: 'pending' | 'approved' | 'declined' | 'refunded' | 'voided';
  date?: string; concept?: string | null; reference?: string | null; provider?: string | null; notes?: string | null;
  for_entity?: string | null; for_id?: string | null; price_override_reason?: string | null;
  /** Set by the server when the payment is approved (payments 2.7.0, CO-6): who approved it and when. */
  approved_by?: string | null; approved_at?: string | null;
}
export type PaymentRec = CosRecord<PaymentData>;
export interface BookingData { person?: string; occurrence?: string; status?: string; entitlement?: string; payment_method?: string | null; hold_until?: string | null; hold_frozen_at?: string | null; hold_left_minutes?: number | null; policy_hold_minutes?: number | null; start?: string | null }
export type BookingRec = CosRecord<BookingData>;
export interface FileData { owner_entity?: string; owner_id?: string; kind?: string; status?: string; mime?: string }
export type FileRec = CosRecord<FileData>;
export interface InvoiceData { kind?: string; number?: number; payment?: string; person?: string; product?: string; total?: number; issued_at?: string }
export type InvoiceRec = CosRecord<InvoiceData>;

// ── PG-02 · receipt image ────────────────────────────────────────────────────────────────────────────────────
export const RECEIPT_TYPES = ['image/png', 'image/jpeg'] as const;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
/** Checks the declared type, the size and the first bytes, as the server will on confirm. */
export function checkReceipt(file: { type: string; size: number }, head: Uint8Array): string | null {
  if (!(RECEIPT_TYPES as readonly string[]).includes(file.type)) return 'file_type_not_allowed';
  if (file.size <= 0 || file.size > MAX_RECEIPT_BYTES) return 'file_too_large';
  const png = head.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b);
  const jpg = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (file.type === 'image/png' ? !png : !jpg) return 'file_type_not_allowed';
  return null;
}

/** Upload link → bytes → confirm. A refused confirm deletes the record; the customer simply picks the file again. */
export async function uploadReceipt(cos: CosPort, paymentId: string, file: File, put: typeof fetch = fetch): Promise<FileRec> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const problem = checkReceipt(file, head);
  if (problem) throw new CosError(problem, 422);
  // The provider's own upload (H-3: link, PUT and confirm) when it has one; the same three steps here otherwise.
  if (cos.uploadFile) return cos.uploadFile({ ownerEntity: 'payment', ownerId: paymentId, kind: 'receipt', file }) as Promise<FileRec>;
  const created = await cos.request<{ file: FileRec; uploadUrl: string }>('POST', '/files', { ownerEntity: 'payment', ownerId: paymentId, kind: 'receipt', filename: safeName(file.name, file.type), mime: file.type, sizeBytes: file.size });
  const res = await put(created.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new CosError('storage_unavailable', res.status);
  const confirmed = await cos.request<{ file: FileRec }>('POST', `/files/${encodeURIComponent(created.file.id)}/confirm`);
  return confirmed.file;
}
const safeName = (name: string, type: string) => (name.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'comprobante') + (/\.(png|jpe?g)$/i.test(name) ? '' : type === 'image/png' ? '.png' : '.jpg');

// ── PG-01 / PG-02 · customer pays by transfer ────────────────────────────────────────────────────────────────
export interface TransferInput { person: string; product: ProductRow; today: string; reference: string; booking?: string | null; concept: string; notes?: string | null }
/** H-6: a gift purchase carries its recipient as `gift-recipient:{…}` in the pending payment's notes; nothing else is accepted. */
export const giftNotes = (v: unknown): string | null => (typeof v === 'string' && v.length <= 1000 && v.startsWith('gift-recipient:') ? v : null);
/** The pending payment the receipt hangs on. For a held booking it freezes the hold (bookings 1.4.0). */
export function transferOps(i: TransferInput): BatchOp[] {
  if (i.product.data.kind === 'private') throw new CosError('product_inactive');
  return [{ op: 'create', entity: 'payment', data: {
    person: i.person, product: i.product.id, amount: i.product.data.price, method: 'transfer', provider: 'manual', status: 'pending',
    date: i.today, concept: i.concept.slice(0, 200), reference: i.reference.trim().slice(0, 120) || 'comprobante',
    ...(i.booking ? { for_entity: 'booking', for_id: i.booking } : {}), ...(giftNotes(i.notes) ? { notes: i.notes } : {}),
  } }];
}

// ── PG-04 · confirm or reject ────────────────────────────────────────────────────────────────────────────────
export interface ReviewInput { payment: PaymentRec; product: ProductRow | null; decision: 'approve' | 'decline'; amountReceived: number; reason: string; checkInBooking?: string | null }

/**
 * Writes that must land in the same batch as an approval, e.g. the gift voucher a gift payment buys (H-6's
 * `giftVoucherOps`). Registered at boot so this lane never imports another lane's file; each returns [] when it doesn't apply.
 */
export type ApprovalExtra = (payment: PaymentRec, product: ProductRow | null) => BatchOp[];
const approvalExtras: ApprovalExtra[] = [];
export function registerApprovalOps(fn: ApprovalExtra): () => void {
  approvalExtras.push(fn);
  return () => { const i = approvalExtras.indexOf(fn); if (i >= 0) approvalExtras.splice(i, 1); };
}
/** Returns the ops, or throws `invalid_amount` / `reason_required`. A different amount needs a new reason (`amount_mismatch` override). */
export function reviewOps(i: ReviewInput): BatchOp[] {
  const reason = i.reason.trim();
  const guard = { field: 'status', value: 'pending' };
  if (i.decision === 'decline') {
    if (reason.length < 3) throw new CosError('reason_required');
    return [{ op: 'update', entity: 'payment', id: i.payment.id, data: { status: 'declined', notes: reason.slice(0, 500) }, ifMatch: guard }];
  }
  if (!Number.isSafeInteger(i.amountReceived) || i.amountReceived <= 0) throw new CosError('invalid_amount');
  const differs = !!i.product && i.amountReceived !== i.product.data.price;
  if (differs && (reason.length < 3 || reason === (i.payment.data.price_override_reason ?? '').trim())) throw new CosError('reason_required');
  const ops: BatchOp[] = [{ op: 'update', entity: 'payment', id: i.payment.id, ifMatch: guard, data: {
    status: 'approved', amount: i.amountReceived, ...(differs ? { price_override_reason: reason.slice(0, 500) } : {}),
  } }];
  // One transaction with the approval: a voucher can't be missing from an approved gift payment.
  const approved: PaymentRec = { ...i.payment, data: { ...i.payment.data, status: 'approved', amount: i.amountReceived } };
  for (const extra of approvalExtras) ops.push(...extra(approved, i.product).filter((op) => op.op === 'create'));
  // At the door: approve, then check in, in one batch (the payment first, bookings 1.4.0).
  if (i.checkInBooking) ops.push({ op: 'update', entity: 'booking', id: i.checkInBooking, data: { status: 'checked_in' } });
  return ops;
}
export const amountDiffers = (product: ProductRow | null, amount: number) => !!product && Number.isFinite(amount) && amount !== product.data.price;

// ── PG-07 · the desk takes the money ─────────────────────────────────────────────────────────────────────────
export interface DeskInput { person: string; product: ProductRow; amount: number; method: PayMethod; reference: string; reason: string; today: string; booking?: string | null; concept: string }
export function deskOps(i: DeskInput): BatchOp[] {
  if (!DESK_METHODS.includes(i.method)) throw new CosError('invalid_method');
  if (!Number.isSafeInteger(i.amount) || i.amount <= 0) throw new CosError('invalid_amount');
  const ref = i.reference.trim();
  if (i.method !== 'cash' && !ref) throw new CosError('reference_required');
  const reason = i.reason.trim();
  const differs = i.amount !== i.product.data.price;
  if (differs && reason.length < 3) throw new CosError('reason_required');
  return [{ op: 'create', entity: 'payment', data: {
    person: i.person, product: i.product.id, amount: i.amount, method: i.method, provider: 'manual', status: 'approved', date: i.today,
    concept: i.concept.slice(0, 200), ...(ref ? { reference: ref.slice(0, 120) } : {}), ...(differs ? { price_override_reason: reason.slice(0, 500) } : {}),
    ...(i.booking ? { for_entity: 'booking', for_id: i.booking } : {}),
  } }];
}

/** Runs ops as one batch with the action's key; returns the first op's id (the payment). */
export async function runPaymentOps(cos: CosPort, ops: BatchOp[], key: string): Promise<string> {
  const ids = await batch(cos, ops, key);
  return ids[0];
}

// ── PG-05 · pending list ─────────────────────────────────────────────────────────────────────────────────────
export interface PendingItem {
  id: string; kind: 'receipt' | 'desk_hold'; payment: PaymentRec | null; booking: BookingRec | null; person: string | null;
  product: ProductRow | null; amount: number | null; receipt: FileRec | null; createdAt: string | null;
  /** `frozen`: receipt sent, the hold waits for reception. `waiting`: the clock runs. `none`: a purchase without a place. */
  clock: { state: 'frozen'; minutesLeft: number | null } | { state: 'waiting'; until: string; msLeft: number } | { state: 'expired' } | { state: 'none' };
}
export function holdClock(b: BookingRec | null, now: number): PendingItem['clock'] {
  if (!b || b.data.status !== 'held') return { state: 'none' };
  if (b.data.hold_frozen_at) return { state: 'frozen', minutesLeft: typeof b.data.hold_left_minutes === 'number' ? b.data.hold_left_minutes : null };
  const until = b.data.hold_until ? Date.parse(b.data.hold_until) : NaN;
  if (!Number.isFinite(until)) return { state: 'none' };
  return until <= now ? { state: 'expired' } : { state: 'waiting', until: b.data.hold_until!, msLeft: until - now };
}
export function pendingItems(input: { payments: PaymentRec[]; bookings: BookingRec[]; files: FileRec[]; products: ProductRow[] }, now: number): PendingItem[] {
  const items: PendingItem[] = [];
  const bookingOf = (p: PaymentRec) => (p.data.for_entity === 'booking' ? input.bookings.find((b) => b.id === p.data.for_id) ?? null : null);
  const paid = new Set<string>();
  for (const p of input.payments) {
    if (p.data.status !== 'pending') continue;
    const booking = bookingOf(p);
    if (booking) paid.add(booking.id);
    const receipt = input.files.filter((f) => f.data.owner_entity === 'payment' && f.data.owner_id === p.id && f.data.kind === 'receipt' && f.data.status === 'ready')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0] ?? null;
    items.push({ id: `payment:${p.id}`, kind: 'receipt', payment: p, booking, person: p.data.person ?? null, product: input.products.find((r) => r.id === p.data.product) ?? null,
      amount: Number.isFinite(p.data.amount) ? p.data.amount : null, receipt, createdAt: p.createdAt ?? null, clock: holdClock(booking, now) });
  }
  for (const b of input.bookings) {
    if (b.data.status !== 'held' || b.data.payment_method !== 'desk' || paid.has(b.id)) continue;
    items.push({ id: `booking:${b.id}`, kind: 'desk_hold', payment: null, booking: b, person: b.data.person ?? null, product: null, amount: null, receipt: null, createdAt: b.createdAt ?? null, clock: holdClock(b, now) });
  }
  // Soonest deadline first; frozen receipts (waiting for reception) next; purchases without a place last.
  const rank = (i: PendingItem) => (i.clock.state === 'waiting' ? i.clock.msLeft : i.clock.state === 'frozen' ? 1e13 : i.clock.state === 'expired' ? 2e13 : 3e13);
  return items.sort((a, b) => rank(a) - rank(b) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

// ── PG-10 · confirmed payments report ────────────────────────────────────────────────────────────────────────
export const REPORT_COLUMNS = ['fecha', 'nota_de_compra', 'cliente', 'producto', 'metodo', 'valor_cop', 'referencia', 'registrado_por', 'confirmado_por', 'nota_diferencia', 'payment_id'];
export interface ReportInput { payments: PaymentRec[]; invoices: InvoiceRec[]; products: ProductRow[]; people: Map<string, string>; members: Map<string, string>; from: string; to: string; methodLabel: (m: string) => string }
export function paymentsReport(i: ReportInput): { rows: (string | number)[][]; total: number; csv: string } {
  const rows = i.payments
    .filter((p) => p.data.status === 'approved' && typeof p.data.date === 'string' && p.data.date >= i.from && p.data.date <= i.to)
    .sort((a, b) => a.data.date!.localeCompare(b.data.date!) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id))
    .map((p) => {
      const invoice = i.invoices.find((v) => v.data.payment === p.id);
      const product = i.products.find((r) => r.id === p.data.product);
      const recorder = p.createdBy ? i.members.get(p.createdBy) ?? p.createdBy : '';
      // Who confirmed = the server's `approved_by` (payments 2.7.0); before that lands, a desk payment's recorder, else blank.
      const confirmer = p.data.approved_by ? i.members.get(p.data.approved_by) ?? p.data.approved_by : p.data.method !== 'transfer' ? recorder : '';
      return [p.data.date!, invoice?.data.number ?? '', i.people.get(p.data.person ?? '') ?? '', product?.data.name ?? '', i.methodLabel(p.data.method ?? ''), p.data.amount,
        p.data.reference ?? '', recorder, confirmer, p.data.price_override_reason ?? '', p.id];
    });
  const total = rows.reduce((s, r) => s + (r[5] as number), 0);
  return { rows, total, csv: reportCsv(REPORT_COLUMNS, rows) };
}
