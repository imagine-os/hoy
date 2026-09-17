import { Fragment, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, MembershipRow, PaymentRow } from '../../data/schema';
import { formatCOP, formatDate, isSameDay } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { BarList } from '../../components/molecule/BarList/BarList';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { useSessionsJoined } from '../website/hooks';
import { useAudit, type AuditRow } from '../staff/audit';
import { usePeople } from '../staff/people';
import { M01 } from './specs';
import './admin.css';

interface FlagRow extends BaseRow { key: string; page_code: string | null; label: string; enabled: boolean }
const LOCKED_PAGES = ['A-06', 'E-04'];

/** M-01 — KPI row, occupancy chart, feature switches (audited) and the audit trail; sections via useLayout. */
export function DashboardPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { can } = useSession();
  const audit = useAudit('admin');
  const { sections, isVisible } = useLayout(M01);
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { status: 'active' } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { status: 'approved' } });
  const { rows: flags } = useTable<FlagRow>('feature_flags', { orderBy: { column: 'page_code' } });
  const { rows: log } = useTable<AuditRow>('audit_log', { orderBy: { column: 'created_at', dir: 'desc' }, limit: 10 });
  const { byId } = usePeople();
  const since = Date.now() - 30 * 86400e3;
  const revenue = payments.filter((p) => p.paid_at && new Date(p.paid_at).getTime() > since).reduce((a, p) => a + p.amount, 0);
  const week = useSessionsJoined((s) => s.status !== 'cancelled' && Math.abs(new Date(s.starts_at).getTime() - Date.now()) < 3.5 * 86400e3);
  const occ = week.length ? Math.round((week.reduce((a, x) => a + x.session.booked_count, 0) / week.reduce((a, x) => a + x.session.capacity, 0)) * 100) : 0;
  const todayIds = useMemo(() => week.filter((x) => isSameDay(x.session.starts_at, new Date())).map((x) => x.session.id), [week]);
  const { rows: todayBookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds, status: 'checked_in' } });
  const days = useMemo(() => {
    const out: { id: string; label: string; value: number; hint?: string }[] = [];
    for (let d = -3; d <= 3; d++) {
      const day = new Date(); day.setDate(day.getDate() + d);
      const ss = week.filter((x) => isSameDay(x.session.starts_at, day));
      const cap = ss.reduce((a, x) => a + x.session.capacity, 0);
      out.push({ id: String(d), label: formatDate(day.toISOString(), lang, { weekday: 'short', day: 'numeric' }), value: cap ? Math.round((ss.reduce((a, x) => a + x.session.booked_count, 0) / cap) * 100) : 0, hint: d === 0 ? t('core.common.today') : undefined });
    }
    return out;
  }, [week, lang, t]);
  const pages = [...new Set(flags.map((f) => f.page_code ?? '—'))];
  const canFlags = can('features.write');

  const toggle = async (f: FlagRow, on: boolean) => {
    if (!canFlags) return;
    await data.update('feature_flags', f.id, { enabled: on });
    await audit('flag.toggle', 'feature_flags', f.id, { key: f.key, before: f.enabled, after: on });
  };
  const trail: TimelineItem[] = log.map((a) => ({ id: a.id, at: a.created_at, kind: a.action.startsWith('payment') ? 'payment' : a.action.startsWith('booking') || a.action.startsWith('attendance') ? 'booking' : a.action.includes('note') ? 'note' : 'system', title: a.action, meta: `${byId.get(a.actor_id ?? '')?.name ?? t('admin.dashboard.system')} · ${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ''}${a.diff?.source ? ` · ${a.diff.source}` : ''}` }));

  const SECTIONS: Record<string, () => ReactNode> = {
    'KPIRow ×4': () => (
      <div className="grid grid-4">
        <StatTile label={t('admin.dashboard.members')} value={memberships.length} trend="up" />
        <StatTile label={t('admin.dashboard.revenue')} value={formatCOP(revenue, lang)} />
        <StatTile label={t('admin.dashboard.occupancy')} value={`${occ}%`} trend={occ > 70 ? 'up' : 'flat'} />
        <StatTile label={t('admin.dashboard.arrivals')} value={todayBookings.length} hint={t('admin.dashboard.arrivals.hint', { n: todayIds.length })} />
      </div>
    ),
    'OccupancyChart': () => (
      <Card title={t('admin.dashboard.occChart')} eyebrow={t('admin.dashboard.occChart.eyebrow')}>
        <BarList items={days} max={100} emphasizeId="0" format={(v) => `${v}%`} />
      </Card>
    ),
    'FeatureTable': () => (
      <Card title={t('admin.dashboard.flags')} actions={<Link to="/admin/settings" className="small">{t('core.nav.settings')}</Link>}>
        <p className="muted small" style={{ marginBottom: 16 }}>{canFlags ? t('admin.dashboard.flags.body') : t('admin.dashboard.flags.readonly')}</p>
        <div className="grid grid-3">
          {pages.map((code) => (
            <div key={code} className="stack-sm">
              <div className="eyebrow">{code}</div>
              {flags.filter((f) => (f.page_code ?? '—') === code).map((f) => <Toggle key={f.id} size="sm" checked={f.enabled} disabled={!canFlags || LOCKED_PAGES.includes(code)} label={f.label} onChange={(on) => toggle(f, on)} />)}
            </div>
          ))}
        </div>
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
