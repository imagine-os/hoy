import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { useLivePricing } from '../../../data/livePricing';
import { usesMats } from '../../../data/mats';
import { formatCOP, formatTime } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { MatPicker } from '../../../components/organism/MatPicker/MatPicker';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { useEntitlements, useMyBookings, useNow, useSessionJoined } from '../hooks';
import { PageHead, roomName, teacherName, toneOf } from '../ui';
import { useBookingPolicy } from '../booking/bookingPolicy';
import { bookOnServer, useSubmitKey } from '../booking/serverCommands';
import { refusalCode, refusalMessage } from '../booking/refusals';
import { classPhase, holdsPlace, purchaseReturnLink, type ServerBookingRow } from '../booking/serverBooking';

/** What the customer pays the class with. A trial or a package is bought first and the class is kept in the link (RS-03). */
/** Members can't read other people's bookings: every mat shows free and the server answers `spot_taken`. */
const NO_TAKEN: readonly number[] = [];
type Choice = 'package' | 'single' | 'trial' | 'pack12' | 'pack12_smtc';
const BUY_FIRST: readonly Choice[] = ['trial', 'pack12', 'pack12_smtc'];
const isChoice = (v: string | null): v is Choice => v === 'package' || v === 'single' || (BUY_FIRST as readonly string[]).includes(v ?? '');
/** A pass picked on Plans or Passes before choosing a class (same key as the review checkout). */
const PENDING_PASS_KEY = 'hoyos.customer.pendingPass';
function initialChoice(param: string | null): Choice | null {
  if (isChoice(param)) return param;
  try { const pending = sessionStorage.getItem(PENDING_PASS_KEY); if (isChoice(pending)) { sessionStorage.removeItem(PENDING_PASS_KEY); return pending; } } catch { /* ignore */ }
  return null;
}

/**
 * C-04 in the production build (H-4). One write: a class from the balance (package or redeemed voucher), or a single class
 * held while it is paid by transfer or at reception. Availability, the one-class-a-day limit, capacity, mats and the last
 * spot are the server's: its refusal is shown as is. The review build keeps `CheckoutPage` (browser rules, MockProvider).
 */
