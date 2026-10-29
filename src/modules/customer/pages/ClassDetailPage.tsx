import { requireSessionAdmission, sessionAdmissionAvailable } from '../../../data/sessionAdmission';
import { sessionUnavailableReason } from '../../../data/sessionAvailability';
import { useSession } from '../../../auth/SessionProvider';
import { SessionEditorial } from '../../../components/molecule/SessionEditorial/SessionEditorial';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { ClassSessionRow } from '../../../data/schema';
import { formatDate, formatTime } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { CapacityMeter } from '../../../components/molecule/CapacityMeter/CapacityMeter';
import { TeacherCard } from '../../../components/organism/TeacherCard/TeacherCard';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { canvasSpecs } from '../specs';
import { useBookingActions, useEntitlements, useMyBookings, useSessionJoined, useWaitlistFor } from '../hooks';
import { policy } from '../policy';
import {  PageHead, durationMin, roomName, shareText } from '../ui';
import { ClassThumbnail } from '../../../components/molecule/ClassThumbnail/ClassThumbnail';
import { StudioCancelledBlock } from './blocks';
import { SERVER_RULES } from '../booking/bookingPolicy';
import { classPhase, holdsPlace, type ServerBookingRow } from '../booking/serverBooking';
import { useLiveUpdates } from '../../../data/companyos/hooks';

/** Production (H-4): no browser copy of the one-class-a-day rule; the server answers `daily_limit_reached`. */
const NO_BROWSER_RULES = { sameDayConflict: () => null as string | null };
const NO_WAITLIST: { mine: ReturnType<typeof useWaitlistFor>['mine'] | null } = { mine: null };

const spec = canvasSpecs['C-03'];

