import type { BookingRow, PaymentRow } from '../../../data/schema';
import type { DataProvider } from '../../../data/types';
import { batch, errorCode, ref, type BatchOp, type CosRequest } from './wire';

/**
 * H-7 · the front desk's writes (RC-02, RC-04, RC-05, RC-10, J1c). Two implementations behind one interface:
 *
 * - **server** (production): plain Company OS writes. The server decides capacity, the last spot, one class a day,
 *   balance, expiry, freeze, undo eligibility (`allow_undo_check_in`) and price; a refusal comes back as its code.
 *   Every multi-record write is one `/batch` with the action's `Idempotency-Key`.
 * - **review** (MockProvider): the existing browser commands, unchanged (fictional demo).
 */
export type AttendanceTo = 'checked_in' | 'no_show' | 'booked';
export type DeskMethod = 'cash' | 'card_terminal' | 'transfer';
export interface NewPerson { name: string; phone: string; email?: string }
export interface DeskConsent { policy: string; version: string }

/**
 * The documents a walk-in accepts verbally at the desk (RC-05): the same policies and versions as self sign-up
 * (the recipe's people `signup_consents`, `terms@2026-10-01,privacy@2026-10-01`, still TODO-confirm with Jas).
 * Change both together.
 */
export const DESK_CONSENTS: readonly DeskConsent[] = [{ policy: 'terms', version: '2026-10-01' }, { policy: 'privacy', version: '2026-10-01' }];

export interface DeskCommands {
  readonly kind: 'server' | 'review';
  /** RC-02 · Arrived, No-show, or undo (back to booked) with a reason. */
  attendance(input: { booking: BookingRow; to: AttendanceTo; reason?: string; key: string }): Promise<void>;
  /** RC-04 / RC-05 · book an existing customer from their package; `checkIn` also marks them arrived. */
  book(input: { personId: string; sessionId: string; checkIn: boolean; key: string }): Promise<{ bookingId: string; checkInError?: string }>;
  /** RC-05 / RC-10 · sell at the desk (registering a new person with verbal consent), and optionally book and check in. */
  sell?(input: SaleInput): Promise<SaleResult>;
  /** J1c · approve a pending payment (the money is here) and check the held booking in, in one transaction. */
  approveAndCheckIn?(input: { paymentId: string; bookingId: string; amountReceived: number; price: number; reason?: string; key: string }): Promise<void>;
}

export interface SaleInput {
  person: { id: string } | { new: NewPerson; consents: readonly DeskConsent[] };
  productId: string;
  /** The product's price (the quote). */
  price: number;
  /** What the desk received; a difference needs `reason` (server: `price_override_reason`, else `amount_mismatch`). */
  amountReceived: number;
  reason?: string;
  method: DeskMethod;
  /** What the payment is for (payments requires a concept): the product's name. */
  concept: string;
  /** The bank reference of a transfer (payments `methods_requiring_reference`). */
  reference?: string;
  /** The studio day the action was started on, fixed per action so a retry sends the same body. */
  today: string;
  /** Book the customer into this class with the classes just bought; `checkIn` marks them arrived too. */
  sessionId?: string;
  checkIn?: boolean;
  key: string;
}
/** `checkInError`: the sale and booking are saved but the arrival was not (mark it on Check-in); never re-sell. */
export interface SaleResult { personId: string; paymentId: string; bookingId: string | null; checkedIn: boolean; checkInError?: string }

/** Thrown when a reason is required by the desk's rule (undo, or an amount that differs) before anything is sent. */
export const REASON_REQUIRED = 'reason_required';

/** The batch for a desk sale. Exported for the named tests: the order is the contract (the approved payment issues the
 * lot before the credit booking spends it; rules see earlier ops' writes). */
