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
import { useTodaySessions } from '../website/hooks';

/** S-01 Role home: today's numbers and the two counter actions. */
export function StaffHomePage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { role, can } = useSession();
  const today = useTodaySessions();
  const { rows: waitlist } = useTable<BaseRow>('waitlist', { where: { status: 'waiting' } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { status: 'approved' } });
  const booked = today.reduce((a, x) => a + x.session.booked_count, 0);
  const cap = today.reduce((a, x) => a + x.session.capacity, 0);
  const paidToday = payments.filter((p) => p.paid_at && isSameDay(p.paid_at, new Date())).reduce((a, p) => a + p.amount, 0);
  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.home.title')}</h1><p className="muted small">{t('staff.home.role', { role: bi(ROLE_LABEL[role]) })}</p></div></div>
      <div className="grid grid-4">
        <StatTile label={t('staff.home.todayClasses')} value={today.length} />
        <StatTile label={t('staff.home.bookings')} value={booked} hint={`${cap} mats`} />
        <StatTile label={t('staff.home.occupancy')} value={cap ? `${Math.round((booked / cap) * 100)}%` : '—'} trend={booked / Math.max(1, cap) > 0.7 ? 'up' : 'flat'} />
        <StatTile label={can('payments.read') ? t('staff.home.payments') : t('staff.home.waitlist')} value={can('payments.read') ? formatCOP(paidToday, lang) : waitlist.length} />
      </div>
      <div className="grid grid-2">
        <Card title={t('staff.home.todayClasses')} padding="sm">
          {today.map(({ session: s, modality: m, teacher: te }) => <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} onClick={() => nav(`/staff/checkin?session=${s.id}`)} />)}
        </Card>
        <Card title={t('staff.home.quick')}>
          <div className="stack-sm">
            <Link to="/staff/checkin"><Button block>{t('staff.home.openCheckin')}</Button></Link>
            {can('payments.write') && <Link to="/staff/register"><Button block variant="secondary">{t('staff.home.openRegister')}</Button></Link>}
            {can('tables.read') && <Link to="/admin/tables"><Button block variant="ghost">{t('staff.home.openTables')}</Button></Link>}
          </div>
        </Card>
      </div>
    </div>
  );
}
