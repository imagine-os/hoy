import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { GIFT_PURCHASE_PATH } from '../../../config/launchRoutes';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatCOP, formatTime } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Card } from '../../../components/molecule/Card/Card';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { usePaymentInstructions } from '../../admin/usePaymentInstructions';
import { isAffiliateOnly, rowOnDay, type ProductData, type ProductRow } from '../../products/launch/productMaster';
import { batch, CosError, myPerson, queryAll, refusalKey, type CosPort } from './cos';
import { checkReceipt, giftNotes, RECEIPT_TYPES, transferOps, uploadReceipt, type BookingRec, type FileRec, type PaymentRec } from './payments';
import { useAction, useCos, useLoad } from './useCos';
import { holdView, safeCheckoutReturn, type HoldView, type ServerBookingRow } from '../../customer/booking/serverBooking';
import { useBookingPolicy, type BookingPolicy } from '../../customer/booking/bookingPolicy';

export interface PayView { person: string; product: ProductRow | null; booking: BookingRec | null; classStartsAt: string | null; pending: PaymentRec | null; pendingHasReceipt: boolean; affiliate: boolean | null }

/**
 * What the customer pays for: a held single-class booking (H-4 sends them here) or a product by key. The pending payment
 * resumed is this purchase's own: the booking's, or for a product one that pays for no booking and, for a gift, names the
 * same recipient (`notes`); any other pending payment never blocks a new purchase.
 */
export async function readPay(cos: CosPort, what: string, id: string, today: string, notes: string | null = null): Promise<PayView> {
  const person = await myPerson(cos);
  if (!person) throw new CosError('forbidden', 403);
  let booking: BookingRec | null = null, key = id, classStartsAt: string | null = null;
  if (what === 'booking') {
    booking = (await cos.request<{ data: BookingRec }>('GET', `/api/booking/${encodeURIComponent(id)}`)).data;
    key = 'single';
    // The class start tells a hold that ends with the class apart from one whose clock starts at the next opening.
    const occurrence = booking.data.occurrence;
    if (occurrence) classStartsAt = await cos.request<{ data: { data: { starts_at?: string | null } } }>('GET', `/api/occurrence/${encodeURIComponent(occurrence)}`)
      .then((r) => r.data.data.starts_at ?? null, () => null);
  } else if (what !== 'product') throw new CosError('for_record_not_found', 404);
  const rows = await queryAll<ProductData>(cos, { entity: 'product', filter: { field: 'key', op: 'eq', value: key } });
  const product = rowOnDay(rows, key, today);
  const scope = booking ? { field: 'for_id', op: 'eq' as const, value: booking.id } : rows.length ? { field: 'product', op: 'in' as const, value: rows.map((r) => r.id) } : null;
  const same = (p: PaymentRec) => booking ? true : !p.data.for_entity && (product?.data.kind !== 'gift' || (p.data.notes ?? null) === notes);
  const pending = scope ? (await queryAll<PaymentRec['data']>(cos, { entity: 'payment', filter: { and: [{ field: 'status', op: 'eq', value: 'pending' }, scope] } })).find(same) ?? null : null;
  // A payment whose image never arrived (upload failed, page closed) is resumed, not shown as "already sent".
  const pendingHasReceipt = !!pending && (await queryAll<FileRec['data']>(cos, { entity: 'file', filter: { and: [{ field: 'owner_entity', op: 'eq', value: 'payment' }, { field: 'owner_id', op: 'eq', value: pending.id }] } }))
    .some((f) => f.data.kind === 'receipt' && f.data.status === 'ready');
  let affiliate: boolean | null = null;
  if (product && isAffiliateOnly(product)) {
    const member = await cos.request<{ data: { data: { price_audience?: string | null } }[] }>('POST', '/query', { entity: 'member', filter: { field: 'person', op: 'eq', value: person.id }, limit: 1 });
    affiliate = member.data[0]?.data.price_audience === 'affiliate';
  }
  return { person: person.id, product, booking, classStartsAt, pending, pendingHasReceipt, affiliate };
}

