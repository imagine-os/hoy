import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { BookingRow, ClassSessionRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { canvasSpecs } from '../specs';
import { PASS_IDS, priceOf, useBookingActions, useEntitlements, useMyBookings, useSessionJoined, type EntitlementKind } from '../hooks';
import { PAYMENT_METHODS, recordPayment, wompiCheckout, type PayMethod, type WompiResult } from '../payments';
import { MINUTE, policy } from '../policy';
import { PageHead, durationMin, movementOf, roomName, teacherName } from '../ui';
import { DeclinedBlock, type DeclinedState } from './blocks';

const spec = canvasSpecs['C-04'];
type Choice = 'credit' | 'membership' | 'trial' | 'single' | 'pack3' | 'pack10';
const isPass = (c: Choice): c is 'trial' | 'single' | 'pack3' | 'pack10' => (PASS_IDS as readonly string[]).includes(c);

/** C-04 Reserve & checkout — one screen from intent to confirmed. */
export function CheckoutPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user, devMode } = useSession();
  const { sections, isVisible } = useLayout(spec);
  const { joined, loading } = useSessionJoined(id);
  const ent = useEntitlements();
  const { book, sameDayConflict } = useBookingActions();
  const { rows: myBookings } = useMyBookings();
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');

  const passParam = params.get('pass');
  const claimId = params.get('claim');
  const [choice, setChoice] = useState<Choice | null>(() => {
    if (passParam && isPass(passParam as Choice)) return passParam as Choice;
    // A pass picked on C-07 before choosing a class (sessionStorage) becomes the default here.
    try { const pending = sessionStorage.getItem('hoyos.customer.pendingPass'); if (pending && isPass(pending as Choice)) { sessionStorage.removeItem('hoyos.customer.pendingPass'); return pending as Choice; } } catch { /* ignore */ }
    return null;
  });
  const kind: Choice = choice ?? (ent.defaultKind as Choice);
  const [method, setMethod] = useState<PayMethod>('card');
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'full' | 'unavailable' | 'conflict' | null>(null);
  const [declined, setDeclined] = useState<DeclinedState | null>(null);
  const [done, setDone] = useState<{ booking: BookingRow; pending: boolean } | null>(null);

  const conflict = useMemo(() => joined ? sameDayConflict(myBookings, sessions, joined.session) : null, [joined, myBookings, sessions, sameDayConflict]);
  const amount = isPass(kind) ? priceOf(kind).price ?? 0 : 0;
  const methodOpt = PAYMENT_METHODS.find((m) => m.id === method)!;

  const choices: { id: Choice; title: string; sub: string; price: string; available: boolean }[] = [
    { id: 'credit', title: t('customer.checkout.credit'), sub: t('customer.checkout.credit.sub', { n: ent.creditBalance }), price: t('core.common.included'), available: ent.creditBalance > 0 },
    { id: 'membership', title: t('customer.checkout.membership'), sub: ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : t('customer.checkout.membership.none'), price: t('core.common.included'), available: ent.membership?.status === 'active' },
    ...PASS_IDS.map((pid) => { const p = priceOf(pid); return { id: pid as Choice, title: bi(p.name), sub: bi(p.description), price: formatCOP(p.price ?? 0, lang), available: pid !== 'trial' || !ent.trialUsed }; }),
  ];

  const confirm = async () => {
    if (!joined) return;
    setBusy(true); setError(null);
    try {
      if (joined.session.status !== 'scheduled') throw new Error('session_unavailable');
      if (conflict) { setError('conflict'); return; }
      let paidWith: EntitlementKind = kind === 'credit' ? 'credit' : kind === 'membership' ? 'membership' : kind === 'trial' ? 'trial' : kind === 'single' ? 'single' : 'credit';
      let creditPlanId: string | null = null;
      let pending = false;
      if (amount > 0 && isPass(kind)) {
        const item = priceOf(kind);
        let result: WompiResult | undefined;
        if (methodOpt.provider === 'wompi') result = await wompiCheckout({ amount, method: method as 'card' | 'pse' | 'nequi', simulate: simulateDecline ? 'declined' : 'approved' });
        const payment = await recordPayment(data, { userId: user.id, planId: `plan_${item.id}`, amount, method, result, ivaRate: policy.ivaRate });
        if (result?.status === 'declined') {
          setDeclined((d) => ({ reason: result?.reason ?? null, holdUntil: d?.holdUntil ?? new Date(Date.now() + policy.paymentHoldMinutes * MINUTE).toISOString(), attempts: (d?.attempts ?? 0) + 1, method }));
          return;
        }
        pending = payment.status === 'pending';
        if (item.credits && item.credits > 1) {
          const exp = new Date(); exp.setDate(exp.getDate() + (item.validityDays ?? 30));
          await data.insert('credits', { user_id: user.id, plan_id: `plan_${item.id}`, payment_id: payment.id, delta: item.credits, reason: 'purchase', expires_at: exp.toISOString().slice(0, 10) });
          paidWith = 'credit'; creditPlanId = `plan_${item.id}`;
        }
      }
      const booking = await book(joined.session, paidWith, { creditPlanId });
      if (claimId) await data.update('waitlist', claimId, { status: 'claimed' });
      setDeclined(null);
      setDone({ booking, pending });
    } catch (e) {
      setError((e as Error).message === 'session_full' ? 'full' : 'unavailable');
    } finally { setBusy(false); }
  };

  if (!joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/schedule" title={t('customer.checkout.title')} />
        {loading ? <Skeleton shape="rect" height={160} /> : <EmptyState title={t('customer.class.notFound')} action={<Link to="/app/schedule"><Button>{t('customer.class.backToSchedule')}</Button></Link>} />}
      </div>
    );
  }

  const s = joined.session;
  const SECTIONS: Record<string, () => ReactNode> = {
    ClassSummary: () => <ClassCard title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} movement={movementOf(joined)} booked={s.booked_count} capacity={s.capacity} level={s.level} />,
    EntitlementPicker: () => declined ? null : (
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.checkout.payWith')}</h2>
        <div className="cust-choices" role="radiogroup" aria-label={t('customer.checkout.payWith')}>
          {choices.filter((c) => c.available || c.id === kind).map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={kind === c.id} disabled={!c.available} className={`cust-choice ${kind === c.id ? 'is-active' : ''}`} onClick={() => setChoice(c.id)}>
              <span className="cust-choice-radio" aria-hidden />
              <span className="grow"><span className="cust-choice-title">{c.title}</span><span className="cust-choice-sub">{c.sub}</span></span>
              <span className="cust-choice-price">{c.price}</span>
            </button>
          ))}
        </div>
        {kind === 'trial' && <p className="xs muted">{t('customer.checkout.trialNote')}</p>}
        {(kind === 'pack3' || kind === 'pack10') && <p className="xs muted">{t('customer.checkout.packNote', { n: (priceOf(kind).credits ?? 1) - 1, days: priceOf(kind).validityDays ?? 30 })}</p>}
      </section>
    ),
    PaymentMethodRow: () => amount === 0 || declined ? null : (
      <section className="stack-sm">
        <div className="row-between"><h2 className="cust-h2">{t('customer.checkout.method')}</h2><Link to="/app/payment-methods" className="small">{t('customer.checkout.manageMethods')}</Link></div>
        <div className="row wrap">
          {PAYMENT_METHODS.map((m) => <button key={m.id} type="button" className={`cust-method ${method === m.id ? 'is-active' : ''}`} aria-pressed={method === m.id} onClick={() => setMethod(m.id)}><span aria-hidden>{m.glyph}</span>{m.label}{m.provider === 'wompi' && <Badge tone="neutral">Wompi</Badge>}</button>)}
        </div>
        <p className="xs muted">{bi(methodOpt.hint)}</p>
        {devMode && methodOpt.provider === 'wompi' && <Toggle size="sm" checked={simulateDecline} onChange={setSimulateDecline} label={t('customer.checkout.simulateDecline')} />}
      </section>
    ),
    'OrderSummary (subtotal, IVA, total)': () => declined ? null : amount === 0 ? (
      <Notice tone="success" title={t('customer.checkout.noCharge')}>{kind === 'credit' ? t('customer.checkout.noCharge.credit') : t('customer.checkout.noCharge.membership')}</Notice>
    ) : (
      <OrderSummary lines={[{ label: bi(priceOf(kind as 'single').name), amount }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.checkout.receiptNote')} />
    ),
    ConfirmButton: () => declined ? (
      <DeclinedBlock state={declined} amount={amount} onRetry={(m) => { setMethod(m); setDeclined(null); setSimulateDecline(false); }} onRelease={() => nav(`/app/class/${s.id}`)} onExpired={() => setDeclined(null)} />
    ) : (
      <div className="stack-sm cust-sticky">
        {error === 'full' && <Notice tone="warn" title={t('customer.checkout.race.title')} action={<Button size="sm" onClick={() => nav(`/app/waitlist/${s.id}`)}>{t('core.common.waitlist')}</Button>}>{t('customer.checkout.race.body')}</Notice>}
        {error === 'unavailable' && <Notice tone="danger" title={t('core.common.error')}>{t('customer.checkout.unavailable')}</Notice>}
        {(error === 'conflict' || conflict) && <Notice tone="warn">{t('customer.book.oneADay')} {conflict && <Link to={`/app/class/${conflict}`}>{t('customer.class.seeOther')}</Link>}</Notice>}
        <Button block size="lg" loading={busy} disabled={!!conflict || s.status !== 'scheduled'} onClick={confirm}>
          {amount > 0 ? (methodOpt.provider === 'wompi' ? t('customer.checkout.payWompi', { amount: formatCOP(amount, lang) }) : t('customer.checkout.confirmManual', { amount: formatCOP(amount, lang) })) : t('customer.checkout.confirm')}
        </Button>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.checkout.policy', { h: policy.cancelWindowHours })}</p>
      </div>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead back={`/app/class/${s.id}`} title={t('customer.checkout.title')} sub={claimId ? t('customer.checkout.claiming') : undefined} />
      <div className="stack">
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      </div>
      <Drawer open={!!done} onClose={() => done && nav(`/app/booking/${done.booking.id}`)} title={t('customer.book.ok')} side="bottom">
        {done && (
          <div className="stack">
            <ClassCard variant="next" title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} movement={movementOf(joined)} booked={s.booked_count} capacity={s.capacity} />
            {done.pending ? <Notice tone="warn" title={t('customer.checkout.pending.title')}>{t('customer.checkout.pending.body')}</Notice> : <p className="small muted">{t('customer.checkout.success.body', { min: durationMin(joined) })}</p>}
            <Button block size="lg" onClick={() => nav(`/app/booking/${done.booking.id}`)}>{t('customer.class.viewBooking')}</Button>
            <Button block variant="ghost" onClick={() => nav('/app/schedule')}>{t('customer.class.backToSchedule')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