export function saleOps(input: SaleInput): BatchOp[] {
  const today = input.today;
  const ops: BatchOp[] = [];
  let person: unknown;
  if ('new' in input.person) {
    const p = input.person.new;
    ops.push({ op: 'create', entity: 'person', data: { name: p.name.trim(), phone: p.phone.trim(), whatsapp: p.phone.trim(), ...(p.email?.trim() ? { email: p.email.trim().toLowerCase() } : {}) } });
    person = ref(0);
    ops.push({ op: 'create', entity: 'member', data: { person, source: 'desk', status: 'active', joined_at: today } });
    // Verbal consent at the desk (RC-05): one acceptance per document, the same records self sign-up writes.
    for (const c of input.person.consents) ops.push({ op: 'create', entity: 'policy_acceptance', data: { person, policy: c.policy, version: c.version } });
  } else person = input.person.id;
  const differs = input.amountReceived !== input.price;
  ops.push({ op: 'create', entity: 'payment', data: { person, product: input.productId, date: today, amount: input.amountReceived, concept: input.concept.trim(), method: input.method, provider: 'manual', status: 'approved', ...(input.reference?.trim() ? { reference: input.reference.trim() } : {}), ...(differs ? { price_override_reason: input.reason!.trim() } : {}) } });
  if (input.sessionId) ops.push({ op: 'create', entity: 'booking', data: { occurrence: input.sessionId, person, entitlement: 'credit', source: 'desk' } });
  return ops;
}

const needsReason = (amountReceived: number, price: number, reason?: string) => amountReceived !== price && !reason?.trim();

/**
 * Production commands. Booking and payment writes go through the provider (frontend table names, mapped by the
 * Company OS provider, which refetches the screens after its own writes); `atomic` is one `/batch` with the action's
 * key. Only the sale uses a raw `/batch`, because a walk-in's person is created with its name, member facet and
 * consents in the same transaction, which the table mapping can't express.
 */
export function serverDesk(data: DataProvider, request: CosRequest): DeskCommands {
  const atomic = <T>(fn: (tx: DataProvider) => Promise<T>, key: string) => {
    if (!data.atomic) throw new Error('disconnected');
    return data.atomic(fn, { idempotencyKey: key });
  };
  /** The arrival after a saved booking: a failure is returned, not thrown, so the screen never sells or books again. */
  const arrive = async (bookingId: string): Promise<{ checkInError?: string }> => {
    try { await data.update<BookingRow>('bookings', bookingId, { status: 'checked_in' }); return {}; }
    catch (e) { return { checkInError: errorCode(e) }; }
  };
  return {
    kind: 'server',
    async attendance({ booking, to, reason }) {
      if (to === 'booked') {
        if (!reason?.trim()) throw new Error(REASON_REQUIRED);
        await data.update<BookingRow>('bookings', booking.id, { status: 'booked', reason: reason.trim() } as Partial<BookingRow>);
      } else await data.update<BookingRow>('bookings', booking.id, { status: to });
    },
    async book({ personId, sessionId, checkIn, key }) {
      const b = await atomic(tx => tx.insert<BookingRow>('bookings', { user_id: personId, session_id: sessionId, paid_with: 'package', source: 'desk' } as Partial<BookingRow>), key);
      // A booking is created `booked`; arriving is the next move. If this second write fails the person is booked
      // (the roster shows them under Expected with the Arrived button), never charged twice.
      return { bookingId: b.id, ...(checkIn ? await arrive(b.id) : {}) };
    },
    async sell(input) {
      if (needsReason(input.amountReceived, input.price, input.reason)) throw new Error(REASON_REQUIRED);
      const ops = saleOps(input);
      const ids = await batch(request, ops, input.key);
      const personId = 'new' in input.person ? ids[0] : input.person.id;
      const paymentId = ids['new' in input.person ? 2 + input.person.consents.length : 0];
      const bookingId = input.sessionId ? ids[ids.length - 1] : null;
      // Through the provider, so the roster and the home figures refetch.
      const arrival = bookingId && input.checkIn ? await arrive(bookingId) : null;
      return { personId, paymentId, bookingId, checkedIn: !!arrival && !arrival.checkInError, ...(arrival?.checkInError ? { checkInError: arrival.checkInError } : {}) };
    },
    async approveAndCheckIn(input) {
      if (needsReason(input.amountReceived, input.price, input.reason)) throw new Error(REASON_REQUIRED);
      // J1c: approve first (it confirms the held booking), then check in — one batch, so the door never half-applies.
      await atomic(async tx => {
        await tx.update<PaymentRow>('payments', input.paymentId, { status: 'approved', amount_paid: input.amountReceived, ...(input.amountReceived !== input.price ? { price_override_reason: input.reason!.trim() } : {}) } as Partial<PaymentRow>);
        await tx.update<BookingRow>('bookings', input.bookingId, { status: 'checked_in' });
      }, input.key);
    },
  };
}
