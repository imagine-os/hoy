import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate, addDays, dateKey, fromDateKey, MS } from '../../../i18n/format';
import { type PriceItem } from '../../../tenant/pricing';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { StatTile } from '../../../components/molecule/StatTile/StatTile';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { PASS_IDS, priceOf, useEntitlements } from '../hooks';
import { recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { PageHead } from '../ui';

const PENDING_PASS_KEY = 'hoyos.customer.pendingPass';

/** C-07 Bienvenida passes — the way in for someone with no membership. */
export function PassesPage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const ent = useEntitlements();
  const session = params.get('session');

  const pick = (id: string) => {
    if (session) { nav(`/app/checkout/${session}?pass=${id}`); return; }
    try { sessionStorage.setItem(PENDING_PASS_KEY, id); } catch { /* ignore */ }
    nav('/app/schedule');
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/plans" title={t('customer.passes.title')} sub={t('customer.passes.sub')} />
      <div className="stack">
        {ent.membership?.status === 'active' && <Notice tone="info" title={t('customer.passes.member')} action={<Link to="/app/plans"><Button size="sm" variant="secondary">{t('customer.plans.manage')}</Button></Link>}>{t('customer.passes.member.body')}</Notice>}
        <div><div className="eyebrow">{t('customer.passes.eyebrow')}</div><p className="small muted">{t('customer.passes.intro')}</p></div>
        <div className="stack-sm">
          {PASS_IDS.map((id) => {
            const p = priceOf(id);
            if (id === 'trial' && ent.trialUsed) return <Card key={id} tone="muted" padding="sm"><p className="small muted">{t('customer.passes.trialUsed')}</p></Card>;
            return (
              <Card key={id} className="cust-pass" padding="md">
                <div className="row-between wrap">
                  <div className="grow"><strong>{bi(p.name)}</strong><div className="small muted">{bi(p.description)}{p.credits ? ` · ${t('customer.passes.credits', { n: p.credits })}` : ''}{p.validityDays ? ` · ${t('customer.passes.validity', { days: p.validityDays })}` : ''}</div></div>
                  <strong className="cust-pass-price">{formatCOP(p.price ?? 0, lang)}</strong>
                </div>
                <Button block onClick={() => pick(id)}>{session ? t('customer.passes.bookWith') : t('customer.passes.cta')}</Button>
              </Card>
            );
          })}
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.passes.footer')} <Link to="/app/plans">{t('customer.passes.footer.link')} →</Link> · <Link to="/app/credits">{t('customer.credits.title')} →</Link></p>
      </div>
    </div>
  );
}

/** C-07b Credits & class packs — balance, ledger and top-up. */
export function CreditsPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const [buying, setBuying] = useState<PriceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const packs = (['single', 'pack3', 'pack10'] as const).map(priceOf);
  const ledger = [...ent.credits].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const today = dateKey();
  const soon = ent.nextExpiry && (fromDateKey(ent.nextExpiry).getTime() - Date.now()) < 7 * MS.day;

  const buy = async () => {
    if (!buying) return;
    setBusy(true);
    try {
      const result = await wompiCheckout({ amount: buying.price ?? 0, method: 'card' }); // INTEGRATION SEAM: Wompi
      const payment = await recordPayment(data, { userId: user.id, planId: `plan_${buying.id}`, amount: buying.price ?? 0, method: 'card', result, ivaRate: policy.ivaRate });
      if (result.status !== 'approved') return;
      await data.insert('credits', { user_id: user.id, plan_id: `plan_${buying.id}`, payment_id: payment.id, delta: buying.credits ?? 1, reason: 'purchase', expires_at: dateKey(addDays(new Date(), buying.validityDays ?? 30)) });
      setDone(true);
    } finally { setBusy(false); }
  };

  const packGrid = (
    <section className="stack-sm">
      <h2 className="cust-h2">{t('customer.credits.topUp')}</h2>
      <Card padding="none">{packs.map((p) => <PriceRow key={p.id} item={p} onSelect={setBuying} />)}</Card>
    </section>
  );

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.credits.title')} sub={t('customer.credits.sub')} />
      <div className="stack">
        <div className="grid grid-2">
          <StatTile label={t('customer.credits.balance')} value={ent.membership?.status === 'active' ? '∞' : ent.creditBalance} hint={ent.membership?.status === 'active' ? t('customer.credits.membershipHint') : undefined} />
          <StatTile label={t('customer.credits.expires')} value={ent.nextExpiry ? formatDate(ent.nextExpiry, lang) : '—'} hint={soon ? t('customer.credits.expiringSoon') : undefined} />
        </div>
        {soon && <Notice tone="warn">{t('customer.credits.expiringSoon.body', { date: formatDate(ent.nextExpiry!, lang) })}</Notice>}
        {ent.creditBalance === 0 && packGrid}
        <section className="stack-sm">
          <h2 className="cust-h2">{t('customer.credits.ledger')}</h2>
          <Card padding="sm">
            {ledger.length === 0 && <EmptyState compact title={t('customer.credits.ledger.empty')} />}
            {ledger.map((c) => (
              <div key={c.id} className="cust-ledger-row">
                <span className={`cust-ledger-delta ${c.delta > 0 ? 'is-plus' : 'is-minus'}`}>{c.delta > 0 ? `+${c.delta}` : c.delta}</span>
                <span className="grow"><span className="small">{t(`customer.credits.reason.${c.reason}`)}</span><span className="xs muted"> · {formatDate(c.created_at, lang)}</span></span>
                {c.expires_at && c.delta > 0 && <Badge tone={c.expires_at < today ? 'danger' : 'neutral'}>{c.expires_at < today ? t('customer.credits.expired') : t('customer.credits.until', { date: formatDate(c.expires_at, lang) })}</Badge>}
              </div>
            ))}
          </Card>
        </section>
        {ent.creditBalance > 0 && packGrid}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.credits.note', { h: policy.cancelWindowHours })}</p>
      </div>
      <Drawer open={!!buying} onClose={() => { setBuying(null); setDone(false); }} side="bottom" title={done ? t('customer.credits.done.title') : t('customer.credits.buy.title')}>
        {buying && !done && (
          <div className="stack">
            <OrderSummary lines={[{ label: bi(buying.name), amount: buying.price ?? 0 }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.checkout.receiptNote')} />
            <Button block size="lg" loading={busy} onClick={buy}>{t('customer.checkout.payWompi', { amount: formatCOP(buying.price ?? 0, lang) })}</Button>
          </div>
        )}
        {done && buying && <Notice tone="success" title={t('customer.credits.done.title')}>{t('customer.credits.done.body', { n: buying.credits ?? 1 })}</Notice>}
      </Drawer>
    </div>
  );
}
