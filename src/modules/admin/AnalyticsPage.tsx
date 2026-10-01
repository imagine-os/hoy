import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDate } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { useActions } from '../../actions';
import { useStudioStats } from '../../data/useAnalytics';
import type { AtRiskBand, StudioStats } from '../../data/analytics';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge, type BadgeTone } from '../../components/atom/Badge/Badge';
import { BarList } from '../../components/molecule/BarList/BarList';
import { Heatmap } from '../../components/molecule/Heatmap/Heatmap';
import { ListRow } from '../../components/molecule/ListRow/ListRow';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { M12 } from './specs';
import './admin.css';

type Range = 7 | 30 | 90;
const RANGES: Range[] = [7, 30, 90];
/** Sections that share a row with their neighbour from 1100 px up; the rest span the full width. */
const HALF = new Set(['Retention', 'AtRiskList', 'Milestones', 'CreditsExpiring']);
const BAND_TONE: Record<AtRiskBand, BadgeTone> = { 14: 'neutral', 30: 'warn', 60: 'danger', 90: 'danger' };
/** JS getDay → a Monday of Jan 2024 with that weekday (1 Jan 2024 was a Monday), for Intl weekday names. */
const dayKey = (weekday: number) => `2024-01-${String(weekday === 0 ? 7 : weekday).padStart(2, '0')}`;

type AtRiskRow = StudioStats['atRisk'][number] & Record<string, unknown>;
type TeacherRowView = StudioStats['byTeacher'][number] & { avg: number } & Record<string, unknown>;

/**
 * M-12 — practice analytics: attendance and retention for the studio team. Every figure comes from
 * `useStudioStats(range)` (src/data/analytics.ts); the page formats, it never computes. No revenue
 * (ROADMAP §E 32 open). Members are never ranked; the at-risk list is who to call, linked to M-06.
 */
