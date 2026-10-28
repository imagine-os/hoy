import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatCOP, formatDateTime } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Card } from '../../../components/molecule/Card/Card';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { usePaymentInstructions } from '../../admin/usePaymentInstructions';
import { isAffiliateOnly, rowOnDay, type ProductData, type ProductRow } from '../../products/launch/productMaster';
import { batch, CosError, myPerson, queryAll, refusalKey, type CosPort } from './cos';
import { giftNotes, RECEIPT_TYPES, transferOps, uploadReceipt, type BookingRec, type FileRec, type PaymentRec } from './payments';
import { useAction, useCos, useLoad } from './useCos';

export interface PayView { person: string; product: ProductRow | null; booking: BookingRec | null; pending: PaymentRec | null; pendingHasReceipt: boolean; affiliate: boolean | null }

/** What the customer pays for: a held single-class booking (H-4 sends them here) or a product by key. */
export async function readPay(cos: CosPort, what: string, id: string, today: string): Promise<PayView> {
  const person = await myPerson(cos);
  if (!person) throw new CosError('forbidden', 403);
  let booking: BookingRec | null = null, key = id;
  if (what === 'booking') {
    booking = (await cos.request<{ data: BookingRec }>('GET', `/api/booking/${encodeURIComponent(id)}`)).data;
    key = 'single';
  } else if (what !== 'product') throw new CosError('for_record_not_found', 404);
  const rows = await queryAll<ProductData>(cos, { entity: 'product', filter: { field: 'key', op: 'eq', value: key } });
  const product = rowOnDay(rows, key, today);
  const scope = booking ? { field: 'for_id', op: 'eq' as const, value: booking.id } : rows.length ? { field: 'product', op: 'in' as const, value: rows.map((r) => r.id) } : null;
  const pending = scope ? (await queryAll<PaymentRec['data']>(cos, { entity: 'payment', filter: { and: [{ field: 'status', op: 'eq', value: 'pending' }, scope] } }))[0] ?? null : null;
  // A payment whose image never arrived (upload failed, page closed) is resumed, not shown as "already sent".
  const pendingHasReceipt = !!pending && (await queryAll<FileRec['data']>(cos, { entity: 'file', filter: { and: [{ field: 'owner_entity', op: 'eq', value: 'payment' }, { field: 'owner_id', op: 'eq', value: pending.id }] } }))
    .some((f) => f.data.kind === 'receipt' && f.data.status === 'ready');
  let affiliate: boolean | null = null;
  if (product && isAffiliateOnly(product)) {
    const member = await cos.request<{ data: { data: { price_audience?: string | null } }[] }>('POST', '/query', { entity: 'member', filter: { field: 'person', op: 'eq', value: person.id }, limit: 1 });
    affiliate = member.data[0]?.data.price_audience === 'affiliate';
  }
  return { person: person.id, product, booking, pending, pendingHasReceipt, affiliate };
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
  const { t, lang } = useI18n();
  const cos = useCos();
  const today = dateKey();
  const { state, reload } = useLoad((c) => readPay(c, what, id, today), [what, id, today]);
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
  if (done) return <Notice tone="success">{t(v.booking ? 'payLaunch.pay.sent' : 'payLaunch.pay.sentProduct')}</Notice>;
  if (v.pending && v.pendingHasReceipt) return <Notice tone="success">{t('payLaunch.pay.alreadyPending')}</Notice>;
  const resumeId = paymentId ?? v.pending?.id ?? null;
  if (v.booking && v.booking.data.status !== 'held') return <Notice>{t('payLaunch.pay.notHeld')}</Notice>;
  const ins = pay.view?.values;

  const send = () => action.run(async (key) => {
    if (!cos) throw new CosError('disconnected');
    if (!file) return;
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
    {v.booking?.data.hold_frozen_at ? <Notice>{t('payLaunch.pay.frozen')}</Notice>
      : v.booking?.data.hold_until && <Notice tone="warn">{t('payLaunch.pay.hold', { time: formatDateTime(v.booking.data.hold_until, lang) })} {t('payLaunch.pay.holdNextOpening')}</Notice>}
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
