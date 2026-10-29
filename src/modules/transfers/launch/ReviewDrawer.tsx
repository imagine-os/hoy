import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import type { ProductRow } from '../../products/launch/productMaster';
import { CosError, refusalKey } from './cos';
import { amountDiffers, reviewOps, runPaymentOps, type PendingItem } from './payments';
import { useAction, useCos } from './useCos';

/** Receipt images are shown only as PNG/JPEG, whatever type the stream reports (never HTML or script in this origin). */
const IMAGE_TYPES = ['image/png', 'image/jpeg'];
export const receiptImageType = (declared: string | undefined, sniffed: string): string | null => (declared && IMAGE_TYPES.includes(declared) ? declared : IMAGE_TYPES.includes(sniffed) ? sniffed : null);

/**
 * PG-04: open the receipt, compare with the bank notification, record the amount received, confirm or reject.
 * Mount it with `key={item.id}`: each payment is its own action (its own idempotency key).
 */
export function ReviewDrawer({ item, customer, current, onClose, onDone }: { item: PendingItem | null; customer: string; current: ProductRow | null; onClose: () => void; onDone: (decision: 'approve' | 'decline') => void }) {
  const { t, lang } = useI18n();
  const cos = useCos();
  const action = useAction();
  const [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [compared, setCompared] = useState(false);
  const [image, setImage] = useState<string | null>(null), [imageError, setImageError] = useState(false);
  const fileId = item?.receipt?.id ?? null, declared = item?.receipt?.data.mime;
  useEffect(() => {
    setImage(null); setImageError(false);
    if (!fileId || !cos) return;
    if (!cos.fileBlob) { setImageError(true); return; }
    let url: string | null = null, alive = true;
    cos.fileBlob(fileId).then((b) => {
      if (!alive) return;
      const type = receiptImageType(declared, b.type);
      if (!type) { setImageError(true); return; }
      url = URL.createObjectURL(new Blob([b], { type })); setImage(url);
    }, () => { if (alive) setImageError(true); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [fileId, declared, cos]);
  if (!item?.payment) return null;
  const payment = item.payment, product = item.product;
  const received = amount.trim() === '' ? NaN : Number(amount);
  const differs = amountDiffers(product, received);
  const decide = (decision: 'approve' | 'decline', checkIn = false) => action.run(async (key) => {
    if (!cos) throw new CosError('disconnected');
    await runPaymentOps(cos, reviewOps({ payment, product, decision, amountReceived: received, reason, checkInBooking: checkIn ? item.booking?.id ?? null : null }), key);
    onDone(decision);
  });
  const edit = (f: () => void) => { f(); action.renew(); };
  const locked = action.busy || action.uncertain;
  // The payment points at a price row that is not today's row for its key (e.g. a period ended): staff should look twice.
  const notCurrent = !!product && (!current || current.id !== product.id);
  return <Drawer open onClose={() => { if (!action.busy) onClose(); }} title={t('payLaunch.review.title')} side="right">
    <div className="stack">
      <strong>{customer}</strong>
      <span>{product?.data.name ?? t('payLaunch.queue.unknownProduct')} · {formatCOP(payment.data.amount, lang)}</span>
      {product && <span className="small">{t('payLaunch.review.price', { price: formatCOP(product.data.price, lang) })}</span>}
      {notCurrent && <Notice tone="warn">{t('payLaunch.review.notCurrentRow', { price: current ? formatCOP(current.data.price, lang) : '—' })}</Notice>}
      {!fileId ? <Notice tone="warn">{t('payLaunch.queue.noReceipt')}</Notice>
        : image ? <img src={image} alt={t('payLaunch.review.receiptAlt')} style={{ width: '100%', height: 'auto' }} />
          : imageError ? <Notice tone="warn">{t('payLaunch.review.receiptUnavailable')}</Notice> : <p role="status">{t('payLaunch.loading')}</p>}
      <Notice>{t('payLaunch.review.compare')}</Notice>
      <label className="row"><input type="checkbox" checked={compared} disabled={locked} onChange={(e) => setCompared(e.target.checked)} /> {t('payLaunch.review.compared')}</label>
      <Field label={t('payLaunch.review.received')} required>{(id) => <Input id={id} name="received" type="number" inputMode="numeric" min={1} step={1} value={amount} disabled={locked} onChange={(e) => edit(() => setAmount(e.target.value))} />}</Field>
      {differs && <Notice tone="warn">{t('payLaunch.review.differs')}</Notice>}
      <Field label={t('payLaunch.review.reason')}>{(id) => <Input id={id} name="reason" maxLength={500} value={reason} disabled={locked} onChange={(e) => edit(() => setReason(e.target.value))} />}</Field>
      {action.uncertain ? <Notice tone="warn">{t('payLaunch.uncertain')}</Notice> : action.error && <p role="alert">{t(refusalKey(action.error), { code: action.error })}</p>}
      <div className="row wrap">
        <Button disabled={action.busy || !compared} loading={action.busy} onClick={() => void decide('approve')}>{t('payLaunch.review.approve')}</Button>
        {item.booking && <Button variant="secondary" disabled={action.busy || !compared} onClick={() => void decide('approve', true)}>{t('payLaunch.review.approveCheckIn')}</Button>}
        <Button variant="danger" disabled={action.busy} onClick={() => void decide('decline')}>{t('payLaunch.review.decline')}</Button>
      </div>
    </div>
  </Drawer>;
}
