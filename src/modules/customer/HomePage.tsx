import { Fragment, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BookingRow, CreditRow, IntentionRow, MembershipRow } from '../../data/schema';
import { formatDate, isSameDay } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { movements, type Movement } from '../../design/tokens';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Chip } from '../../components/atom/Chip/Chip';
import { Button } from '../../components/atom/Button/Button';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { useSessionsJoined } from '../website/hooks';
import { EmptyHomeBlock } from './pages/blocks';
import './customer.css';

const spec = canvasSpecs['C-01'];
const todayKey = () => new Date().toISOString().slice(0, 10);

/** C-01 Home. Sections come from the layout editor order; each block is independently toggleable later via feature_flags. */
export function CustomerHomePage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  const { sections, isVisible } = useLayout(spec);

  const { rows: myBookings, loading: bookingsLoading } = useTable<BookingRow>('bookings', { where: { user_id: user.id } });
  const { rows: intentions } = useTable<IntentionRow>('intentions', { where: { user_id: user.id, date: todayKey() } });
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { user_id: user.id, status: 'active' } });
  const { rows: credits } = useTable<CreditRow>('credits', { where: { user_id: user.id } });
  const all = useSessionsJoined();
  const intention = intentions[0];
  const now = Date.now();

  const activeBookingIds = useMemo(() => new Set(myBookings.filter((b) => b.status === 'booked').map((b) => b.session_id)), [myBookings]);
  const next = useMemo(() => all.filter((x) => activeBookingIds.has(x.session.id) && new Date(x.session.ends_at).getTime() > now && x.session.status === 'scheduled').sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at))[0], [all, activeBookingIds, now]);
  const today = useMemo(() => {
    const list = all.filter((x) => isSameDay(x.session.starts_at, new Date()) && x.session.status === 'scheduled' && new Date(x.session.ends_at).getTime() > now);
    // rule: today's list re-orders by the day's intention
    if (!intention) return list;
    return [...list].sort((a, b) => Number(b.modality?.movement === intention.movement) - Number(a.modality?.movement === intention.movement));
  }, [all, intention, now]);
  const monthCount = myBookings.filter((b) => b.status === 'checked_in' && new Date(b.created_at).getMonth() === new Date().getMonth()).length;
  const creditBalance = credits.reduce((a, c) => a + c.delta, 0);
  const membership = memberships[0];

  const setIntention = async (mv: Movement) => {
    if (intention) await data.update('intentions', intention.id, { movement: mv });
    else await data.insert('intentions', { user_id: user.id, date: todayKey(), movement: mv });
  };
  const book = async (sessionId: string) => {
    const s = all.find((x) => x.session.id === sessionId)?.session;
    if (!s) return;
    const sameDay = myBookings.some((b) => b.status === 'booked' && all.find((x) => x.session.id === b.session_id && isSameDay(x.session.starts_at, s.starts_at)));
    if (sameDay && tenant.studio.perPersonPerDay === 1) { alert(t('customer.book.oneADay')); return; }
    await data.insert('bookings', { user_id: user.id, session_id: sessionId, status: 'booked', paid_with: membership ? 'membership' : 'credit', credit_id: null, checked_in_at: null, cancelled_at: null, rated: false });
    await data.update('class_sessions', sessionId, { booked_count: s.booked_count + 1 });
  };

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
        {[['/app/schedule', '▦', 'schedule'], ['/app/schedule', '＋', 'book'], ['/app/plans', '◇', 'plans'], ['/app/invite', '✉', 'invite']].map(([to, icon, k]) => <Link key={k} to={to} className="cust-quick-btn"><span aria-hidden>{icon}</span><span>{t(`customer.home.quick.${k}`)}</span></Link>)}
      </div>
    ),
    'TodayList (intention-sorted)': () => (
      <section className="stack-sm">
        <Card className="stack-sm" tone={intention ? 'surface' : 'muted'}>
          <div className="row-between wrap">
            <strong className="small">{intention ? t('customer.home.intention.done', { mv: movements[intention.movement].label }) : t('customer.home.intention.q')}</strong>
            {intention && <button type="button" className="xs muted" style={{ border: 0, background: 'none' }} onClick={() => data.remove('intentions', intention.id)}>{t('customer.home.intention.change')}</button>}
          </div>
          {!intention && <><div className="row wrap">{(Object.keys(movements) as Movement[]).map((mv) => <Chip key={mv} movement={mv} dot onClick={() => setIntention(mv)}>{movements[mv].label}</Chip>)}</div><p className="xs muted">{t('customer.home.intention.hint')}</p></>}
        </Card>
        <div className="eyebrow">{t('customer.home.today')}</div>
        <Card padding="sm">
          {today.length === 0 && <p className="muted small" style={{ padding: 12 }}>{t('customer.home.today.empty')}</p>}
          {today.map(({ session: s, modality: m, teacher: te }) => (
            <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} booked_by_me={activeBookingIds.has(s.id)} onClick={() => (activeBookingIds.has(s.id) ? nav(`/app/class/${s.id}`) : book(s.id))} />
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
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </div>
  );
}
