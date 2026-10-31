import { Fragment, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { BookingRow, MembershipRow, PaymentRow } from '../../data/schema';
import { formatCOP, formatDate, formatTime, isSameDay, MS, addDays, dateKey } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Badge } from '../../components/atom/Badge/Badge';
import { CapacityMeter } from '../../components/molecule/CapacityMeter/CapacityMeter';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { BarList } from '../../components/molecule/BarList/BarList';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { useSessionsJoined } from '../website/hooks';
import type { AuditRow } from '../staff/audit';
import { usePeople } from '../staff/people';
import { M01, M12 } from './specs';
import './admin.css';
import { auditTitle } from '../staff/audit';
import { useCosQueries } from '../staff/desk/useCos';
import { ACTIVE_PACK_QUERIES, activePackCustomers } from './activePacks';
import { PRODUCTION_BUILD } from '../../config/launch';

const str = (v: unknown) => (typeof v === 'string' ? v : null);
const fieldsOf = (r: Record<string, unknown>): Record<string, unknown> => (r.data && typeof r.data === 'object' ? r.data as Record<string, unknown> : r);
/** The review build's active memberships (MockProvider). The production build never reads `memberships` (no adapter). */
const useReviewMemberships: () => MembershipRow[] = PRODUCTION_BUILD ? () => [] : () => useTable<MembershipRow>('memberships', { where: { status: 'active' } }).rows;

/**
 * M-01 — KPI row, occupancy chart, today at a glance and the audit trail; sections via useLayout.
 * The feature switches moved to M-08b (/admin/settings/features) — the dashboard reads, it does not configure.
 */
