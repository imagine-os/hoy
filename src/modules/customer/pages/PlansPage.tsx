import {useRef} from 'react';
import {useOperationalCatalog,useReviewedQuote} from '../../quotes/hooks';
import {QuoteNotice} from '../../../components/molecule/QuoteNotice/QuoteNotice';
import {checkSaleQuote,quotedItem,readPaymentQuote} from '../../../data/operationalQuotes';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWhatsappLink } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { pricingByFamily, type PriceItem } from '../../../tenant/pricing';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { PACKAGE_IDS, PASS_IDS, useEntitlements } from '../hooks';
import { activatePaidPackage, recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { PageHead } from '../ui';
import { useActions } from '../../../actions';
import { need, useAppNavHandlers } from '../actions';
import { canvasSpecs } from '../specs';
import { SERVER_RULES } from '../booking/bookingPolicy';
import { safeCheckoutReturn } from '../booking/serverBooking';
import { GIFT_PURCHASE_PATH } from '../../../config/launchRoutes';
import { useLivePricing } from '../../../data/livePricing';

/** Production: a pack or the trial is bought by bank transfer on H-5's payment page, by product key; Company OS prices it. */
const payPath = (key: string, next: string | null = null) => `/app/pay/product/${encodeURIComponent(key)}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

const spec = canvasSpecs['C-06'];
const PENDING_PASS_KEY = 'hoyos.customer.pendingPass';
/** Package dates carry the year: three months can cross into the next one. */
const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/**
 * C-06 Planes (0051) — the launch list: the 12-class package (and its Santa María Tennis Club price) bought here,
 * the trial and individual class (C-07), private classes (WhatsApp) and gift cards (C-17). No membership, no credits.
 */
export function PlansPage() {
  const { t, bi, lang } = useI18n();
  // 0047: private classes and specials are a `specials` handoff (M-08a contacts; the front desk by default).
  const wa = useWhatsappLink();
  const specials = wa.resolve('specials');
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const [params] = useSearchParams();
  const catalog=useOperationalCatalog();
  const prices = useLivePricing();
  // Production: the packs and their prices are Company OS's product master (live pricing); the browser quote is review only.
  const packages = SERVER_RULES
    ? PACKAGE_IDS.flatMap((id) => { const p = prices.item(id); return p ? [p] : []; })
    : PACKAGE_IDS.flatMap(id=>{const q=catalog.quote(id);return q?[quotedItem(q)]:[];});
  // W-xx → A-02 → here with ?plan=<id>: a package opens its confirmation; a single or trial class goes to the schedule with the pass ready.
  const wanted = params.get('plan');
  // RS-03 (production): checkout sends a trial or package purchase here with `next` = the chosen class; the trial opens its
  // confirmation here (the production checkout books only from the balance or a held single class), and "done" goes back.
  const next = SERVER_RULES ? safeCheckoutReturn(params.get('next')) : null;
  const trialHere = SERVER_RULES && wanted === 'trial';
  const trialItem = useMemo(() => { const q = trialHere ? catalog.quote('trial') : null; return q ? quotedItem(q) : null; }, [trialHere, catalog]);
  const preselected = packages.find((p) => p.id === wanted) ?? trialItem;
  const [buying, setBuying] = useState<PriceItem | null>(SERVER_RULES ? null : preselected);
  const wantedHandled=useRef('');
  useEffect(()=>{if(SERVER_RULES||!wanted||wantedHandled.current===wanted||catalog.loading)return;const plan=packages.find(p=>p.id===wanted)??trialItem;if(plan){wantedHandled.current=wanted;buyKey.current=crypto.randomUUID();setBuying(plan);}},[wanted,catalog.loading,catalog.rows]);
  const review=useReviewedQuote(catalog,buying?.id??null,1,90);
  const buyKey=useRef(crypto.randomUUID()),buyBusy=useRef(false);
  const shownBuying=review.quote?quotedItem(review.quote):buying;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const purchasedPayment=ent.payments.find(p=>p.id===ent.pkg.purchase?.payment_id);
  const purchasedQuote=purchasedPayment?readPaymentQuote(purchasedPayment):null;
  const benefits = (p: PriceItem) => [
    t('customer.plans.benefit.classes', { n: p.classes ?? 12 }),
    t('quotes.days', { days:p.validityDays??90 }),
    t('customer.plans.benefit.freeze', { days: policy.freezeMaxDays }),
    t('customer.plans.benefit.noRefund'),
  ];
  useEffect(() => {
    if (!wanted || !(PASS_IDS as readonly string[]).includes(wanted) || trialHere) return;
    try { sessionStorage.setItem(PENDING_PASS_KEY, wanted); } catch { /* ignore */ }
    nav('/app/schedule', { replace: true });
  }, [wanted, nav]);

  // WebMCP (0025): app.choosePlan preselects a package and opens its confirmation — the same state as ?plan=<id>.
  // Paying stays a person's click on the confirmation's button.
  const navHandlers = useAppNavHandlers();
  const handlers = useMemo(() => ({
    ...navHandlers,
    'app.choosePlan': (p?: Record<string, string>) => {
      const id = need(p, 'plan');
      const q=catalog.quote(id);const plan=q&&PACKAGE_IDS.includes(id as typeof PACKAGE_IDS[number])?quotedItem(q):null;
      if (!plan) throw new Error(`unknown plan "${id}" — one of ${PACKAGE_IDS.join(', ')}`);
      buyKey.current=crypto.randomUUID();setDone(false); setBuying(plan);
      return `package ${plan.id} chosen; confirmation open`;
    },
  }), [navHandlers,catalog]);
  useActions(spec, handlers);

  const buy = async () => {
    if (!buying)return;
    // Production (SERVER_RULES): a pack is bought by bank transfer on H-5's payment page; Company OS prices it and issues the
    // classes on approval. Its keys (pack12, pack12_smtc) are the recipe's product keys. The Wompi stand-in is review only.
    if (SERVER_RULES && (PACKAGE_IDS as readonly string[]).includes(buying.id)) { nav(payPath(buying.id)); return; }
    if (!review.available||!review.quote||buyBusy.current)return;
    buyBusy.current=true;const frozen=review.quote;
    setBusy(true); setError(false);
    try {
      await checkSaleQuote(data,frozen);
      const result = await wompiCheckout({ amount: frozen.chargedAmount, method: 'card' }); // INTEGRATION SEAM: Wompi
      if (!data.atomic) throw new Error('atomic_unavailable');
      await data.atomic(async transaction => {
        const payment = await recordPayment(transaction, { userId: user.id, planId: `plan_${buying.id}`, amount: frozen.chargedAmount, method: 'card', result, ivaRate: policy.ivaRate,quote:frozen });
        if (result.status !== 'approved') return;
        await activatePaidPackage(transaction, { paymentId: payment.id, userId: user.id, planId: `plan_${buying.id}`, classes:frozen.classes,expiresAt:frozen.entitlementExpiresAt! });
      },{idempotencyKey:`package:${user.id}:${buyKey.current}`});
      if (result.status === 'approved') setDone(true);
      else setError(true);
    } catch { setError(true); } finally { setBusy(false);buyBusy.current=false; }
  };

  // Production: ?plan=<pack or trial> (checkout's "buy and come back", A-02) goes straight to its transfer payment.
  if (SERVER_RULES && wanted && ([...PACKAGE_IDS, 'trial'] as string[]).includes(wanted)) return <Navigate to={payPath(wanted, next)} replace />;
  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.plans.title')} sub={t('quotes.packageIntro')} />
      <div className="stack">
        {packages.length===0&&!(SERVER_RULES&&prices.loading)&&<Notice tone="warn">{t('quotes.unavailable')}</Notice>}
        {ent.pkg.purchase && (
          <Notice tone={ent.pkg.frozen ? 'warn' : 'success'} title={t('customer.plans.current', { plan:purchasedQuote?bi(purchasedQuote.name):ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : t('customer.classes.package') })} action={<Link to="/app/classes"><Button size="sm" variant="secondary">{t('customer.plans.manage')}</Button></Link>}>
            {t('customer.plans.left', { n: ent.pkg.left })}
            <span className="cust-plan-dates xs">
              <span>{t('customer.plans.starts')}: <strong>{formatDate(ent.pkg.purchase.created_at, lang, DATE_OPTS)}</strong></span>
              {ent.pkg.expiresAt && <span>{t('customer.plans.ends')}: <strong>{formatDate(ent.pkg.expiresAt, lang, DATE_OPTS)}</strong></span>}
            </span>
          </Notice>
        )}
        <div className="cust-plans">
          {packages.map((p, i) => (
            <Card key={p.id} className={`cust-plan ${i === 0 ? 'is-featured' : ''} ${preselected?.id === p.id ? 'is-preselected' : ''}`} raised={i === 0} padding="lg">
              <div className="row-between wrap"><h2 className="cust-h2">{bi(p.name)}</h2>{p.badge && <Badge tone="highlight">{bi(p.badge)}</Badge>}</div>
              <p className="small muted">{bi(p.description)}</p>
              <div className="cust-plan-price"><strong>{formatCOP(p.price ?? 0, lang)}</strong></div>
              <ul className="cust-checklist small">
                {benefits(p).map((b) => <li key={b}>{b}</li>)}
                {p.audience && <li>{t('customer.plans.benefit.affiliates')}</li>}
              </ul>
              <Button block size="lg" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => { if (SERVER_RULES) { nav(payPath(p.id)); return; } buyKey.current=crypto.randomUUID();setDone(false);setBuying(p);}}>{t('customer.plans.cta')}</Button>
            </Card>
          ))}
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.plans.note', { mats: tenant.studio.mats })}</p>
        <div className="cust-plans-links">
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.skip')}</span>
            <Link to="/app/passes"><Button size="sm" variant="secondary">{t('customer.plans.skip.cta')} →</Button></Link>
          </Card>
          <Card tone="muted" className="stack-sm">
            <strong className="small">{t('customer.plans.private.title')}</strong>
            {/* J4: the private class has no public price in production; the customer contacts the studio. */}
            {!SERVER_RULES && pricingByFamily('privadas').map((p) => <PriceRow key={p.id} item={p} />)}
            <div className="row wrap"><a href={wa.link('specials', t('customer.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t('customer.plans.specials.cta')} →</Button></a></div>
            {specials.note && <p className="xs muted">{bi(specials.note)}</p>}
          </Card>
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.gift')}</span>
            <Link to={GIFT_PURCHASE_PATH}><Button size="sm" variant="secondary">{t('customer.plans.gift.cta')} →</Button></Link>
          </Card>
        </div>
      </div>

      <Drawer open={!!buying} onClose={() => { setBuying(null); setDone(false); }} side="bottom" title={done ? t('customer.plans.done.title') : t('customer.plans.confirm.title')}>
        {buying && shownBuying && !done && (
          <div className="stack">
            <QuoteNotice catalog={catalog} review={review}/>
            <OrderSummary lines={[{ label: bi(shownBuying.name), amount:review.quote?.chargedAmount??0 }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('quotes.packageTerms', {classes:review.quote?.classes??12,days:review.quote?.validityDays??90})} />
            {error && <Notice tone="danger">{t('customer.plans.paymentError')}</Notice>}
            {buying.audience && <Notice tone="info">{t('customer.plans.benefit.affiliates')}</Notice>}
            <Button block size="lg" disabled={!review.available} loading={busy} onClick={buy}>{SERVER_RULES ? t('customer.checkout.payTransfer') : t('customer.checkout.payWompi', { amount: formatCOP(review.quote?.chargedAmount??0, lang) })}</Button>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.pay.wompi.seam')}</p>
          </div>
        )}
        {done && buying && (
          <div className="stack">
            <Notice tone="success" title={t('customer.plans.done.title')}>{t('customer.plans.done.body', { n:review.quote?.classes??buying.classes??12 })}</Notice>
            {next
              ? <Button block size="lg" onClick={() => nav(next)}>{t('customer.srv.buyFirst.back')}</Button>
              : <Button block size="lg" onClick={() => nav('/app/schedule')}>{t('customer.home.next.cta')}</Button>}
            <Button block variant="ghost" onClick={() => nav('/app/classes')}>{t('customer.plans.manage')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
