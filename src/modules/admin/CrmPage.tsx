import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { BookingRow, CreditRow } from '../../data/schema';
import { formatDate } from '../../i18n/format';
import { Chip } from '../../components/atom/Chip/Chip';
import { Input } from '../../components/atom/Input/Input';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { maskPhone, usePeople, type Person } from '../staff/people';
import './admin.css';

export type Segment = 'all' | 'at_risk' | 'new' | 'no_membership' | 'birthdays';
export const SEGMENTS: Segment[] = ['all', 'at_risk', 'new', 'no_membership', 'birthdays'];
export type Risk = 'low' | 'medium' | 'high';

export interface MemberStats { visits: number; lastVisit: string | null; risk: Risk; credits: number }

/** Visits, last visit, credit balance and churn risk (cadence vs. own baseline) for every customer. */
export function useMemberStats(people: Person[]) {
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { status: 'checked_in' } });
  const { rows: credits } = useTable<CreditRow>('credits');
  return useMemo(() => {
    const now = Date.now();
    const out = new Map<string, MemberStats>();
    for (const p of people) {
      const mine = bookings.filter((b) => b.user_id === p.id).map((b) => b.checked_in_at ?? b.created_at).sort();
      const last = mine[mine.length - 1] ?? null;
      const daysSince = last ? (now - new Date(last).getTime()) / 86400e3 : Infinity;
      const recent = mine.filter((d) => now - new Date(d).getTime() < 30 * 86400e3).length;
      const previous = mine.filter((d) => { const age = now - new Date(d).getTime(); return age >= 30 * 86400e3 && age < 60 * 86400e3; }).length;
      const bal = credits.filter((c) => c.user_id === p.id).reduce((a, c) => a + c.delta, 0);
      const engaged = !!p.membership || bal > 0;
      const risk: Risk = !engaged ? 'low' : daysSince > 21 || (previous > 0 && recent === 0) ? 'high' : daysSince > 14 || recent < previous / 2 ? 'medium' : 'low';
      out.set(p.id, { visits: mine.length, lastVisit: last, risk, credits: bal });
    }
    return out;
  }, [people, bookings, credits]);
}

export function inSegment(p: Person, s: MemberStats | undefined, seg: Segment): boolean {
  const now = new Date();
  switch (seg) {
    case 'all': return true;
    case 'at_risk': return s?.risk === 'high' || s?.risk === 'medium';
    case 'new': { const c = new Date(p.createdAt); return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear(); }
    case 'no_membership': return !p.membership;
    case 'birthdays': return !!p.birthday && new Date(p.birthday).getMonth() === now.getMonth();
  }
}

/** M-06 list — segment rail, search, member table. */
export function CrmPage() {
  const { t, lang, bi } = useI18n();
  const nav = useNavigate();
  const { people, loading } = usePeople();
  const customers = useMemo(() => people.filter((p) => p.role === 'customer'), [people]);
  const stats = useMemberStats(customers);
  const [seg, setSeg] = useState<Segment>('all');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => customers.filter((p) => inSegment(p, stats.get(p.id), seg)).map((p) => ({ ...p, plan_name: p.plan ? bi({ es: p.plan.name_es, en: p.plan.name_en }) : '', visits: stats.get(p.id)?.visits ?? 0, lastVisit: stats.get(p.id)?.lastVisit ?? '', risk: stats.get(p.id)?.risk ?? 'low', mstatus: p.membership?.status ?? 'none' })), [customers, stats, seg, bi]);
  type Row = (typeof rows)[number];
  const counts = Object.fromEntries(SEGMENTS.map((s) => [s, customers.filter((p) => inSegment(p, stats.get(p.id), s)).length]));

  const columns: DataTableColumn<Row>[] = [
    { key: 'name', label: t('admin.crm.col.member'), render: (r) => <span className="row"><Avatar name={r.name} initials={r.initials} size={26} /><span><span className="small">{r.name}</span><span className="xs muted"> · {maskPhone(r.phone)}</span></span></span> },
    { key: 'plan_name', label: t('admin.crm.col.plan'), render: (r) => r.plan_name ? <span className="row"><span className="small">{r.plan_name}</span><Badge tone={toneForStatus(r.mstatus)}>{r.mstatus}</Badge></span> : <span className="muted small">{t('admin.crm.noPlan')}</span> },
    { key: 'visits', label: t('admin.crm.col.visits'), align: 'right' },
    { key: 'lastVisit', label: t('admin.crm.col.last'), render: (r) => r.lastVisit ? formatDate(r.lastVisit, lang) : <span className="muted">—</span> },
    { key: 'risk', label: t('admin.crm.col.risk'), render: (r) => <Badge tone={r.risk === 'high' ? 'danger' : r.risk === 'medium' ? 'warn' : 'success'}>{t(`admin.crm.risk.${r.risk}`)}</Badge> },
    { key: 'createdAt', label: t('admin.crm.col.since'), render: (r) => formatDate(r.createdAt, lang, { month: 'short', year: 'numeric' }) },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.crm.title')}</h1><p className="muted small">{t('admin.crm.subtitle')}</p></div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.crm.search')} style={{ width: 260 }} aria-label={t('core.common.search')} />
      </div>
      <div className="row wrap" role="tablist">{SEGMENTS.map((s) => <Chip key={s} selected={seg === s} onClick={() => setSeg(s)}>{t(`admin.crm.seg.${s}`)} · {counts[s]}</Chip>)}</div>
      {loading && customers.length === 0 ? <EmptyState tone="loading" title={t('core.common.loading')} /> : rows.length === 0 ? <EmptyState title={t('admin.crm.emptySeg')} body={t(`admin.crm.seg.${seg}.body`)} /> : (
        <DataTable<Row> columns={columns} rows={rows} rowKey={(r) => r.id} search={search} onRowClick={(r) => nav(`/admin/crm/${r.id}`)} dense />
      )}
    </div>
  );
}
