import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatCOP } from '../../../i18n/format';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { inForce, rowOnDay, type ProductData, type ProductRow } from '../../products/launch/productMaster';
import { memberNames, myUserId, queryAll, refusalKey, type CosPort } from './cos';
import { DeskPaymentForm } from './DeskPaymentForm';
import { pendingItems, type BookingRec, type FileRec, type PaymentRec, type PendingItem } from './payments';
import { ReviewDrawer } from './ReviewDrawer';
import { useLoad } from './useCos';

interface QueueData { payments: PaymentRec[]; bookings: BookingRec[]; files: FileRec[]; products: ProductRow[]; people: Map<string, string>; actorId: string; members: Map<string, string> }

export async function readQueue(cos: CosPort): Promise<QueueData> {
  const [payments, bookings, products, actorId, members] = await Promise.all([
    queryAll<PaymentRec['data']>(cos, { entity: 'payment', filter: { field: 'status', op: 'eq', value: 'pending' } }),
    queryAll<BookingRec['data']>(cos, { entity: 'booking', filter: { field: 'status', op: 'eq', value: 'held' } }),
    queryAll<ProductData>(cos, { entity: 'product' }),
    myUserId(cos),
    memberNames(cos).catch(() => new Map<string, string>()),
  ]);
  const ids = payments.map((p) => p.id);
  const files = ids.length ? await queryAll<FileRec['data']>(cos, { entity: 'file', filter: { and: [{ field: 'owner_entity', op: 'eq', value: 'payment' }, { field: 'owner_id', op: 'in', value: ids }] } }) : [];
  const personIds = [...new Set([...payments.map((p) => p.data.person), ...bookings.map((b) => b.data.person)].filter((x): x is string => !!x))];
  const people = new Map<string, string>();
  if (personIds.length) for (const p of await queryAll<{ name?: string; email?: string }>(cos, { entity: 'person', filter: { field: 'id', op: 'in', value: personIds } })) people.set(p.id, p.data.name || p.data.email || '');
  return { payments, bookings, files, products, people, actorId, members };
}

/** PG-05: every payment awaiting confirmation in one list — customer, product, amount, receipt, time remaining. */
export function PendingPaymentsPage() {
  const { t, lang } = useI18n();
  const { state, reload } = useLoad(readQueue, [], 20_000);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const [open, setOpen] = useState<string | null>(null);
  const [desk, setDesk] = useState<PendingItem | 'sale' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success'; text: string; paymentId?: string } | null>(null);

  if (state.status === 'loading') return <EmptyState tone="loading" title={t('payLaunch.loading')} />;
  if (state.status === 'error') return <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />;
  const q = state.value;
  const items = pendingItems(q, now);
  const name = (i: PendingItem) => (i.person && q.people.get(i.person)) || t('payLaunch.queue.unknownCustomer');
  const selected = items.find((i) => i.id === open) ?? null;
  const today = dateKey();
  const onSale = inForce(q.products, today);
  const clock = (i: PendingItem) => i.clock.state === 'waiting' ? <Badge tone={i.clock.msLeft < 5 * 60_000 ? 'danger' : 'warn'}>{t('payLaunch.queue.left', { minutes: Math.ceil(i.clock.msLeft / 60_000) })}</Badge>
    : i.clock.state === 'frozen' ? <Badge tone="primary">{i.clock.minutesLeft == null ? t('payLaunch.queue.frozenNoMinutes') : t('payLaunch.queue.frozen', { minutes: i.clock.minutesLeft })}</Badge>
      : i.clock.state === 'expired' ? <Badge tone="danger">{t('payLaunch.queue.expired')}</Badge> : <Badge>{t('payLaunch.queue.noClock')}</Badge>;
  const done = (text: string, paymentId?: string) => { setOpen(null); setDesk(null); setNotice({ tone: 'success', text, paymentId }); reload(); };

  return <div className="stack">
    <div className="page-head"><h1>{t('payLaunch.queue.title')}</h1><Button onClick={() => setDesk('sale')}>{t('payLaunch.desk.sale')}</Button></div>
    {notice && <Notice tone={notice.tone} action={notice.paymentId ? <Link className="btn btn-secondary" to={`/staff/receipts/${notice.paymentId}`}>{t('payLaunch.receipt.title')}</Link> : undefined}>{notice.text}</Notice>}
    {items.length === 0 ? <EmptyState title={t('payLaunch.queue.empty')} /> : <div className="stack" data-testid="pending-list">
      {items.map((i) => <Card key={i.id} data-testid="pending-item">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div className="stack-sm">
            <strong>{name(i)}</strong>
            <span>{i.kind === 'desk_hold' ? t('payLaunch.queue.classBooking') : i.product?.data.name ?? t('payLaunch.queue.unknownProduct')}{i.amount != null ? ` · ${formatCOP(i.amount, lang)}` : ''}</span>
            <span className="small">{i.kind === 'receipt' ? t(i.receipt ? 'payLaunch.queue.hasReceipt' : 'payLaunch.queue.noReceipt') : t('payLaunch.queue.deskHolds')}</span>
            {clock(i)}
          </div>
          {i.kind === 'receipt' ? <Button variant="secondary" onClick={() => setOpen(i.id)}>{t('payLaunch.queue.review')}</Button>
            : <Button variant="secondary" disabled={i.clock.state === 'expired'} onClick={() => setDesk(i)}>{t('payLaunch.queue.record')}</Button>}
        </div>
      </Card>)}
    </div>}
    <ReviewDrawer key={selected?.id ?? 'none'} item={selected} customer={selected ? name(selected) : ''} current={selected?.product ? rowOnDay(q.products, selected.product.data.key, today) : null} onClose={() => setOpen(null)} onDone={(d) => done(t(d === 'approve' ? 'payLaunch.review.approved' : 'payLaunch.review.declined'), d === 'approve' ? selected?.payment?.id : undefined)} />
    <Drawer open={!!desk} onClose={() => setDesk(null)} title={t(desk === 'sale' ? 'payLaunch.desk.sale' : 'payLaunch.desk.title')} side="right">
      {desk && <DeskPaymentForm key={desk === 'sale' ? 'sale' : desk.id} products={onSale} booking={desk !== 'sale' && desk.booking ? { id: desk.booking.id, person: desk.booking.data.person ?? '' } : null}
        customerName={desk !== 'sale' ? name(desk) : undefined}
        onDone={(id) => done(t('payLaunch.desk.saved', { name: q.members.get(q.actorId) ?? '' }), id)} />}
    </Drawer>
  </div>;
}
