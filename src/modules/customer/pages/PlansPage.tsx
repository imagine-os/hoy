import {useRef} from 'react';
import {useOperationalCatalog,useReviewedQuote} from '../../quotes/hooks';
import {QuoteNotice} from '../../../components/molecule/QuoteNotice/QuoteNotice';
import {quotedItem,readPaymentQuote} from '../../../data/operationalQuotes';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWhatsappLink } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
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
import { useRetainedClassPurchase } from '../useRetainedClassPurchase';
import { PurchaseRecoveryNotice } from '../../../components/molecule/PurchaseRecoveryNotice/PurchaseRecoveryNotice';
import { LaunchPaymentReceipt } from '../../../components/organism/LaunchPaymentReceipt/LaunchPaymentReceipt';
import { policy } from '../policy';
import { PageHead } from '../ui';
import { useActions } from '../../../actions';
import { need, useAppNavHandlers } from '../actions';
import { canvasSpecs } from '../specs';

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
  const { user } = useSession();
  const purchase = useRetainedClassPurchase();
  const ent = useEntitlements();
  const [params] = useSearchParams();
  const catalog=useOperationalCatalog();
  const packages = PACKAGE_IDS.flatMap(id=>{const q=catalog.quote(id);return q?[quotedItem(q)]:[];});
  // W-xx → A-02 → here with ?plan=<id>: a package opens its confirmation; a single or trial class goes to the schedule with the pass ready.
  const wanted = params.get('plan');
  const preselected = packages.find((p) => p.id === wanted) ?? null;
  const [buying, setBuying] = useState<PriceItem | null>(preselected);
  const wantedHandled=useRef('');
  useEffect(()=>{if(purchase.attempt&&wanted)wantedHandled.current=wanted;if(!wanted||wantedHandled.current===wanted||catalog.loading||!purchase.ready||purchase.attempt)return;const plan=packages.find(p=>p.id===wanted);if(plan){wantedHandled.current=wanted;setBuying(plan);}},[wanted,catalog.loading,catalog.rows,purchase.ready,purchase.attempt]);
  const review=useReviewedQuote(catalog,buying?.id??null,1,90);
  const quote=purchase.attempt?.quote??review.quote;
  const shownBuying=quote?quotedItem(quote):buying;
  const done=purchase.result?.status==='approved',busy=purchase.busy;
  const shownAttempt=useRef('');
  useEffect(()=>{const key=purchase.attempt?`${purchase.attempt.userId}:${purchase.attempt.id}`:'';if(key&&shownAttempt.current!==key){shownAttempt.current=key;setBuying(quotedItem(purchase.attempt!.quote));}else if(!key&&purchase.ready)shownAttempt.current='';},[purchase.attempt,purchase.ready]);
  const choose=(plan:PriceItem)=>{if(!purchase.ready||busy)return;setBuying(purchase.attempt?quotedItem(purchase.attempt.quote):plan);};
  const close=async()=>{if(purchase.result){if(await purchase.finish())setBuying(null);}else{setBuying(null);purchase.cancel();}};
  const finishTo=async(path:string)=>{if(await purchase.finish())nav(path);};
  const purchasedPayment=ent.payments.find(p=>p.id===ent.pkg.purchase?.payment_id);
  const purchasedQuote=purchasedPayment?readPaymentQuote(purchasedPayment):null;
  const benefits = (p: PriceItem) => [
    t('customer.plans.benefit.classes', { n: p.classes ?? 12 }),
    t('quotes.days', { days:p.validityDays??90 }),
    t('customer.plans.benefit.freeze', { days: policy.freezeMaxDays }),
    t('customer.plans.benefit.noRefund'),
  ];
  useEffect(() => {
    if (!wanted || !(PASS_IDS as readonly string[]).includes(wanted)) return;
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
      choose(plan);
      return `package ${plan.id} chosen; confirmation open`;
    },
  }), [navHandlers,catalog,purchase.ready,purchase.attempt,busy]);
  useActions(spec, handlers);

  const buy = async () => {
    if (!buying||!quote||(!purchase.attempt&&!review.available)||busy)return;
    await purchase.pay(quote);
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.plans.title')} sub={t('quotes.packageIntro')} />
      <div className="stack">
        {!buying&&(purchase.attempt||purchase.error)&&<PurchaseRecoveryNotice blocked={!purchase.attempt} failed={!!purchase.error} onReview={()=>{if(purchase.attempt)setBuying(quotedItem(purchase.attempt.quote));void purchase.refresh();}}/>}
        {packages.length===0&&<Notice tone="warn">{t('quotes.unavailable')}</Notice>}
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
              <Button block size="lg" disabled={!purchase.ready||busy} variant={i === 0 ? 'primary' : 'secondary'} onClick={() => choose(p)}>{t('customer.plans.cta')}</Button>
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
            {pricingByFamily('privadas').map((p) => <PriceRow key={p.id} item={p} />)}
            <div className="row wrap"><a href={wa.link('specials', t('customer.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t('customer.plans.specials.cta')} →</Button></a></div>
            {specials.note && <p className="xs muted">{bi(specials.note)}</p>}
          </Card>
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.gift')}</span>
            <Link to="/app/gift"><Button size="sm" variant="secondary">{t('customer.plans.gift.cta')} →</Button></Link>
          </Card>
        </div>
      </div>

      <Drawer open={!!buying} onClose={() => {void close();}} side="bottom" title={done ? t('customer.plans.done.title') : t('customer.plans.confirm.title')}>
        {buying && shownBuying && !done && (
          <div className="stack">
            {purchase.attempt?<Notice>{t('customer.purchase.savedTerms')}</Notice>:<QuoteNotice catalog={catalog} review={review}/>}
            <OrderSummary lines={[{ label: bi(shownBuying.name), amount:quote?.chargedAmount??0 }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('quotes.packageTerms', {classes:quote?.classes??12,days:quote?.validityDays??quote?.fallbackValidityDays??90})} />
            {(purchase.error||purchase.attempt&&!purchase.result)&&<PurchaseRecoveryNotice blocked={!purchase.attempt} failed={!!purchase.error} onReview={purchase.error&&!purchase.attempt?()=>{void purchase.refresh();}:undefined}/>}
            {purchase.result?.status==='declined'&&<Notice tone="danger">{t('customer.plans.paymentError')}</Notice>}
            {buying.audience && <Notice tone="info">{t('customer.plans.benefit.affiliates')}</Notice>}
            <Button data-class-purchase-confirm block size="lg" disabled={!purchase.ready||!quote||(!purchase.attempt&&!review.available)||!!purchase.result||!!purchase.error&&!purchase.attempt} loading={busy} onClick={buy}>{t(purchase.attempt?'customer.purchase.retry':'customer.checkout.payWompi', { amount: formatCOP(quote?.chargedAmount??0, lang) })}</Button>
            {purchase.attempt&&!busy&&!purchase.result&&<Button block variant="ghost" onClick={()=>{void purchase.discard().then(ok=>{if(ok)setBuying(null);});}}>{t('customer.purchase.discard')}</Button>}
            {purchase.result?.status==='declined'&&<Button block variant="secondary" onClick={()=>{void purchase.finish().then(ok=>{if(ok)setBuying(null);});}}>{t('customer.purchase.acknowledge')}</Button>}
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.pay.wompi.seam')}</p>
          </div>
        )}
        {done && buying && (
          <div className="stack">
            <Notice tone="success" title={t('customer.plans.done.title')}>{t('customer.plans.done.body', { n:purchase.result?.quote.classes??12 })}</Notice>
            {purchase.result&&<LaunchPaymentReceipt payment={purchase.result.payment} customer={purchase.result.payment.frontend_receipt?.emailPreview?.recipient.name||user.name}/>}
            {purchase.error&&<PurchaseRecoveryNotice failed/>}
            <Button block size="lg" onClick={() => {void finishTo('/app/schedule');}}>{t('customer.home.next.cta')}</Button>
            <Button block variant="ghost" onClick={() => {void finishTo('/app/classes');}}>{t('customer.plans.manage')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