/** C-03 Class detail. */
export function ClassDetailPage() {
  // Contract §1: this screen polls Company OS every 20 s in the production build (no-op on the review build).
  useLiveUpdates(['class_sessions', 'bookings']);
  const { id } = useParams();
  const data = useData(), { user, role } = useSession();
  const { t, bi, lang } = useI18n();
  const nav = useNavigate(), location = useLocation();
  const navigationRoute = location.pathname + location.search;
  const { sections, isVisible } = useLayout(spec);
  const { joined, loading } = useSessionJoined(id);
  const { rows: myBookings } = useMyBookings();
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  // SERVER_RULES is fixed per build, so the hook order never changes between renders.
  const { sameDayConflict } = SERVER_RULES ? NO_BROWSER_RULES : useBookingActions();
  // No waitlist at launch: production reads none (SERVER_RULES is fixed per build, so the hook order never changes).
  const { mine: myWait } = SERVER_RULES ? NO_WAITLIST : useWaitlistFor(id);
  const ent = useEntitlements();
  const [shared, setShared] = useState<string | null>(null);

  const conflict = useMemo(() => joined ? sameDayConflict(myBookings, sessions, joined.session) : null, [joined, myBookings, sessions, sameDayConflict]);

  const [now, setNow] = useState(Date.now);
  const myBooking = useMemo(() => myBookings.find((b) => b.session_id === id && (SERVER_RULES ? holdsPlace(b as unknown as ServerBookingRow, now) : b.status === 'booked' || b.status === 'checked_in')), [myBookings, id, now]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const next = [joined?.session.starts_at, joined?.session.ends_at].map(value => Date.parse(value ?? '')).filter(at => at > now).sort((a, b) => a - b)[0];
    const timer = window.setTimeout(refresh, Math.min(60000, next ? Math.max(1, next - Date.now()) : 60000));
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [now, joined?.session.starts_at, joined?.session.ends_at]);
  const [navigating, setNavigating] = useState(false), [navigationError, setNavigationError] = useState(false);
  const navigationLock = useRef(false), operation = useRef(0), live = useRef({ data, actor: user.id, role, id, navigationRoute, mounted: true });
  live.current = { data, actor: user.id, role, id, navigationRoute, mounted: true };
  useEffect(() => { live.current.mounted = true; return () => { live.current.mounted = false; }; }, []);
  useEffect(() => { operation.current++; navigationLock.current = false; setNavigating(false); setNavigationError(false); }, [data, user.id, role, id, navigationRoute]);
  const openAdmission = async () => {
    if (!joined || navigationLock.current) return;
    // Production: straight to checkout; capacity, the daily limit and the last spot are the server's answer there.
    if (SERVER_RULES) { nav(`/app/checkout/${joined.session.id}`); return; }
    const captured = live.current, version = ++operation.current;
    const current = () => operation.current === version && live.current.mounted && live.current.data === captured.data && live.current.actor === captured.actor && live.current.role === captured.role && live.current.navigationRoute === captured.navigationRoute && live.current.id === captured.id;
    navigationLock.current = true; setNavigating(true); setNavigationError(false);
    try {
      const fresh = await requireSessionAdmission(data, joined.session.id, { isCurrent: current });
      if (current()) nav(fresh.booked_count >= fresh.capacity ? `/app/waitlist/${fresh.id}` : `/app/checkout/${fresh.id}`);
    } catch { if (current()) setNavigationError(true); }
    finally { if (operation.current === version) { navigationLock.current = false; if (current()) setNavigating(false); } }
  };

  if (!joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/schedule" title={loading ? <Skeleton width={200} height={28} /> : t('customer.class.notFound')} />
        {loading ? <Skeleton shape="rect" height={180} /> : <EmptyState title={t('customer.class.notFound')} body={t('customer.class.notFound.body')} action={<Link to="/app/schedule"><Button>{t('customer.class.backToSchedule')}</Button></Link>} />}
      </div>
    );
  }

  const { session: s, modality: m, teacher: te } = joined;
  const left = s.capacity - s.booked_count;
  const past = new Date(s.ends_at).getTime() <= now;
  const cancelled = s.status === 'cancelled';
  const full = left <= 0;
  const phase = classPhase(s, now);
  const admissionAvailable = SERVER_RULES ? phase === 'open' || phase === 'full' : sessionAdmissionAvailable(s, m, s.template_id ? { id: s.template_id, active: joined.templateActive } : undefined, now);
  const unavailableReason = SERVER_RULES ? phase : sessionUnavailableReason(joined, now) ?? 'unavailable';

  const share = async () => {
    const r = await shareText(`${s.title} · ${formatDate(s.starts_at, lang)} ${formatTime(s.starts_at, lang)} · ${tenant.name}`, window.location.href);
    setShared(r === 'copied' ? t('customer.class.linkCopied') : r === 'shared' ? t('customer.class.shared') : null);
    setTimeout(() => setShared(null), 2500);
  };

  const cta = (): ReactNode => {
    if (myBooking) return <Button block size="lg" variant="secondary" onClick={() => nav(`/app/booking/${myBooking.id}`)}>{t('customer.class.viewBooking')}</Button>;
    if (!admissionAvailable) return <Button block size="lg" variant="secondary" disabled>{t(`site.calendar.status.${unavailableReason}`)}</Button>;
    // Production has no waitlist at launch: a full class says so (the server refuses `occurrence_full` anyway).
    if (SERVER_RULES && full) return <Button block size="lg" variant="secondary" disabled>{t('customer.srv.phase.full')}</Button>;
    if (full) return <Button block size="lg" loading={navigating} disabled={navigating} onClick={() => void openAdmission()}>{myWait && (myWait.status === 'waiting' || myWait.status === 'offered') ? t('customer.class.viewWaitlist') : t('customer.class.joinWaitlist')}</Button>;
    if (conflict) return (
      <div className="stack-sm">
        <Button block size="lg" disabled>{t('core.common.book')}</Button>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.book.oneADay')} <Link to={`/app/class/${conflict}`}>{t('customer.class.seeOther')}</Link></p>
      </div>
    );
    return <Button block size="lg" loading={navigating} disabled={navigating} onClick={() => void openAdmission()}>{ent.hasAnyEntitlement ? t('core.common.book') : ent.trialUsed ? t('customer.class.bookAndPay') : t('customer.class.bookTrial')}</Button>;
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    'HeroImage (placeholder)': () => (
      <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 'var(--r-lg)' }}><ClassThumbnail modality={m}/></div>
    ),
    'TitleBlock (time, duration, room)': () => (
      <div className="stack-sm">
        <div className="row wrap">
          <span className="eyebrow">{formatDate(s.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {cancelled && <Badge tone="danger">{t('customer.schedule.cancelled')}</Badge>}
          {past && !cancelled && <Badge tone="neutral">{t('customer.schedule.done')}</Badge>}
          {myBooking && <Badge tone="primary">{t('customer.home.booked')}</Badge>}
        </div>
        <h1 className="cust-title">{s.title}</h1>
        <p className="cust-class-meta">
          <strong>{formatTime(s.starts_at, lang)} – {formatTime(s.ends_at, lang)}</strong> · {t('core.common.min', { n: durationMin(joined) })} · {roomName(joined)}{s.level !== 'all' ? ` · ${s.level}` : ` · ${t('customer.class.allLevels')}`}
        </p>
      </div>
    ),
    CapacityMeter: () => cancelled ? <StudioCancelledBlock joined={joined} /> : (
      <Card padding="sm" className="row-between wrap">
        <CapacityMeter booked={s.booked_count} capacity={s.capacity} />
        <span className="xs muted">{t('customer.class.capacityNote', { mats: tenant.studio.mats })}</span>
      </Card>
    ),
    AboutSection: () => (
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.class.about')}</h2>
        <SessionEditorial session={s} />
        {m && <div className="row wrap small muted">
          <span>{t('customer.class.intensity')}: {'●'.repeat(m.intensity)}{'○'.repeat(5 - m.intensity)}</span>
          {m.heated && <Badge tone="warn">{t('customer.class.heated')}</Badge>}
        </div>}
      </section>
    ),
    'TeacherCard → TeacherProfile': () => te ? (
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.class.teacher')}</h2>
        <TeacherCard name={te.display_name} bio={te.bio} photo={te.photo_url} rating={te.rating_avg} specialties={m ? [{ label: bi({ es: m.name_es, en: m.name_en }), tone: m.tone }] : []} onClick={() => nav(`/app/teachers/${te.id}`)} />
      </section>
    ) : null,
    'PrepList → Club rules': () => (
      <Card eyebrow={t('customer.class.prep')} padding="md">
        <ul className="cust-checklist">
          <li>{t('customer.class.prep.arrive')}</li>
          {m?.heated ? <li>{t('customer.class.prep.hot')}</li> : <li>{t('customer.class.prep.mat')}</li>}
          <li>{t('customer.class.prep.water')}</li>
        </ul>
        <Link to="/app/rules" className="small">{t('customer.class.rulesLink')} →</Link>
      </Card>
    ),
    'StickyCTA (Reserve / Waitlist)': () => (
      <div className="cust-sticky">
        {navigationError && <Notice tone="warn">{t('core.common.error')}</Notice>}
        {cta()}
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" onClick={share} icon="share">{t('customer.class.share')}</Button>
          {!SERVER_RULES && <Button variant="ghost" size="sm" onClick={() => nav(`/app/invite?session=${s.id}`)} icon="invite">{t('customer.home.quick.invite')}</Button>}
        </div>
        {shared && <Notice tone="success">{shared}</Notice>}
      </div>
    ),
  };

  return (
    <div className="container page cust-page cust-has-sticky">
      <PageHead back="/app/schedule" title={<span className="sr-only">{s.title}</span>} />
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      {!cancelled && !past && full && <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.class.fullNote', { min: policy.claimWindowMinutes })}</p>}
    </div>
  );
}
