import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMinWidth } from '../../../layout/useMinWidth';
import { useI18n } from '../../../i18n/I18nProvider';
import { useContact } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate, addMonths, dateKey, waLink } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { pricingByFamily, type PriceItem } from '../../../tenant/pricing';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { useEntitlements } from '../hooks';
import { recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { PageHead } from '../ui';
import { useActions } from '../../../actions';
import { need, useAppNavHandlers } from '../actions';
import { canvasSpecs } from '../specs';

const spec = canvasSpecs['C-06'];

type Cycle = 'month' | 'year';
/** Plan dates carry the year: an annual cycle ends in another one. */
const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** C-06 Membership plans — sell the plan without blocking the booking. */
export function PlansPage() {
  const { t, bi, lang } = useI18n();
  const contact = useContact();
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const wide = useMinWidth('shell');
  const [params] = useSearchParams();
  const plans = pricingByFamily('membresia');
  // W-05 → A-02 → here with ?plan=<id>: the plan chosen on the site is preselected and its confirmation opens at once.
  const preselected = plans.find((p) => p.id === params.get('plan')) ?? null;
  const [cycle, setCycle] = useState<Cycle>(() => (preselected?.period === 'year' ? 'year' : 'month'));
  const [buying, setBuying] = useState<PriceItem | null>(preselected);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const monthly = plans.find((p) => p.period === 'month')!, annual = plans.find((p) => p.period === 'year')!;
  const monthsFree = Math.max(0, Math.round(12 - (annual.price ?? 0) / (monthly.price ?? 1)));
  // From 900 px both cycles sit side by side (no toggle); on a phone the segmented control picks one.
  const shown = wide ? plans : plans.filter((p) => p.period === cycle);
  const currentSlug = ent.plan?.slug ?? null;
  // C-06 "Tu plan": the cycle the customer paid for — start, and the day it runs out (cancellation date if set, else the renewal).
  const planEnd = ent.membership?.ends_at ?? ent.membership?.renews_at ?? ent.membership?.starts_at ?? '';

  // WebMCP (0025): app.choosePlan preselects a plan and opens its confirmation — the same state as ?plan=<id>.
  // Paying stays a person's click on the confirmation's button.
  const navHandlers = useAppNavHandlers();
  const handlers = useMemo(() => ({
    ...navHandlers,
    'app.choosePlan': (p?: Record<string, string>) => {
      const id = need(p, 'plan');
      const all = pricingByFamily('membresia');
      const plan = all.find((x) => x.id === id);
      if (!plan) throw new Error(`unknown plan "${id}" — one of ${all.map((x) => x.id).join(', ')}`);
      setCycle(plan.period === 'year' ? 'year' : 'month'); setDone(false); setBuying(plan);
      return `plan ${plan.id} chosen; confirmation open`;
    },
  }), [navHandlers]);
  useActions(spec, handlers);

  const buy = async () => {
    if (!buying) return;
    setBusy(true);
    try {
      const result = await wompiCheckout({ amount: buying.price ?? 0, method: 'card' }); // INTEGRATION SEAM: Wompi
      await recordPayment(data, { userId: user.id, planId: `plan_${buying.id}`, amount: buying.price ?? 0, method: 'card', result, ivaRate: policy.ivaRate });
      if (result.status !== 'approved') return;
      const start = new Date();
      const patch = { plan_id: `plan_${buying.id}`, status: 'active', starts_at: dateKey(start), renews_at: dateKey(addMonths(start, buying.period === 'year' ? 12 : 1)), ends_at: null, paused_until: null };
      if (ent.membership) await data.update('memberships', ent.membership.id, patch);
      else await data.insert('memberships', { user_id: user.id, ...patch });
      setDone(true);
    } finally { setBusy(false); }
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.plans.title')} sub={t('customer.plans.sub')} actions={wide ? undefined : <SegmentedControl size="sm" ariaLabel={t('customer.plans.cycle')} value={cycle} onChange={setCycle} options={[{ value: 'month', label: t('core.common.perMonth').replace('/ ', '') }, { value: 'year', label: t('core.common.perYear').replace('/ ', '') }]} />} />
      <div className="stack">
        {ent.membership && (
          <Notice tone={ent.membership.status === 'active' ? 'success' : 'warn'} title={t('customer.plans.current', { plan: ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : '' })} action={<Link to="/app/membership"><Button size="sm" variant="secondary">{t('customer.plans.manage')}</Button></Link>}>
            {t(`customer.membership.status.${ent.membership.status}`)}
            <span className="cust-plan-dates xs">
              <span>{t('customer.plans.starts')}: <strong>{formatDate(ent.membership.starts_at, lang, DATE_OPTS)}</strong></span>
              <span>{t('customer.plans.ends')}: <strong>{formatDate(planEnd, lang, DATE_OPTS)}</strong></span>
            </span>
          </Notice>
        )}
        <div className="cust-plans">
          {shown.map((p) => {
            const isCurrent = currentSlug === p.id;
            return (
              <Card key={p.id} className={`cust-plan ${p.period === 'year' ? 'is-featured' : ''} ${preselected?.id === p.id ? 'is-preselected' : ''}`} raised={p.period === 'year'} padding="lg">
                <div className="row-between wrap"><h2 className="cust-h2">{bi(p.name)}</h2>{p.badge && <Badge tone="highlight">{bi(p.badge)}</Badge>}{isCurrent && <Badge tone="success">{t('customer.plans.yours')}</Badge>}</div>
                <p className="small muted">{bi(p.description)}</p>
                <div className="cust-plan-price"><strong>{formatCOP(p.price ?? 0, lang)}</strong><span className="small muted"> {p.period === 'month' ? t('core.common.perMonth') : t('core.common.perYear')}</span></div>
                {p.period === 'year' && <p className="small">{t('customer.plans.monthsFree', { n: monthsFree, monthly: formatCOP(Math.round((p.price ?? 0) / 12), lang) })}</p>}
                <ul className="cust-checklist small">
                  <li>{t('customer.plans.benefit.unlimited', { n: tenant.studio.perPersonPerDay })}</li>
                  <li>{t('customer.plans.benefit.pause', { days: policy.pauseMaxDays })}</li>
                  <li>{t('customer.plans.benefit.guest')}</li>
                  <li>{t('customer.plans.benefit.events')}</li>
                </ul>
                <Button block size="lg" variant={isCurrent ? 'secondary' : 'primary'} disabled={isCurrent} onClick={() => setBuying(p)}>{isCurrent ? t('customer.plans.yours') : ent.membership ? t('customer.plans.change') : t('customer.plans.cta')}</Button>
              </Card>
            );
          })}
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.plans.note', { mats: tenant.studio.mats })}</p>
        <div className="cust-plans-links">
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.skip')}</span>
            <Link to="/app/passes"><Button size="sm" variant="secondary">{t('customer.plans.skip.cta')} →</Button></Link>
          </Card>
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.specials')}</span>
            <a href={waLink(contact.whatsapp, t('customer.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t('customer.plans.specials.cta')} →</Button></a>
          </Card>
        </div>
      </div>

      <Drawer open={!!buying} onClose={() => { setBuying(null); setDone(false); }} side="bottom" title={done ? t('customer.plans.done.title') : t('customer.plans.confirm.title')}>
        {buying && !done && (
          <div className="stack">
            <OrderSummary lines={[{ label: bi(buying.name), amount: buying.price ?? 0 }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.plans.confirm.note', { days: policy.chargeNoticeDays })} />
            <Button block size="lg" loading={busy} onClick={buy}>{t('customer.checkout.payWompi', { amount: formatCOP(buying.price ?? 0, lang) })}</Button>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.pay.wompi.seam')}</p>
          </div>
        )}
        {done && (
          <div className="stack">
            <Notice tone="success" title={t('customer.plans.done.title')}>{t('customer.plans.done.body')}</Notice>
            <Button block size="lg" onClick={() => nav('/app/schedule')}>{t('customer.home.next.cta')}</Button>
            <Button block variant="ghost" onClick={() => nav('/app/membership')}>{t('customer.plans.manage')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
