import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useContact, useSettings } from '../../admin/settings';
import { formatCOP } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { PAYMENT_METHODS, wompiCheckout, wompiTokenise, type ElectronicMethod } from '../payments';
import { priceOf, usePaymentMethods } from '../hooks';
import { PageHead } from '../ui';

/** C-05 Payment methods — saved methods live in `payment_methods`; the token is Wompi's, never ours. */
export function PaymentMethodsPage() {
  const { t, bi, lang } = useI18n();
  const contact = useContact();
  const { settings } = useSettings();
  const { rows: saved, add, remove, makeDefault } = usePaymentMethods();
  const [test, setTest] = useState<{ busy: boolean; ref?: string }>({ busy: false });
  const [adding, setAdding] = useState<ElectronicMethod | null>(null);
  const electronic = PAYMENT_METHODS.filter((m) => m.provider === 'wompi');
  const manual = PAYMENT_METHODS.filter((m) => m.provider === 'manual');
  const testAmount = priceOf('single').price ?? 0;

  const runTest = async () => {
    setTest({ busy: true });
    const r = await wompiCheckout({ amount: testAmount, method: 'card' }); // INTEGRATION SEAM: replace with the Wompi widget.
    setTest({ busy: false, ref: r.ref });
  };

  const save = async (kind: ElectronicMethod) => {
    setAdding(kind);
    try {
      const tok = await wompiTokenise({ kind }); // INTEGRATION SEAM: Wompi tokenisation.
      await add({ kind, brand: tok.brand, last4: tok.last4, expires: tok.expires, tokenRef: tok.tokenRef });
    } finally { setAdding(null); }
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/profile" title={t('customer.pay.title')} sub={`${tenant.city} · ${tenant.currency}`} />
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
          {saved.map((m) => {
            const opt = PAYMENT_METHODS.find((x) => x.id === m.kind);
            return (
              <ListRow key={m.id} icon={opt?.glyph ?? '▭'}
                title={m.last4 ? `${m.brand} ···· ${m.last4}` : m.brand}
                subtitle={[m.expires ? t('customer.pay.saved.expires', { date: m.expires }) : t(`customer.pay.kind.${m.kind}`), t('customer.pay.saved.tokenised')].join(' · ')}
                trailing={(
                  <span className="row" style={{ gap: 'var(--sp-2)' }}>
                    {m.is_default
                      ? <Badge tone="success">{t('customer.pay.saved.default')}</Badge>
                      : <Button size="sm" variant="ghost" onClick={() => { void makeDefault(m); }}>{t('customer.pay.saved.makeDefault')}</Button>}
                    <Button size="sm" variant="ghost" onClick={() => { void remove(m); }} aria-label={t('customer.pay.saved.remove')}>✕</Button>
                  </span>
                )} />
            );
          })}
        </ListGroup>

        <ListGroup title={t('customer.pay.electronic')}>
          {electronic.map((m) => (
            <ListRow key={m.id} icon={m.glyph} title={bi(m.label)} subtitle={bi(m.hint)}
              trailing={<Button size="sm" variant="secondary" loading={adding === m.id} onClick={() => { void save(m.id as ElectronicMethod); }}>{t('customer.pay.add')}</Button>} />
          ))}
        </ListGroup>

        <ListGroup title={t('customer.pay.manual')}>
          {manual.map((m) => <ListRow key={m.id} icon={m.glyph} title={bi(m.label)} subtitle={bi(m.hint)} trailing={<Badge tone="warn">{t('customer.pay.manual.desk')}</Badge>} />)}
        </ListGroup>
        <Card eyebrow={t('customer.pay.transfer.title')} className="stack-sm">
          <ol className="cust-steps small">
            <li>{t('customer.pay.transfer.step1', { bank: settings.payments.bankName || bi(contact.pendingLabel) })}</li>
            <li>{t('customer.pay.transfer.step2', { whatsapp: contact.whatsapp })}</li>
            <li>{t('customer.pay.transfer.step3')}</li>
          </ol>
          <p className="xs muted">{t('customer.pay.transfer.account')}</p>
        </Card>

        <Notice tone="info" title={t('customer.pay.comply.title')}>{t('customer.pay.comply.body')}</Notice>
      </div>
    </div>
  );
}
