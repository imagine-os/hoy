import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { BaseRow, PaymentRow, PlanRow } from '../../../data/schema';
import { formatCOP, formatDate, formatDateTime, formatTime, dateKey } from '../../../i18n/format';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { SkeletonRows } from '../../../components/atom/Skeleton/Skeleton';
import { useAllSessionsJoined, useMyBookings } from '../hooks';
import { PageHead, downloadJson } from '../ui';
import { tenant } from '../../../tenant/tenant';

interface InvoiceRow extends BaseRow { payment_id: string; number: string; subtotal: number; tax: number; total: number; issued_at: string }
type Tab = 'classes' | 'payments';

/** C-11 History & payments — one ledger for the relationship. */
export function HistoryPage() {
  const { t, bi, lang } = useI18n();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'payments' ? 'payments' : 'classes';
  const { rows: bookings, loading } = useMyBookings();
  const all = useAllSessionsJoined();
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: invoices } = useTable<InvoiceRow>('invoices');
  const { rows: plans } = useTable<PlanRow>('plans');
  const [receipt, setReceipt] = useState<PaymentRow | null>(null);

  const classes = useMemo(() => {
    const now = Date.now();
    return bookings.map((b) => ({ b, j: all.find((x) => x.session.id === b.session_id) })).filter((x) => x.j && (new Date(x.j.session.ends_at).getTime() < now || x.b.status !== 'booked'))
      .sort((a, b) => b.j!.session.starts_at.localeCompare(a.j!.session.starts_at));
  }, [bookings, all]);
  const planName = (id: string | null) => { const p = plans.find((x) => x.id === id); return p ? bi({ es: p.name_es, en: p.name_en }) : t('customer.history.otherCharge'); };
  const inv = receipt ? invoices.find((i) => i.payment_id === receipt.id) : null;

  const exportAll = () => downloadJson(`${tenant.slug}-historial-${dateKey()}.json`, { user: user.name, exported_at: new Date().toISOString(), classes: classes.map(({ b, j }) => ({ date: j!.session.starts_at, title: j!.session.title, teacher: j!.teacher?.display_name, status: b.status, paid_with: b.paid_with })), payments: payments.map((p) => ({ date: p.paid_at ?? p.created_at, plan: planName(p.plan_id), amount: p.amount, method: p.method, provider: p.provider, status: p.status, invoice: invoices.find((i) => i.payment_id === p.id)?.number ?? null })) });

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.history.title')} sub={t('customer.history.sub')} actions={<Button size="sm" variant="secondary" icon="⇩" onClick={exportAll}>{t('customer.history.export')}</Button>} />
      <div className="stack">
        <SegmentedControl block ariaLabel={t('customer.history.title')} value={tab} onChange={(v) => setParams(v === 'payments' ? { tab: 'payments' } : {}, { replace: true })} options={[{ value: 'classes', label: t('customer.history.classes'), count: classes.length }, { value: 'payments', label: t('customer.history.payments'), count: payments.length }]} />

        {tab === 'classes' && (
          <Card padding="sm" aria-busy={loading || undefined}>
            {loading && <SkeletonRows count={4} />}
            {!loading && classes.length === 0 && <EmptyState compact title={t('customer.history.empty')} body={t('customer.history.empty.body')} action={<Link to="/app/schedule"><Button size="sm">{t('customer.home.next.cta')}</Button></Link>} />}
            {!loading && classes.map(({ b, j }) => (
              <ListRow key={b.id} title={j!.session.title} subtitle={`${formatDate(j!.session.starts_at, lang)} · ${formatTime(j!.session.starts_at, lang)} · ${j!.teacher?.display_name ?? ''}`}
                trailing={<span className="stack-sm" style={{ alignItems: 'flex-end' }}><Badge tone={toneForStatus(b.status)}>{t(`customer.history.status.${b.status}`)}</Badge><span className="xs muted">{t(`customer.paidWith.${b.paid_with}`)}</span></span>}
                to={`/app/booking/${b.id}`} />
            ))}
          </Card>
        )}

        {tab === 'payments' && (
          <ListGroup>
            {payments.length === 0 && <EmptyState compact title={t('customer.history.payments.empty')} />}
            {payments.map((p) => (
              <ListRow key={p.id} icon={p.provider === 'wompi' ? '◎' : '$'} title={planName(p.plan_id)} subtitle={`${formatDate(p.paid_at ?? p.created_at, lang)} · ${t(`customer.pay.method.${p.method}`)} · ${p.provider === 'wompi' ? 'Wompi' : t('customer.pay.manual')}`}
                trailing={<span className="stack-sm" style={{ alignItems: 'flex-end' }}><strong>{formatCOP(p.amount, lang)}</strong><Badge tone={toneForStatus(p.status)}>{t(`customer.history.pay.${p.status}`)}</Badge></span>} onClick={() => setReceipt(p)} />
            ))}
          </ListGroup>
        )}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.history.note')}</p>
      </div>

      <Drawer open={!!receipt} onClose={() => setReceipt(null)} side="bottom" title={t('customer.history.receipt')}>
        {receipt && (
          <div className="stack-sm cust-receipt">
            <div className="row-between"><span className="muted small">{t('customer.history.receipt.number')}</span><strong>{inv?.number ?? '—'}</strong></div>
            <div className="row-between"><span className="muted small">{t('customer.history.receipt.date')}</span><span>{formatDateTime(receipt.paid_at ?? receipt.created_at, lang)}</span></div>
            <div className="row-between"><span className="muted small">{t('customer.history.receipt.concept')}</span><span>{planName(receipt.plan_id)}</span></div>
            <div className="row-between"><span className="muted small">{t('customer.history.receipt.method')}</span><span>{t(`customer.pay.method.${receipt.method}`)}{receipt.provider_ref ? ` · ${receipt.provider_ref}` : ''}</span></div>
            {inv && <>
              <div className="row-between"><span className="muted small">{t('customer.checkout.subtotal')}</span><span>{formatCOP(inv.subtotal, lang)}</span></div>
              <div className="row-between"><span className="muted small">{t('customer.checkout.iva')}</span><span>{formatCOP(inv.tax, lang)}</span></div>
            </>}
            <div className="row-between cust-receipt-total"><span>{t('customer.checkout.total')}</span><strong>{formatCOP(receipt.amount, lang)}</strong></div>
            <Badge tone={toneForStatus(receipt.status)}>{t(`customer.history.pay.${receipt.status}`)}</Badge>
            <p className="xs muted">{t('customer.history.receipt.dian')}</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