/** The held booking's phase, as HoldBlock shows it (C-08): running now, from the next opening, until the class, or frozen. */
export function payHold(booking: BookingRec | null, classStartsAt: string | null, policy: BookingPolicy, now = Date.now()): HoldView | null {
  if (!booking) return null;
  const d = booking.data;
  const row = { status: d.status, payment_method: d.payment_method === 'desk' ? 'desk' : 'transfer', hold_until: d.hold_until ?? null, hold_frozen_at: d.hold_frozen_at ?? null, policy_hold_minutes: d.policy_hold_minutes ?? null } as unknown as ServerBookingRow;
  return holdView(row, classStartsAt ?? '', policy, now);
}

/** PG-01 / PG-02: amount, the club's account, QR and Bre-B key, then the receipt image on the same screen. */
export function TransferPayPage() {
  const { what = '', id = '' } = useParams();
  // A new route is a new payment: nothing (payment id, key, "sent") carries over from the previous one.
  return <PayScreen key={`${what}/${id}`} what={what} id={id} />;
}

function PayScreen({ what, id }: { what: string; id: string }) {
  // H-6's gift screen passes the recipient in router state; only a `gift-recipient:` note for a gift product is kept.
  const notes = giftNotes((useLocation().state as { paymentNotes?: unknown } | null)?.paymentNotes);
  // RS-03: a trial or package bought from a class's checkout keeps that class, to go back once the receipt is sent.
  const next = safeCheckoutReturn(useSearchParams()[0].get('next'));
  const { t, lang } = useI18n();
  const policy = useBookingPolicy();
  const cos = useCos();
  const today = dateKey();
  const { state, reload } = useLoad((c) => readPay(c, what, id, today, notes), [what, id, today, notes]);
  const pay = usePaymentInstructions();
  const action = useAction();
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // Once the payment exists, a retry only re-sends the image: it never creates a second payment.
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (state.status === 'loading') return <EmptyState tone="loading" title={t('payLaunch.loading')} />;
  if (state.status === 'error') return <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />;
  const v = state.value;
  if (!v.product) return <EmptyState title={t('payLaunch.pay.notFound')} />;
  const product = v.product;
  if (product.data.kind === 'private') return <Notice>{t('payLaunch.pay.private')}</Notice>;
  // A gift pays for a named recipient (H-6 passes it in router state); opened without one, it goes back to choose them.
  if (product.data.kind === 'gift' && !notes) return <Notice action={<Link to={GIFT_PURCHASE_PATH}><Button size="sm" variant="secondary">{t('payLaunch.pay.giftRecipient.cta')}</Button></Link>}>{t('payLaunch.pay.giftRecipient')}</Notice>;
  // The purchase still waits for reception: the link only goes back to the class, it does not promise the booking.
  const backToClass = next && !v.booking ? <Link to={next}><Button size="sm" variant="secondary">{t('payLaunch.pay.backToClass')}</Button></Link> : undefined;
  if (done) return <Notice tone="success" action={backToClass}>{t(v.booking ? 'payLaunch.pay.sent' : 'payLaunch.pay.sentProduct')}</Notice>;
  if (v.pending && v.pendingHasReceipt) return <Notice tone="success" action={backToClass}>{t('payLaunch.pay.alreadyPending')}</Notice>;
  const resumeId = paymentId ?? v.pending?.id ?? null;
  if (v.booking && v.booking.data.status !== 'held') return <Notice>{t('payLaunch.pay.notHeld')}</Notice>;
  // Display only: the server decides whether the hold still takes a receipt (`hold_expired`), so the form stays.
  const hold = v.booking?.data.hold_frozen_at || v.booking?.data.hold_until ? payHold(v.booking, v.classStartsAt, policy) : null;
  const at = (iso: string | null) => (iso ? formatTime(iso, lang) : '');
  const ins = pay.view?.values;

  const send = () => action.run(async (key) => {
    if (!cos) throw new CosError('disconnected');
    if (!file) return;
    // A file the server would refuse is refused before the payment exists: a pending payment freezes a hold.
    const problem = checkReceipt(file, new Uint8Array(await file.slice(0, 8).arrayBuffer()));
    if (problem) throw new CosError(problem, 422);
    const pid = resumeId ?? (await batch(cos, transferOps({ person: v.person, product, today, reference, booking: v.booking?.id ?? null, concept: product.data.name, notes: product.data.kind === 'gift' ? notes : null }), key))[0];
    setPaymentId(pid);
    await uploadReceipt(cos, pid, file);
    setDone(true);
  });

  return <div className="stack">
    <h1>{t('payLaunch.pay.title')}</h1>
    <Card>
      <div className="stack-sm">
        <span>{product.data.name}</span>
        <strong data-testid="amount-due">{t('payLaunch.pay.amount')}: {formatCOP(product.data.price, lang)}</strong>
        <span className="small">{t('payLaunch.pay.typeAmount')}</span>
      </div>
    </Card>
    {v.affiliate !== null && <Notice tone={v.affiliate ? 'success' : 'warn'}>{t(v.affiliate ? 'payLaunch.pay.affiliate.ok' : 'payLaunch.pay.affiliate.no')}</Notice>}
    {hold?.phase === 'waiting_reception' && <Notice>{t('payLaunch.pay.frozen')}</Notice>}
    {hold?.phase === 'expired' && <Notice tone="warn" title={t('customer.srv.hold.expired.title')}>{t('customer.srv.hold.expired.body')}</Notice>}
    {/* Without the class start (occurrence not read) the phase can't tell "until the class" from "next opening": plain copy. */}
    {(hold?.phase === 'running' || (hold && !v.classStartsAt && (hold.phase === 'not_started' || hold.phase === 'until_class'))) && <Notice tone="warn">{t('payLaunch.pay.hold', { time: at(hold.until) })}</Notice>}
    {v.classStartsAt && (hold?.phase === 'not_started' || hold?.phase === 'until_class') && <Notice tone="info" title={t(`customer.srv.hold.${hold.phase}.title`, { time: at(hold.until) })}>
      {t(`customer.srv.hold.${hold.phase}.${hold.method}`, { min: hold.minutes, start: at(hold.clockStartsAt), time: at(hold.until), class: at(v.classStartsAt) })}
    </Notice>}
    {pay.status === 'ready' && ins && pay.view?.status !== 'empty' ? <Card>
      <div className="stack-sm" data-testid="bank-details">
        {ins.bankName && ins.accountNumber && <span>{t('payLaunch.pay.bank', { bank: ins.bankName, type: t(`payLaunch.pay.accountType.${ins.accountType ?? 'savings'}`), number: ins.accountNumber, holder: ins.accountHolder ?? '' })}</span>}
        {ins.breBKey && <span>{t('payLaunch.pay.breB')}: <strong>{ins.breBKey}</strong></span>}
        {ins.qrImageUrl && <img src={ins.qrImageUrl} alt={t('payLaunch.pay.qr')} style={{ width: 'min(240px, 100%)', height: 'auto' }} />}
      </div>
    </Card> : pay.status !== 'loading' && <Notice tone="warn">{t('payLaunch.pay.noInstructions')}</Notice>}
    {v.affiliate !== false && <form className="stack" onSubmit={(e) => { e.preventDefault(); void send(); }} noValidate>
      <Field label={t('payLaunch.pay.reference')}>{(fid) => <Input id={fid} name="reference" maxLength={120} value={reference} disabled={action.busy || action.uncertain || !!resumeId} onChange={(e) => { setReference(e.target.value); action.renew(); }} />}</Field>
      <Field label={t('payLaunch.pay.receipt')} required>{(fid) => <input id={fid} name="receipt" type="file" accept={RECEIPT_TYPES.join(',')} disabled={action.busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); action.setError(null); }} />}</Field>
      {resumeId && <Notice tone="warn">{t(paymentId ? 'payLaunch.pay.partial' : 'payLaunch.pay.missingImage')}</Notice>}
      {action.uncertain ? <Notice tone="warn">{t('payLaunch.uncertain')}</Notice> : action.error && <p role="alert">{t(refusalKey(action.error), { code: action.error })}</p>}
      <Button type="submit" loading={action.busy} disabled={action.busy || !file}>{t(action.busy ? 'payLaunch.pay.sending' : 'payLaunch.pay.send')}</Button>
    </form>}
    <p className="small muted">{t('payLaunch.pay.payAtDesk')}</p>
  </div>;
}
