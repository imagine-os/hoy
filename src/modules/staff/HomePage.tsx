import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL } from '../../auth/roles';
import { useTable } from '../../data/DataContext';
import type { BaseRow, PaymentRow } from '../../data/schema';
import { isSameDay, formatCOP } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { ConversationList } from '../../components/organism/ConversationList/ConversationList';
import { toSummary, useConversations } from '../../data/comms';
import { useTodaySessions } from '../website/hooks';
import { usePeople } from './people';
import type { AuditRow } from './audit';
import './staff.css';
import { auditTitle } from './audit';
import { useDeskFigures } from './desk/useDesk';
import { useLiveUpdates } from '../../data/companyos/hooks';
import { isLaunchRoute } from '../../config/launchRoutes';
import { PRODUCTION_BUILD } from '../../config/launch';

/** A quick link shows only when its page exists in this build (the production build registers only the launch routes). */
const shipped = (path: string) => !PRODUCTION_BUILD || isLaunchRoute(path);

/** S-01 Role home: live numbers (next class, arrivals, open shifts, payments, unread messages), the counter actions and the latest conversations (→ S-06). */
export function StaffHomePage() {
  // Contract §1: this screen polls Company OS every 20 s in the production build (no-op on the review build).
  useLiveUpdates(['bookings', 'class_sessions', 'payments']);
  const { t, bi, lang, dict } = useI18n();
  const nav = useNavigate();
  const { role, can } = useSession();
  const today = useTodaySessions();
  const todayAll = useTodaySessions(true);
  const figures = useDeskFigures();
  const { rows: waitlist } = useTable<BaseRow>('waitlist', { where: { status: 'waiting' } });
  const { rows: payments } = useTable<PaymentRow>('payments');
  const { rows: audit } = useTable<AuditRow>('audit_log', { orderBy: { column: 'created_at', dir: 'desc' }, limit: 8 });
  const { byId } = usePeople();
  const { conversations } = useConversations();
  const unreadMsgs = conversations.reduce((a, c) => a + c.unread, 0);
  const unreadThreads = conversations.filter((c) => c.unread > 0).length;
  const recent = useMemo(() => conversations.map(toSummary), [conversations]);
  const now = Date.now();
  // RC-01: arrivals, expected, pending payments and the next class come from one source (useDeskFigures), the same as Check-in.
  const next = todayAll.find((x) => x.session.id === figures.next?.id);
  const arrivals = figures.arrivals;
  const expected = figures.expected;
  const openShifts = today.filter((x) => new Date(x.session.starts_at).getTime() > now).length;
  const paidToday = payments.filter((p) => p.status === 'approved' && p.paid_at && isSameDay(p.paid_at, new Date())).reduce((a, p) => a + p.amount, 0);
  const pending = figures.pendingPayments;
  const activity: TimelineItem[] = audit.map((a) => ({ id: a.id, at: a.created_at, kind: a.action.startsWith('payment') ? 'payment' : a.action.startsWith('booking') ? 'booking' : a.action.includes('note') ? 'note' : 'system', title: auditTitle(a.action, t, dict), meta: `${byId.get(a.actor_id ?? '')?.name ?? t('staff.home.system')} · ${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ''}` }));

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.home.title')}</h1><p className="muted small">{t('staff.home.role', { role: bi(ROLE_LABEL[role]) })}</p></div></div>
      <div className="grid grid-4">
        <StatTile label={t('staff.home.arrivals')} value={arrivals} hint={t('staff.home.arrivals.hint', { n: expected })} trend={arrivals > 0 ? 'up' : 'flat'} />
        <StatTile label={t('staff.home.openShifts')} value={openShifts} hint={t('staff.home.openShifts.hint', { n: today.length })} />
        {/* Q-13: today's takings are income — `revenue.read` only; reception sees how many payments wait for review. */}
        {can('revenue.read')
          ? <StatTile label={t('staff.home.payments')} value={formatCOP(paidToday, lang)} hint={pending ? t('staff.home.pending', { n: pending }) : undefined} />
          : can('payments.read')
            ? <StatTile label={t('staff.home.paymentsPending')} value={pending} />
            : <StatTile label={t('staff.home.waitlist')} value={waitlist.length} />}
        {can('members.read')
          ? <StatTile label={t('staff.home.unread')} value={unreadMsgs} hint={unreadThreads ? t('staff.home.unread.hint', { n: unreadThreads }) : undefined} trend={unreadMsgs > 0 ? 'down' : 'flat'} />
          : <StatTile label={t('staff.home.waitlist')} value={waitlist.length} />}
      </div>
      <div className="grid grid-2">
        <div className="stack">
          <section className="stack-sm">
            <div className="eyebrow">{t('staff.home.next')}</div>
            {next
              ? <ClassCard variant="next" title={next.session.title} teacher={next.teacher?.display_name ?? ''} startsAt={next.session.starts_at} endsAt={next.session.ends_at} tone={next.modality?.tone ?? 'river'} booked={next.session.booked_count} capacity={next.session.capacity} cta={can('checkin.write') ? { label: t('staff.home.openCheckin'), onClick: () => nav(`/staff/checkin?session=${next.session.id}`) } : undefined} />
              : <EmptyState compact title={t('staff.home.next.empty')} />}
          </section>
          <Card title={t('staff.home.todayClasses')} padding="sm">
            {todayAll.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('staff.home.todayClasses.empty')}</p>}
            {todayAll.map(({ session: s, modality: m, teacher: te }) => <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} tone={m?.tone ?? 'river'} booked={s.booked_count} capacity={s.capacity} onClick={can('checkin.write') ? () => nav(`/staff/checkin?session=${s.id}`) : undefined} />)}
          </Card>
        </div>
        <div className="stack">
          <Card title={t('staff.home.quick')}>
            <div className="stack-sm">
              {can('checkin.write') && <Link to="/staff/checkin"><Button block icon="checkin">{t('staff.home.openCheckin')}</Button></Link>}
              {can('payments.write') && <Link to="/staff/register"><Button block variant="secondary" icon="register">{t('staff.home.openRegister')}</Button></Link>}
              {can('bookings.write_any') && shipped('/staff/rooms') && <Link to="/staff/rooms"><Button block variant="secondary" icon="rooms">{t('staff.home.openRooms')}</Button></Link>}
              {can('members.read') && <Link to="/staff/inbox"><Button block variant="secondary" icon="inbox">{t('staff.home.openInbox')}</Button></Link>}
              {can('members.read') && shipped('/admin/crm') && <Link to="/admin/crm"><Button block variant="ghost" icon="crm">{t('staff.home.openCrm')}</Button></Link>}
              {can('tables.read') && shipped('/admin/tables') && <Link to="/admin/tables"><Button block variant="ghost" icon="table">{t('staff.home.openTables')}</Button></Link>}
            </div>
          </Card>
          {can('members.read') && (
            <Card title={t('staff.home.messages')} padding="sm" className="home-msgs" actions={<Link to="/staff/inbox" className="small">{t('core.common.viewAll')}</Link>}>
              {recent.length === 0 ? <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('staff.home.messages.empty')}</p> : <ConversationList compact limit={5} conversations={recent} linkTo={(k) => `/staff/inbox/${k}`} />}
            </Card>
          )}
          {/* `audit_log` is a write-only sink in the production build (nothing to read), so the timeline is review-build only. */}
          {!PRODUCTION_BUILD && (
            <Card title={t('staff.home.activity')} padding="sm" actions={can('audit.read') ? <Link to="/admin/activity" className="small">{t('core.common.viewAll')}</Link> : undefined}>
              <div style={{ padding: '0 var(--sp-sm)' }}><Timeline items={activity} limit={6} /></div>
              <p className="xs muted" style={{ padding: 'var(--sp-sm)' }}>{t('staff.home.activity.note')}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
