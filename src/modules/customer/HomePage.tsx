import { useMemo, type ReactNode } from 'react';
import { SplitSections } from './split';
import { useActions } from '../../actions';
import { useAppNavHandlers } from './actions';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { BookingRow, CreditRow, MembershipRow } from '../../data/schema';
import { formatDate, isSameDay } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { canvasSpecs } from './specs';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { useSessionsJoined } from '../website/hooks';
import { EmptyHomeBlock } from './pages/blocks';
import './customer.css';
import { Icon } from '../../components/atom/Icon/Icon';

const spec = canvasSpecs['C-01'];
const HOME_SIDE = new Set(['MembershipNudge (if no plan)', 'AnnouncementCard (if active)', 'QuickActions ×4', 'StatsRow ×3', 'FeedbackPrompt (conditional)']);

/** C-01 Home. Sections come from the layout editor order; each block is independently toggleable later via feature_flags. */
export function CustomerHomePage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const { sections, isVisible } = useLayout(spec);
  useActions(spec, useAppNavHandlers());

  const { rows: myBookings, loading: bookingsLoading } = useTable<BookingRow>('bookings', { where: { user_id: user.id } });
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { user_id: user.id, status: 'active' } });
  const { rows: credits } = useTable<CreditRow>('credits', { where: { user_id: user.id } });
  const all = useSessionsJoined();
  const now = Date.now();

  const activeBookingIds = useMemo(() => new Set(myBookings.filter((b) => b.status === 'booked').map((b) => b.session_id)), [myBookings]);
  const next = useMemo(() => all.filter((x) => activeBookingIds.has(x.session.id) && new Date(x.session.ends_at).getTime() > now && x.session.status === 'scheduled').sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at))[0], [all, activeBookingIds, now]);
  const today = useMemo(() => {
    // 0030: plain start-time order (the A-05 intention sort is retired with the question)
    return all.filter((x) => isSameDay(x.session.starts_at, new Date()) && x.session.status === 'scheduled' && new Date(x.session.ends_at).getTime() > now);
  }, [all, now]);
  const monthCount = myBookings.filter((b) => b.status === 'checked_in' && new Date(b.created_at).getMonth() === new Date().getMonth()).length;
  const creditBalance = credits.reduce((a, c) => a + c.delta, 0);
  const membership = memberships[0];

  const book = (sessionId: string) => nav(`/app/checkout/${sessionId}`);

  const SECTIONS: Record<string, () => ReactNode> = {
    'TopBar (logo, avatar, bell)': () => <h1 className="cust-greeting">{t('customer.home.greeting', { name: user.name.split(' ')[0] })}</h1>,
    'FeedbackPrompt (conditional)': () => null,
    'MembershipNudge (if no plan)': () => membership
      ? <p className="small muted">{t('customer.home.membership.active', { date: formatDate(membership.renews_at ?? membership.starts_at, lang) })}</p>
      : <Card tone="highlight" className="row-between wrap"><span className="small">{t('customer.home.membership.nudge')}</span><Link to="/app/plans"><Button size="sm" variant="secondary">{t('customer.home.membership.cta')}</Button></Link></Card>,
    'AnnouncementCard (if active)': () => <Card tone="muted" eyebrow={t('customer.home.announcement')}><p className="small">{t('customer.home.announcement.body')}</p></Card>,
    'NextClassCard + countdown': () => (
      <section className="stack-sm">
        <div className="eyebrow">{t('customer.home.next')}</div>
        {next
          ? <ClassCard variant="next" title={next.session.title} teacher={next.teacher?.display_name ?? ''} room="Sala principal" startsAt={next.session.starts_at} endsAt={next.session.ends_at} movement={next.modality?.movement ?? 'fluye'} booked={next.session.booked_count} capacity={next.session.capacity} cta={{ label: t('customer.home.view'), onClick: () => nav(`/app/class/${next.session.id}`) }} />
          : <Card className="row-between wrap"><span className="muted small">{t('customer.home.next.empty')}</span><Link to="/app/schedule"><Button size="sm">{t('customer.home.next.cta')}</Button></Link></Card>}
      </section>
    ),
    'QuickActions ×4': () => (
      <div className="cust-quick">
        {([['/app/schedule', 'schedule', 'schedule'], ['/app/schedule', 'calendar-plus', 'book'], ['/app/plans', 'ticket', 'plans'], ['/app/invite', 'invite', 'invite']] as const).map(([to, icon, k]) => <Link key={k} to={to} className="cust-quick-btn"><span className="cust-quick-icon" aria-hidden><Icon name={icon} size="lg" /></span><span>{t(`customer.home.quick.${k}`)}</span></Link>)}
      </div>
    ),
    'TodayList': () => (
      <section className="stack-sm">
        <div className="eyebrow">{t('customer.home.today')}</div>
        <Card padding="sm">
          {today.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('customer.home.today.empty')}</p>}
          {today.map(({ session: s, modality: m, teacher: te }) => (
            <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} booked_by_me={activeBookingIds.has(s.id)} onClick={() => (activeBookingIds.has(s.id) ? nav(`/app/class/${s.id}`) : s.booked_count >= s.capacity ? nav(`/app/waitlist/${s.id}`) : book(s.id))} />
          ))}
        </Card>
      </section>
    ),
    'StatsRow ×3': () => (
      <div className="grid grid-3">
        <StatTile label={t('customer.home.stats.classes')} value={monthCount} trend={monthCount > 4 ? 'up' : 'flat'} />
        <StatTile label={t('customer.home.stats.streak')} value={t('customer.home.stats.weeks', { n: Math.min(8, Math.ceil(monthCount / 2) + 1) })} />
        <StatTile label={t('customer.home.stats.credits')} value={membership ? '∞' : creditBalance} />
      </div>
    ),
    'EventsStrip → BottomNav': () => null,
  };

  // E-01: day one — no booking, no history — teaches the next step instead of empty containers.
  if (!bookingsLoading && myBookings.length === 0) return <div className="container page"><EmptyHomeBlock /></div>;

  return (
    <div className="container page cust-home">
      {/* ≥ 900 px: greeting across, next class + today on the left, membership / notice / quick actions / stats on the right. */}
      <SplitSections className="cust-home-split" names={sections.filter(isVisible)} render={(n) => SECTIONS[n]?.() ?? null}
        full={(n) => n === 'TopBar (logo, avatar, bell)'} side={(n) => HOME_SIDE.has(n)} />
    </div>
  );
}
