import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL } from '../../auth/roles';
import { formatCOP } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { ConversationList } from '../../components/organism/ConversationList/ConversationList';
import type { ConversationSummary } from '../../components/organism/ConversationList/ConversationList';
import { messageAt } from '../../components/organism/MessageThread/MessageThread';
import { isConversationRow } from '../../data/comms';
import { tenant } from '../../tenant/tenant';
import { projectHome } from './homeData';
import { useHomeData } from './useHomeData';
import type { AuditRow } from './audit';
import './staff.css';
import { auditTitle } from './audit';

/** S-01 Role home: live numbers (next class, arrivals, open shifts, payments, unread messages), the counter actions and the latest conversations (→ S-06). */
export function StaffHomePage() {
  const { t, bi, lang, dict } = useI18n();
  const nav = useNavigate();
  const { role, can } = useSession();
  const { snapshot, status, now, retry } = useHomeData();
  const { today, todayAll, next, arrivals, expected, openShifts, paidToday, pending, waitlist, profiles, messages } = projectHome(snapshot, tenant.id, now);
  const byId = new Map(profiles.map(p => [p.user_id, { name: p.full_name }]));
  const groups = new Map<string, typeof messages>();
  for (const message of messages.filter(isConversationRow)) groups.set(message.user_id!, [...(groups.get(message.user_id!) ?? []), message]);
  const recent: ConversationSummary[] = [...groups].map(([key, rows]) => {
    const sorted = [...rows].sort((a, b) => messageAt(a).localeCompare(messageAt(b)));
    const last = sorted[sorted.length - 1], profile = profiles.find(p => p.user_id === key);
    return { key, name: profile?.full_name ?? key, initials: profile?.initials ?? undefined, snippet: (last.channel === 'email' && last.subject) || last.body || last.template_key || '', lastAt: messageAt(last), unread: rows.filter(m => m.direction === 'inbound' && !m.read_at).length, channel: last.channel, channels: [...new Set(rows.map(m => m.channel))] };
  }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  const unreadMsgs = recent.reduce((sum, c) => sum + (c.unread ?? 0), 0);
  const unreadThreads = recent.filter(c => (c.unread ?? 0) > 0).length;
  const audit = [...(snapshot.audit_log as AuditRow[])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const activity: TimelineItem[] = audit.map((a) => ({ id: a.id, at: a.created_at, kind: a.action.startsWith('payment') ? 'payment' : a.action.startsWith('booking') ? 'booking' : a.action.includes('note') ? 'note' : 'system', title: auditTitle(a.action, t, dict), meta: `${byId.get(a.actor_id ?? '')?.name ?? t('staff.home.system')} · ${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ''}` }));

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.home.title')}</h1><p className="muted small">{t('staff.home.role', { role: bi(ROLE_LABEL[role]) })}</p></div></div>
      {status !== 'ready' ? <EmptyState compact tone={status === 'error' ? 'error' : 'loading'} title={t(status === 'error' ? 'core.common.error' : 'core.common.loading')} action={status === 'error' ? <Button onClick={retry}>{t('core.common.retry')}</Button> : undefined} /> : <>
      <div className="grid grid-4">
        <StatTile label={t('staff.home.arrivals')} value={arrivals} hint={t('staff.home.arrivals.hint', { n: expected })} trend={arrivals > 0 ? 'up' : 'flat'} />
        <StatTile label={t('staff.home.openShifts')} value={openShifts} hint={t('staff.home.openShifts.hint', { n: today.length })} />
        <StatTile label={can('payments.read') ? t('staff.home.payments') : t('staff.home.waitlist')} value={can('payments.read') ? formatCOP(paidToday, lang) : waitlist.length} hint={can('payments.read') && pending ? t('staff.home.pending', { n: pending }) : undefined} />
        {can('members.read')
          ? <StatTile label={t('staff.home.unread')} value={unreadMsgs} hint={unreadThreads ? t('staff.home.unread.hint', { n: unreadThreads }) : undefined} trend={unreadMsgs > 0 ? 'down' : 'flat'} />
          : <StatTile label={t('staff.home.waitlist')} value={waitlist.length} />}
      </div>
      {can('payments.read') && ['super_admin', 'admin', 'front_desk'].includes(role) && <Link to="/staff/transfers"><Button variant="secondary" block>{t('transfers.title')} · {t('staff.home.pending', { n: pending })}</Button></Link>}
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
              {can('bookings.write_any') && <Link to="/staff/rooms"><Button block variant="secondary" icon="rooms">{t('staff.home.openRooms')}</Button></Link>}
              {can('members.read') && <Link to="/staff/inbox"><Button block variant="secondary" icon="inbox">{t('staff.home.openInbox')}</Button></Link>}
              {can('members.read') && <Link to="/admin/crm"><Button block variant="ghost" icon="crm">{t('staff.home.openCrm')}</Button></Link>}
              {can('tables.read') && <Link to="/admin/tables"><Button block variant="ghost" icon="table">{t('staff.home.openTables')}</Button></Link>}
            </div>
          </Card>
          {can('members.read') && (
            <Card title={t('staff.home.messages')} padding="sm" className="home-msgs" actions={<Link to="/staff/inbox" className="small">{t('core.common.viewAll')}</Link>}>
              {recent.length === 0 ? <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('staff.home.messages.empty')}</p> : <ConversationList compact limit={5} conversations={recent} linkTo={(k) => `/staff/inbox/${k}`} />}
            </Card>
          )}
          <Card title={t('staff.home.activity')} padding="sm" actions={can('audit.read') ? <Link to="/admin/activity" className="small">{t('core.common.viewAll')}</Link> : undefined}>
            <div style={{ padding: '0 var(--sp-sm)' }}><Timeline items={activity} limit={6} /></div>
            <p className="xs muted" style={{ padding: 'var(--sp-sm)' }}>{t('staff.home.activity.note')}</p>
          </Card>
        </div>
      </div>
      </>}
    </div>
  );
}
