import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL } from '../../auth/roles';
import { useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, PaymentRow } from '../../data/schema';
import { isSameDay, formatCOP } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useTodaySessions } from '../website/hooks';
import { usePeople } from './people';
import type { AuditRow } from './audit';
import './staff.css';
import { auditTitle } from './audit';

/** S-01 Role home: live numbers (next class, arrivals, open shifts, payments) and the two counter actions. */
export function StaffHomePage() {
  const { t, bi, lang, dict } = useI18n();
  const nav = useNavigate();
  const { role, can } = useSession();
  const today = useTodaySessions();
  const todayAll = useTodaySessions(true);
  const todayIds = useMemo(() => today.map((x) => x.session.id), [today]);
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds } });
  const { rows: waitlist } = useTable<BaseRow>('waitlist', { where: { status: 'waiting' } });
  const { rows: payments } = useTable<PaymentRow>('payments');
  const { rows: audit } = useTable<AuditRow>('audit_log', { orderBy: { column: 'created_at', dir: 'desc' }, limit: 8 });
  const { byId } = usePeople();
  const now = Date.now();
  const next = today.find((x) => new Date(x.session.ends_at).getTime() > now);
  const arrivals = bookings.filter((b) => b.status === 'checked_in').length;
  const expected = bookings.filter((b) => b.status === 'booked').length;
  const openShifts = today.filter((x) => new Date(x.session.starts_at).getTime() > now).length;
  const paidToday = payments.filter((p) => p.status === 'approved' && p.paid_at && isSameDay(p.paid_at, new Date())).reduce((a, p) => a + p.amount, 0);
  const pending = payments.filter((p) => p.status === 'pending').length;
  const activity: TimelineItem[] = audit.map((a) => ({ id: a.id, at: a.created_at, kind: a.action.startsWith('payment') ? 'payment' : a.action.startsWith('booking') ? 'booking' : a.action.includes('note') ? 'note' : 'system', title: auditTitle(a.action, t, dict), meta: `${byId.get(a.actor_id ?? '')?.name ?? t('staff.home.system')} · ${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ''}` }));

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.home.title')}</h1><p className="muted small">{t('staff.home.role', { role: bi(ROLE_LABEL[role]) })}</p></div></div>
      <div className="grid grid-4">
        <StatTile label={t('staff.home.arrivals')} value={arrivals} hint={t('staff.home.arrivals.hint', { n: expected })} trend={arrivals > 0 ? 'up' : 'flat'} />
        <StatTile label={t('staff.home.openShifts')} value={openShifts} hint={t('staff.home.openShifts.hint', { n: today.length })} />
        <StatTile label={can('payments.read') ? t('staff.home.payments') : t('staff.home.waitlist')} value={can('payments.read') ? formatCOP(paidToday, lang) : waitlist.length} hint={can('payments.read') && pending ? t('staff.home.pending', { n: pending }) : undefined} />
        <StatTile label={t('staff.home.waitlist')} value={waitlist.length} />
      </div>
      <div className="grid grid-2">
        <div className="stack">
          <section className="stack-sm">
            <div className="eyebrow">{t('staff.home.next')}</div>
            {next
              ? <ClassCard variant="next" title={next.session.title} teacher={next.teacher?.display_name ?? ''} startsAt={next.session.starts_at} endsAt={next.session.ends_at} movement={next.modality?.movement ?? 'fluye'} booked={next.session.booked_count} capacity={next.session.capacity} cta={can('checkin.write') ? { label: t('staff.home.openCheckin'), onClick: () => nav(`/staff/checkin?session=${next.session.id}`) } : undefined} />
              : <EmptyState compact title={t('staff.home.next.empty')} />}
          </section>
          <Card title={t('staff.home.todayClasses')} padding="sm">
            {todayAll.length === 0 && <p className="muted small" style={{ padding: 12 }}>{t('staff.home.todayClasses.empty')}</p>}
            {todayAll.map(({ session: s, modality: m, teacher: te }) => <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} onClick={can('checkin.write') ? () => nav(`/staff/checkin?session=${s.id}`) : undefined} />)}
          </Card>
        </div>
        <div className="stack">
          <Card title={t('staff.home.quick')}>
            <div className="stack-sm">
              {can('checkin.write') && <Link to="/staff/checkin"><Button block>{t('staff.home.openCheckin')}</Button></Link>}
              {can('payments.write') && <Link to="/staff/register"><Button block variant="secondary">{t('staff.home.openRegister')}</Button></Link>}
              {can('bookings.write_any') && <Link to="/staff/rooms"><Button block variant="secondary">{t('staff.home.openRooms')}</Button></Link>}
              {can('members.read') && <Link to="/admin/crm"><Button block variant="ghost">{t('staff.home.openCrm')}</Button></Link>}
              {can('tables.read') && <Link to="/admin/tables"><Button block variant="ghost">{t('staff.home.openTables')}</Button></Link>}
            </div>
          </Card>
          <Card title={t('staff.home.activity')} padding="sm" actions={can('audit.read') ? <Link to="/admin/activity" className="small">{t('core.common.viewAll')}</Link> : undefined}>
            <div style={{ padding: '0 8px' }}><Timeline items={activity} limit={6} /></div>
            <p className="xs muted" style={{ padding: 8 }}>{t('staff.home.activity.note')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