export function DashboardPage() {
  const { t, lang, dict } = useI18n();
  const { can, hasRole } = useSession();
  const { sections, isVisible } = useLayout(M01);
  // R-05 (Hoy all-roles): production counts customers with an active pack from Company OS credits (two queries, the
  // balance a server aggregate); `memberships` has no adapter there. The review build keeps counting its membership
  // rows (`request` is null outside production). A role that may not read credits sees "—", not a crash.
  const packs = useCosQueries(ACTIVE_PACK_QUERIES);
  const memberships = useReviewMemberships();
  const packRows = packs.rows;
  const members: number | string = !packs.request ? memberships.length : packs.error ? '—' : !packRows ? '…' : activePackCustomers({
    // `/query` rows carry their fields under `data` (integration guide §4); aggregate rows are flat.
    lots: packRows.lots.map((l) => fieldsOf(l)).map((d, i) => ({ id: packRows.lots[i].id, person: str(d.person) ?? '', valid_from: str(d.valid_from), valid_until: str(d.valid_until) })),
    left: packRows.left.map((x) => ({ lot: str(x.lot) ?? '', left: typeof x.left === 'number' ? x.left : Number(x.left) })),
    today: dateKey(new Date()),
  });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { status: 'approved' } });
  const { rows: log } = useTable<AuditRow>('audit_log', { orderBy: { column: 'created_at', dir: 'desc' }, limit: 10 });
  const { byId } = usePeople();
  const since = Date.now() - 30 * MS.day;
  const revenue = payments.filter((p) => p.paid_at && new Date(p.paid_at).getTime() > since).reduce((a, p) => a + p.amount, 0);
  const week = useSessionsJoined((s) => s.status !== 'cancelled' && Math.abs(new Date(s.starts_at).getTime() - Date.now()) < 3.5 * MS.day);
  const occ = week.length ? Math.round((week.reduce((a, x) => a + x.session.booked_count, 0) / week.reduce((a, x) => a + x.session.capacity, 0)) * 100) : 0;
  const todayIds = useMemo(() => week.filter((x) => isSameDay(x.session.starts_at, new Date())).map((x) => x.session.id), [week]);
  const { rows: todayBookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds, status: 'checked_in' } });
  const days = useMemo(() => {
    const out: { id: string; label: string; value: number; hint?: string }[] = [];
    for (let d = -3; d <= 3; d++) {
      const day = addDays(new Date(), d);
      const ss = week.filter((x) => isSameDay(x.session.starts_at, day));
      const cap = ss.reduce((a, x) => a + x.session.capacity, 0);
      out.push({ id: String(d), label: formatDate(day.toISOString(), lang, { weekday: 'short', day: 'numeric' }), value: cap ? Math.round((ss.reduce((a, x) => a + x.session.booked_count, 0) / cap) * 100) : 0, hint: d === 0 ? t('core.common.today') : undefined });
    }
    return out;
  }, [week, lang, t]);
  const today = useMemo(() => week.filter((x) => isSameDay(x.session.starts_at, new Date())).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at)), [week]);
  const checkedInBySession = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of todayBookings) m.set(b.session_id, (m.get(b.session_id) ?? 0) + 1);
    return m;
  }, [todayBookings]);
  const trail: TimelineItem[] = log.map((a) => ({ id: a.id, at: a.created_at, kind: a.action.startsWith('payment') ? 'payment' : a.action.startsWith('booking') || a.action.startsWith('attendance') ? 'booking' : a.action.includes('note') ? 'note' : 'system', title: auditTitle(a.action, t, dict), meta: `${byId.get(a.actor_id ?? '')?.name ?? t('admin.dashboard.system')} · ${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ''}${a.diff?.source ? ` · ${a.diff.source}` : ''}` }));

  const SECTIONS: Record<string, () => ReactNode> = {
    'KPIRow ×4': () => (
      <div className="grid grid-4">
        <div data-members-tile><StatTile label={t('admin.dashboard.members')} value={members} hint={packs.request ? t('admin.dashboard.members.packs') : undefined} trend="up" /></div>
        <StatTile label={t('admin.dashboard.revenue')} value={formatCOP(revenue, lang)} />
        <StatTile label={t('admin.dashboard.occupancy')} value={`${occ}%`} trend={occ > 70 ? 'up' : 'flat'} />
        <StatTile label={t('admin.dashboard.arrivals')} value={todayBookings.length} hint={t('admin.dashboard.arrivals.hint', { n: todayIds.length })} />
      </div>
    ),
    'OccupancyChart': () => (
      <Card title={t('admin.dashboard.occChart')} eyebrow={t('admin.dashboard.occChart.eyebrow')} actions={hasRole(M12.roles) ? <Link to="/admin/analytics" className="small">{t('admin.dashboard.analyticsLink')}</Link> : undefined}>
        <BarList items={days} max={100} emphasizeId="0" format={(v) => `${v}%`} />
      </Card>
    ),
    'TodayAtAGlance': () => (
      <Card title={t('admin.dashboard.today')} eyebrow={t('admin.dashboard.today.eyebrow')} actions={can('checkin.write') ? <Link to="/staff/checkin" className="small">{t('core.nav.checkin')}</Link> : undefined}>
        {today.length === 0 ? <EmptyState compact title={t('admin.dashboard.today.empty')} /> : (
          <div>
            {today.map(({ session, modality, teacher }) => {
              const inRoom = checkedInBySession.get(session.id) ?? 0;
              return (
                <div key={session.id} className="adm-today">
                  <span className="adm-today-time">{formatTime(session.starts_at, lang)}</span>
                  <div className="adm-today-what">
                    <div className="small">{modality ? (lang === 'en' ? modality.name_en : modality.name_es) : session.modality_id}{teacher ? ` · ${teacher.display_name}` : ''}</div>
                    <CapacityMeter booked={session.booked_count} capacity={session.capacity} />
                  </div>
                  <div className="row">
                    <span className="xs muted">{t('admin.dashboard.today.inRoom', { n: inRoom })}</span>
                    {session.booked_count >= session.capacity && <Badge tone="warn">{t('core.common.full')}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    ),
    'AuditTrail': () => (
      <Card title={t('admin.dashboard.audit')} actions={can('audit.read') ? <Link to="/admin/activity" className="small">{t('core.common.viewAll')}</Link> : undefined}>
        <Timeline items={trail} limit={8} />
      </Card>
    ),
  };

  return (
    <div className="stack">
      <div className="page-head"><h1>{t('admin.dashboard.title')}</h1></div>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </div>
  );
}
