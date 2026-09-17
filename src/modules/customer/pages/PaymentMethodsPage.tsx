import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { PaymentRow } from '../../../data/schema';
import { formatCOP, formatDate } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { PAYMENT_METHODS, wompiCheckout } from '../payments';
import { priceOf } from '../hooks';
import { policy } from '../policy';
import { PageHead } from '../ui';

/** C-05 Payment methods — Colombian payment reality, with the Wompi seam marked in the UI. */
export function PaymentMethodsPage() {
  const { t, bi, lang } = useI18n();
  const { user } = useSession();
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const [test, setTest] = useState<{ busy: boolean; ref?: string }>({ busy: false });

  // No payment_methods table yet: "saved" methods are the electronic methods this person has paid with (approved).
  const saved = useMemo(() => {
    const seen = new Map<string, PaymentRow>();
    for (const p of payments) if (p.status === 'approved' && p.provider === 'wompi' && !seen.has(p.method)) seen.set(p.method, p);
    return [...seen.values()];
  }, [payments]);
  const electronic = PAYMENT_METHODS.filter((m) => m.provider === 'wompi');
  const manual = PAYMENT_METHODS.filter((m) => m.provider === 'manual');
  const testAmount = priceOf('single').price ?? 0;

  const runTest = async () => {
    setTest({ busy: true });
    const r = await wompiCheckout({ amount: testAmount, method: 'card' }); // INTEGRATION SEAM: replace with the Wompi widget.
    setTest({ busy: false, ref: r.ref });
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/profile" title={t('customer.pay.title')} sub={`${tenant.city} · ${tenant.currency} · IVA ${Math.round(policy.ivaRate * 100)}%`} />
      <div className="stack">
        <Card tone="primary" className="stack-sm" padding="lg">
          <div className="row-between wrap"><strong className="cust-h2">{t('customer.pay.wompi.title')}</strong><Badge tone="highlight">{t('customer.pay.wompi.badge')}</Badge></div>
          <p className="small">{t('customer.pay.wompi.body')}</p>
          <div className="row wrap">
            <Button variant="secondary" loading={test.busy} onClick={runTest}>{t('customer.pay.wompi.cta', { amount: formatCOP(testAmount, lang) })}</Button>
            {test.ref && <span className="small">{t('customer.pay.wompi.ok', { ref: test.ref })}</span>}
          </div>
          <p className="xs" style={{ opacity: .8 }}>{t('customer.pay.wompi.seam')}</p>
        </Card>

        <ListGroup title={t('customer.pay.saved')}>
          {saved.length === 0 && <EmptyState compact icon="▭" title={t('customer.pay.saved.empty')} body={t('customer.pay.saved.empty.body')} />}
          {saved.map((p) => { const m = PAYMENT_METHODS.find((x) => x.id === p.method); return <ListRow key={p.id} icon={m?.glyph ?? '▭'} title={p.method === 'card' ? `${m?.label} •••• 4242` : m?.label ?? p.method} subtitle={t('customer.pay.saved.lastUsed', { date: formatDate(p.paid_at ?? p.created_at, lang) })} trailing={<Badge tone="success">{t('customer.pay.saved.tokenised')}</Badge>} />; })}
        </ListGroup>

        <ListGroup title={t('customer.pay.electronic')}>
          {electronic.map((m) => <ListRow key={m.id} icon={m.glyph} title={m.label} subtitle={bi(m.hint)} trailing={<Badge tone="neutral">Wompi</Badge>} />)}
        </ListGroup>

        <ListGroup title={t('customer.pay.manual')}>
          {manual.map((m) => <ListRow key={m.id} icon={m.glyph} title={m.label} subtitle={bi(m.hint)} trailing={<Badge tone="warn">{t('customer.pay.manual.desk')}</Badge>} />)}
        </ListGroup>
        <Card eyebrow={t('customer.pay.transfer.title')} className="stack-sm">
          <ol className="cust-steps small">
            <li>{t('customer.pay.transfer.step1', { bank: 'Bancolombia' })}</li>
            <li>{t('customer.pay.transfer.step2', { whatsapp: tenant.contact.whatsapp })}</li>
            <li>{t('customer.pay.transfer.step3')}</li>
          </ol>
          <p className="xs muted">{t('customer.pay.transfer.account')}</p>
        </Card>

        <Notice tone="info" title={t('customer.pay.comply.title')}>{t('customer.pay.comply.body')}</Notice>
      </div>
    </div>
  );
}
