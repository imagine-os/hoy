import { useI18n } from '../../i18n/I18nProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, MembershipRow, PaymentRow } from '../../data/schema';
import { formatCOP } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { useSessionsJoined } from '../website/hooks';

interface FlagRow extends BaseRow { key: string; page_code: string | null; label: string; enabled: boolean }

/** M-01 first slice: three real numbers from the mock DB and the feature switches, editable. */
export function DashboardPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { status: 'active' } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { status: 'approved' } });
  const { rows: flags } = useTable<FlagRow>('feature_flags', { orderBy: { column: 'page_code' } });
  const since = Date.now() - 30 * 86400e3;
  const revenue = payments.filter((p) => p.paid_at && new Date(p.paid_at).getTime() > since).reduce((a, p) => a + p.amount, 0);
  const week = useSessionsJoined((s) => s.status !== 'cancelled' && Math.abs(new Date(s.starts_at).getTime() - Date.now()) < 3.5 * 86400e3);
  const occ = week.length ? Math.round((week.reduce((a, x) => a + x.session.booked_count, 0) / week.reduce((a, x) => a + x.session.capacity, 0)) * 100) : 0;
  const pages = [...new Set(flags.map((f) => f.page_code ?? '—'))];
  return (
    <div className="stack">
      <div className="page-head"><h1>{t('admin.dashboard.title')}</h1></div>
      <div className="grid grid-3">
        <StatTile label={t('admin.dashboard.members')} value={memberships.length} trend="up" />
        <StatTile label={t('admin.dashboard.revenue')} value={formatCOP(revenue, lang)} />
        <StatTile label={t('admin.dashboard.occupancy')} value={`${occ}%`} trend={occ > 70 ? 'up' : 'flat'} />
      </div>
      <Card title={t('admin.dashboard.flags')}>
        <p className="muted small" style={{ marginBottom: 16 }}>{t('admin.dashboard.flags.body')}</p>
        <div className="grid grid-3">
          {pages.map((code) => (
            <div key={code} className="stack-sm">
              <div className="eyebrow">{code}</div>
              {flags.filter((f) => (f.page_code ?? '—') === code).map((f) => <Toggle key={f.id} size="sm" checked={f.enabled} label={f.label} onChange={(on) => data.update('feature_flags', f.id, { enabled: on })} />)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