export function AnalyticsPage() {
  const { t, lang, bi } = useI18n();
  const nav = useNavigate();
  const [range, setRange] = useState<Range>(30);
  const s = useStudioStats(range);
  const { sections, isVisible } = useLayout(M12);
  const nf = useMemo(() => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 }), [lang]);
  const num = (n: number) => nf.format(n);
  /** `key.one` when n is 1 (the dictionary has no plural rules). */
  const tn = (key: string, n: number, vars: Record<string, string | number>) => t(n === 1 ? `${key}.one` : key, vars);

  useActions(M12, useMemo(() => ({
    'analytics.setRange': (p?: Record<string, string>) => {
      const n = Number(p?.range) as Range;
      if (!RANGES.includes(n)) throw new Error(t('admin.analytics.range.invalid'));
      setRange(n);
      return t('admin.analytics.range.set', { n });
    },
    'analytics.openMember': (p?: Record<string, string>) => {
      if (!p?.userId) throw new Error(t('admin.analytics.member.required'));
      nav(`/admin/crm/${p.userId}`);
      return t('admin.analytics.member.opened', { id: p.userId });
    },
  }), [nav, t]));

  // Heatmap axes: Lun–Sáb always, Dom only when a Sunday class ran; columns = the start hours present.
  const heat = useMemo(() => {
    const weekdays = [1, 2, 3, 4, 5, 6, ...(s.heatmap.some((c) => c.weekday === 0) ? [0] : [])];
    const dayName = (w: number) => { const d = formatDate(dayKey(w), lang, { weekday: 'short' }).replace('.', ''); return d.charAt(0).toUpperCase() + d.slice(1); };
    const hourName = (h: number) => `${h}:00`;
    const hours = [...new Set(s.heatmap.map((c) => c.hour))].sort((a, b) => a - b);
    return {
      rows: weekdays.map((w) => ({ key: String(w), label: dayName(w) })),
      cols: hours.map((h) => ({ key: String(h), label: hourName(h) })),
      cells: s.heatmap.map((c) => ({ row: String(c.weekday), col: String(c.hour), value: c.fill, hint: tn('admin.analytics.heat.cell', c.classes, { day: dayName(c.weekday), hour: hourName(c.hour), classes: c.classes, fill: c.fill }) })),
    };
  }, [s.heatmap, lang, t]);

  const riskCols: DataTableColumn<AtRiskRow>[] = [
    { key: 'name', label: t('admin.analytics.risk.col.name'), render: (r) => <span className="adm-an-who"><span className="adm-an-name">{r.name}</span>{r.hadGoal && <span className="adm-an-goal" title={t('admin.analytics.risk.col.goal')}><span className="adm-an-dot" aria-hidden />{t('admin.analytics.risk.goal')}</span>}</span> },
    { key: 'lastVisit', label: t('admin.analytics.risk.col.last'), render: (r) => <span className="small">{formatDate(r.lastVisit, lang, { day: 'numeric', month: 'short' })}</span> },
    { key: 'daysSince', label: t('admin.analytics.risk.col.days'), align: 'right', mono: true },
    { key: 'band', label: t('admin.analytics.risk.col.band'), render: (r) => <Badge tone={BAND_TONE[r.band]}>{t('admin.analytics.risk.band', { n: r.band })}</Badge> },
  ];
  const teacherRows: TeacherRowView[] = useMemo(() => [...s.byTeacher].sort((a, b) => b.classes - a.classes || a.name.localeCompare(b.name)).map((x) => ({ ...x, avg: x.classes ? Math.round((x.attended / x.classes) * 10) / 10 : 0 })), [s.byTeacher]);
  const teacherCols: DataTableColumn<TeacherRowView>[] = [
    { key: 'name', label: t('admin.analytics.teacher.col.name'), render: (r) => <span className="adm-an-name">{r.name}</span> },
    { key: 'classes', label: t('admin.analytics.teacher.col.classes'), align: 'right', mono: true },
    { key: 'avg', label: t('admin.analytics.teacher.col.avg'), align: 'right', render: (r) => <span className="mono">{num(r.avg)}</span> },
    { key: 'fill', label: t('admin.analytics.teacher.col.fill'), align: 'right', render: (r) => <span className="mono">{r.fill}%</span> },
    { key: 'noShowRate', label: t('admin.analytics.teacher.col.noShow'), align: 'right', render: (r) => <span className={`mono ${r.noShowRate > 20 ? 'adm-neg' : ''}`}>{r.noShowRate}%</span> },
    { key: 'newFaces', label: t('admin.analytics.teacher.col.newFaces'), align: 'right', mono: true },
    { key: 'regulars', label: t('admin.analytics.teacher.col.regulars'), align: 'right', mono: true },
  ];
  const milestones = s.milestonesThisRange.slice(0, 8);
  const noShowHigh = s.noShowRate > 20;

  const SECTIONS: Record<string, () => ReactNode> = {
    'KPIRow ×4': () => (
      <div className="grid grid-4">
        <StatTile label={t('admin.analytics.kpi.fill')} value={`${s.fillRate}%`} hint={t('admin.analytics.kpi.fill.hint')} trend={s.fillRate >= 70 ? 'up' : undefined} />
        <StatTile label={t('admin.analytics.kpi.attendance')} value={`${s.attendanceRate}%`} hint={t('admin.analytics.kpi.attendance.hint')} />
        <StatTile label={t('admin.analytics.kpi.noShow')} value={`${s.noShowRate}%`} hint={t(noShowHigh ? 'admin.analytics.kpi.noShow.high' : 'admin.analytics.kpi.noShow.hint', { late: s.lateCancelRate })} trend={noShowHigh ? 'down' : undefined} />
        <StatTile label={t('admin.analytics.kpi.active')} value={s.activeMembers} hint={t('admin.analytics.kpi.active.hint', { n: s.newMembers, v: num(s.visitsPerActiveMemberPerWeek) })} />
      </div>
    ),
    'Heatmap': () => (
      <Card title={t('admin.analytics.heat.title')} eyebrow={t('admin.analytics.heat.eyebrow')} className="adm-an-heat">
        {s.heatmap.length === 0 ? <EmptyState compact icon="calendar" title={t('admin.analytics.heat.empty')} /> : (
          <Heatmap rows={heat.rows} cols={heat.cols} cells={heat.cells} ariaLabel={t('admin.analytics.heat.title')} legend={{ low: t('admin.analytics.heat.low'), high: t('admin.analytics.heat.high') }} />
        )}
        <p className="xs muted adm-an-guide">{t('admin.analytics.heat.guide')}</p>
      </Card>
    ),
    'Retention': () => (
      <Card title={t('admin.analytics.retention.title')} eyebrow={t('admin.analytics.retention.eyebrow')}>
        <div className="grid grid-2">
          <StatTile label={t('admin.analytics.retention.second')} value={s.secondVisitConversion.firstTimers ? `${s.secondVisitConversion.rate}%` : '—'}
            hint={s.secondVisitConversion.firstTimers ? t('admin.analytics.retention.second.hint', { back: s.secondVisitConversion.cameBack, first: s.secondVisitConversion.firstTimers }) : t('admin.analytics.retention.second.none')}
            trend={s.secondVisitConversion.firstTimers ? (s.secondVisitConversion.rate > 60 ? 'up' : undefined) : undefined} />
          <StatTile label={t('admin.analytics.retention.visits')} value={num(s.visitsPerActiveMemberPerWeek)} hint={t('admin.analytics.retention.visits.hint')} trend={s.visitsPerActiveMemberPerWeek >= 2 ? 'up' : undefined} />
        </div>
        <p className="small adm-an-goals">
          {s.goals.withGoal ? t('admin.analytics.retention.goals', { withGoal: s.goals.withGoal, onTrack: s.goals.onTrackThisWeek, avg: num(s.goals.avgTarget) }) : <span className="muted">{t('admin.analytics.retention.noGoals')}</span>}
        </p>
      </Card>
    ),
    'AtRiskList': () => (
      <Card title={t('admin.analytics.risk.title')} eyebrow={t('admin.analytics.risk.eyebrow')}>
        <p className="small muted adm-an-rule">{t('admin.analytics.risk.rule')}</p>
        {s.atRisk.length === 0
          ? <EmptyState compact icon="circle-check" title={t('admin.analytics.risk.empty')} body={t('admin.analytics.risk.empty.body')} />
          : <DataTable<AtRiskRow> columns={riskCols} rows={s.atRisk as AtRiskRow[]} rowKey={(r) => r.userId} onRowClick={(r) => nav(`/admin/crm/${r.userId}`)} dense pageSize={10} />}
        <p className="xs muted adm-an-guide">{t('admin.analytics.risk.note')}</p>
      </Card>
    ),
    'ByModality': () => (
      <Card title={t('admin.analytics.modality.title')} eyebrow={t('admin.analytics.modality.eyebrow')} className="adm-an-modality">
        <BarList items={s.byModality.map((m) => ({ id: m.id, label: bi(m.name), value: m.fill, hint: tn('admin.analytics.modality.hint', m.classes, { attended: m.attended, classes: m.classes }) }))} max={100} format={(v) => `${v}%`} emptyText={t('admin.analytics.heat.empty')} />
      </Card>
    ),
    'ByTeacher': () => (
      <Card title={t('admin.analytics.teacher.title')} eyebrow={t('admin.analytics.teacher.eyebrow')}>
        <DataTable<TeacherRowView> columns={teacherCols} rows={teacherRows} rowKey={(r) => r.id} dense emptyText={t('admin.analytics.teacher.empty')} />
        <p className="xs muted adm-an-guide">{t('admin.analytics.teacher.note')}</p>
      </Card>
    ),
    'Milestones': () => (
      <Card title={t('admin.analytics.milestones.title')} eyebrow={t('admin.analytics.milestones.eyebrow')} padding="sm">
        {milestones.length === 0 ? <EmptyState compact icon="star" title={t('admin.analytics.milestones.empty')} /> : (
          <div className="adm-an-list">
            {milestones.map((m) => {
              const date = formatDate(m.at, lang, { weekday: 'short', day: 'numeric', month: 'short' });
              return <ListRow key={`${m.userId}-${m.count}`} icon="star" title={m.name} subtitle={m.count === 1 ? t('admin.analytics.milestones.first', { date }) : t('admin.analytics.milestones.item', { count: m.count, date })} to={`/admin/crm/${m.userId}`} />;
            })}
          </div>
        )}
        {s.milestonesThisRange.length > milestones.length && <p className="xs muted adm-an-guide adm-an-pad">{t('admin.analytics.milestones.more', { n: s.milestonesThisRange.length })}</p>}
      </Card>
    ),
    'CreditsExpiring': () => (
      <Card title={t('admin.analytics.credits.title')} eyebrow={t('admin.analytics.credits.eyebrow')}>
        <div className="grid grid-2">
          <StatTile label={t('admin.analytics.credits.d14')} value={s.packagesExpiring14d} hint={t('admin.analytics.credits.hint')} />
          <StatTile label={t('admin.analytics.credits.d7')} value={s.packagesExpiring7d} hint={t('admin.analytics.credits.hint')} />
        </div>
      </Card>
    ),
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{t('admin.analytics.title')}</h1>
          <p className="muted small">{t('admin.analytics.subtitle')} · {tn('admin.analytics.classesHeld', s.classesHeld, { n: s.classesHeld })}</p>
        </div>
        <div className="row wrap" role="tablist" aria-label={t('admin.analytics.range')}>
          {RANGES.map((r) => <Chip key={r} selected={range === r} onClick={() => setRange(r)}>{t(`admin.analytics.range.${r}`)}</Chip>)}
        </div>
      </div>
      <div className="adm-analytics">
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <div key={name} className="adm-an-sec" data-span={HALF.has(name) ? 'half' : 'full'}>{SECTIONS[name]()}</div> : null)}
      </div>
    </div>
  );
}