export function ServerCheckoutPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  const policy = useBookingPolicy();
  const { joined, loading } = useSessionJoined(id);
  const ent = useEntitlements();
  const pricing = useLivePricing();
  const { rows: mine } = useMyBookings();
  const now = useNow(15_000);
  const [mat, setMat] = useState<number | null>(() => Number(params.get('mat')) || null);
  const [choice, setChoice] = useState<Choice | null>(() => initialChoice(params.get('pass')));
  const [method, setMethod] = useState<'transfer' | 'desk'>('transfer');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  // No silent default to a paid single class: the balance may still be loading. Preselect the balance only once it shows classes.
  const kind: Choice | null = choice ?? (ent.classBalance > 0 ? 'package' : null);
  const submitKey = useSubmitKey(`${user.id}:${id}:${kind ?? ''}:${method}:${mat ?? ''}`);

  if (!joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/schedule" title={t('customer.checkout.title')} />
        {loading ? <Skeleton shape="rect" height={160} /> : <EmptyState title={t('customer.class.notFound')} action={<Link to="/app/schedule"><Button>{t('customer.class.backToSchedule')}</Button></Link>} />}
      </div>
    );
  }

  const s = joined.session;
  const phase = classPhase(s, now);
  const mats = usesMats(joined.modality);
  const existing = (mine as unknown as ServerBookingRow[]).find((b) => b.session_id === s.id && holdsPlace(b, now));
  const price = (itemId: string) => pricing.item(itemId)?.price ?? null;
  const options: { id: Choice; title: string; sub: string; price: string }[] = [
    { id: 'package', title: t('customer.srv.pay.balance'), sub: t('customer.srv.pay.balance.sub', { n: ent.classBalance }), price: t('core.common.included') },
    ...(['single', 'trial', 'pack12', 'pack12_smtc'] as const).flatMap((pid) => {
      const item = pricing.item(pid), amount = price(pid);
      return item && amount != null ? [{ id: pid as Choice, title: bi(item.name), sub: bi(item.description), price: formatCOP(amount, lang) }] : [];
    }),
  ];
  const buyFirst = !!kind && BUY_FIRST.includes(kind);
  const holdMinutes = method === 'desk' ? policy.holdMinutesDesk : policy.holdMinutesTransfer;

  const confirm = async () => {
    if (inFlight.current || !kind) return;
    if (buyFirst) { nav(purchaseReturnLink(kind, s.id, mats ? mat : null)); return; }
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const booking = await bookOnServer(data, { userId: user.id, sessionId: s.id, paidWith: kind === 'package' ? 'package' : 'single', matNumber: mats ? mat : null, paymentMethod: kind === 'single' ? method : null }, submitKey.take());
      submitKey.settle();
      nav(`/app/booking/${booking.id}`, { replace: true });
    } catch (e) {
      submitKey.settle(e);
      setError(e);
    } finally { inFlight.current = false; setBusy(false); }
  };

  const refusal = error ? refusalMessage(error) : null;
  const code = error ? refusalCode(error) : null;
  const closed = phase !== 'open' && phase !== 'full';

  return (
    <div className="container page cust-page cust-has-sticky">
      <PageHead back={`/app/class/${s.id}`} title={t('customer.checkout.title')} />
      <ClassCard title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} level={s.level} />
      {existing && <Notice tone="info" action={<Button size="sm" variant="secondary" onClick={() => nav(`/app/booking/${existing.id}`)}>{t('customer.class.viewBooking')}</Button>}>{t('customer.home.booked')}</Notice>}
      {closed && <Notice tone="warn">{t(`customer.srv.phase.${phase}`)}</Notice>}
      {mats && !closed && <MatPicker sessionId={s.id} capacity={s.capacity} taken={NO_TAKEN} value={mat} onChange={(n) => { setMat(n); setError(null); }} />}

      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.checkout.payWith')}</h2>
        <div className="cust-choices" role="radiogroup" aria-label={t('customer.checkout.payWith')}>
          {options.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={kind === c.id} className={`cust-choice ${kind === c.id ? 'is-active' : ''}`} onClick={() => { setChoice(c.id); setError(null); }}>
              <span className="cust-choice-radio" aria-hidden />
              <span className="grow"><span className="cust-choice-title">{c.title}</span><span className="cust-choice-sub">{c.sub}</span></span>
              <span className="cust-choice-price">{c.price}</span>
            </button>
          ))}
        </div>
        {kind === 'package' && <p className="xs muted">{t('customer.srv.pay.balance.note')}</p>}
        {buyFirst && <Notice tone="info" title={t('customer.srv.buyFirst.title')}>{t('customer.srv.buyFirst.body')}</Notice>}
      </section>

      {kind === 'single' && (
        <section className="stack-sm">
          <h2 className="cust-h2">{t('customer.checkout.method')}</h2>
          <div className="row wrap" role="radiogroup" aria-label={t('customer.checkout.method')}>
            {(['transfer', 'desk'] as const).map((m) => <button key={m} type="button" role="radio" aria-checked={method === m} className={`cust-method ${method === m ? 'is-active' : ''}`} onClick={() => setMethod(m)}>{t(`customer.srv.method.${m}`)}</button>)}
          </div>
          <Notice tone="info" title={t('customer.srv.hold.explain.title', { min: holdMinutes })}>
            {t(method === 'desk' ? 'customer.srv.hold.explain.desk' : 'customer.srv.hold.explain.transfer', { min: holdMinutes, time: formatTime(s.starts_at, lang) })}
          </Notice>
        </section>
      )}

      <div className="stack-sm cust-sticky">
        {refusal && (
          <Notice tone={code === 'occurrence_full' || code === 'spot_taken' ? 'warn' : 'danger'} title={t('customer.srv.refused')}
            action={code === 'occurrence_full' || code === 'occurrence_not_open' || code === 'daily_limit_reached' ? <Button size="sm" variant="secondary" onClick={() => nav('/app/schedule')}>{t('customer.class.backToSchedule')}</Button> : undefined}>
            {t(refusal.key, refusal.vars)}
          </Notice>
        )}
        <Button block size="lg" loading={busy} disabled={busy || closed || !!existing || !kind || (mats && !mat && !buyFirst)} onClick={() => void confirm()}>
          {buyFirst ? t('customer.srv.buyFirst.cta') : kind === 'single' ? t(`customer.srv.cta.${method}`) : t('customer.checkout.confirm')}
        </Button>
        {!kind && <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.srv.pay.pick')}</p>}
        {mats && !mat && !buyFirst && <p className="xs muted" style={{ textAlign: 'center' }}>{t('site.mat.hint')}</p>}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.srv.cancelRule')}</p>
      </div>
    </div>
  );
}
