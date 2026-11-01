import { activitySearch, activityReportCsv } from '../../data/activityReport';
import { downloadCsv } from '../../data/reportCsv';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import { formatDateTime, MS, startOfDay } from '../../i18n/format';
import { ROLE_LABEL, type Role } from '../../auth/roles';
import { Select, Input } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Card } from '../../components/molecule/Card/Card';
import { Notice } from '../../components/molecule/Notice/Notice';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { activityRows, readAudit, type AuditSourceKey } from '../../data/companyos/audit';
import { refusalCopy } from '../../data/companyos/refusals';
import { memberNames, type CosPort } from '../transfers/launch/cos';
import { useCos, useLoad } from '../transfers/launch/useCos';
import type { AuditRow } from '../staff/audit';
import { usePeople } from '../staff/people';
import './admin.css';
import { PRODUCTION_BUILD } from '../../config/launch';

type Range = 'today' | '7d' | '30d' | 'all';
const RANGES: Range[] = ['today', '7d', '30d', 'all'];
const SOURCE_LABEL: Record<string, { es: string; en: string }> = { front_desk: { es: 'Recepción', en: 'Front desk' }, admin: { es: 'Admin', en: 'Admin' }, teacher_app: { es: 'App profes', en: 'Teacher app' }, automation: { es: 'Automatización', en: 'Automation' }, app: { es: 'App', en: 'App' } };
const sinceOf = (range: Range): number => (range === 'all' ? 0 : range === 'today' ? startOfDay(new Date()).getTime() : Date.now() - (range === '7d' ? 7 : 30) * MS.day);

/** One screen row, from either source (Company OS audit trail or the review build's `audit_log`). */
interface Row { id: string; created_at: string; actor_id: string | null; who: string; roleLabel: string; action: string; entity: string; entity_id: string | null; object: string; source: string; diff: (Record<string, unknown> & { before?: unknown; after?: unknown; role?: unknown; source?: unknown }) | null; [key: string]: unknown }

/**
 * M-07 — append-only activity log: filters, sortable table, before/after drawer, CSV export.
 * Production: the tenant's Company OS audit trail (`src/data/companyos/audit.ts`), which only the tenant Super Admin
 * reads (Hoy's Administration, AD-04); a refusal shows its copy. Review build: the mock's `audit_log` table.
 */
export function ActivityPage() {
  const cos = useCos();
  // The production build drops the review branch (and its `audit_log` read) at build time (review round 1, M4).
  return PRODUCTION_BUILD || cos ? <LiveActivity /> : <ReviewActivity />;
}

function LiveActivity() {
  const { t, bi, lang } = useI18n();
  const [range, setRange] = useState<Range>('7d');
  const { state, reload } = useLoad(async (cos: CosPort) => {
    const since = sinceOf(range);
    const [trail, names] = await Promise.all([
      readAudit(<T,>(method: 'GET', path: string) => cos.request<T>(method, path), { since: since ? new Date(since).toISOString() : undefined }),
      // Names are a nicety: a role that may not list members still sees the log, with login ids.
      memberNames(cos).catch(() => new Map<string, string>()),
    ]);
    return { ...trail, names };
  }, [range]);
  const rows = useMemo<Row[]>(() => {
    if (state.status !== 'ready') return [];
    const sourceLabel = (k: AuditSourceKey) => (k === 'api' ? t('admin.activity.source.api') : k === 'platform' ? t('admin.activity.source.platform') : bi(SOURCE_LABEL[k]));
    return activityRows(state.value.events, state.value.names, { system: t('admin.activity.system'), platform: t('admin.activity.platform'), unknown: (id) => t('admin.activity.unknownActor', { id }) })
      .map((r) => ({ ...r, source: sourceLabel(r.sourceKey) }));
  }, [state, t, bi]);

  if (state.status === 'error') {
    const forbidden = state.code === 'forbidden';
    return (
      <div className="stack">
        <div className="page-head"><div><h1>{t('admin.activity.title')}</h1><p className="muted small">{t('admin.activity.subtitle')}</p></div></div>
        <EmptyState tone="error" title={refusalCopy(state.code, lang)} body={forbidden ? t('admin.activity.superAdminOnly') : undefined}
          action={forbidden ? undefined : <Button onClick={reload}>{t('admin.activity.retry')}</Button>} />
      </div>
    );
  }
  return <ActivityView rows={rows} loading={state.status === 'loading'} range={range} onRange={setRange} live
    truncated={state.status === 'ready' && state.value.truncated ? state.value.events.length : 0} />;
}

function ReviewActivity() {
  const { t, bi } = useI18n();
  const { rows: raw, loading } = useTable<AuditRow>('audit_log', { orderBy: { column: 'created_at', dir: 'desc' } });
  const { byId } = usePeople();
  const [range, setRange] = useState<Range>('7d');
  const since = sinceOf(range);
  const rows = useMemo<Row[]>(() => raw.filter((r) => new Date(r.created_at).getTime() >= since).map((r) => ({
    id: r.id, created_at: r.created_at, actor_id: r.actor_id, action: r.action, entity: r.entity, entity_id: r.entity_id, diff: r.diff,
    who: byId.get(r.actor_id ?? '')?.name ?? (r.diff?.source === 'automation' ? t('admin.activity.automation') : t('admin.activity.system')),
    roleLabel: r.diff?.role ? bi(ROLE_LABEL[r.diff.role as Role] ?? { es: String(r.diff.role), en: String(r.diff.role) }) : '',
    object: `${r.entity}${r.entity_id ? `#${r.entity_id}` : ''}`,
    source: r.diff?.source ? bi(SOURCE_LABEL[r.diff.source] ?? { es: r.diff.source, en: r.diff.source }) : '—',
  })), [raw, since, byId, bi, t]);
  return <ActivityView rows={rows} loading={loading && raw.length === 0} range={range} onRange={setRange} truncated={0} />;
}

function ActivityView({ rows, loading, range, onRange, truncated, live = false }: { rows: Row[]; loading: boolean; range: Range; onRange: (r: Range) => void; truncated: number; live?: boolean }) {
  const { t, lang } = useI18n();
  const [actor, setActor] = useState('');
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [exportError, setExportError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => activitySearch(rows.filter((r) => (!actor || r.actor_id === actor) && (!entity || r.entity === entity)), search), [rows, actor, entity, search]);
  const actors = useMemo(() => [...new Map(rows.filter((r) => r.actor_id).map((r) => [r.actor_id!, r.who])).entries()], [rows]);
  const entities = useMemo(() => [...new Set(rows.map((r) => r.entity))].sort(), [rows]);
  const row = filtered.find((r) => r.id === selected);

  const columns: DataTableColumn<Row>[] = [
    { key: 'created_at', label: t('admin.activity.col.when'), width: 160, render: (r) => <span className="mono small">{formatDateTime(r.created_at, lang)}</span> },
    { key: 'who', label: t('admin.activity.col.who'), render: (r) => <span><span className="small">{r.who}</span>{r.roleLabel && <span className="xs muted"> · {r.roleLabel}</span>}</span> },
    { key: 'action', label: t('admin.activity.col.action'), render: (r) => <code className="xs">{r.action}</code> },
    { key: 'object', label: t('admin.activity.col.object'), mono: true },
    { key: 'source', label: t('admin.activity.col.source'), render: (r) => <Badge>{r.source}</Badge> },
  ];

  const exportCsv = () => {
    try { downloadCsv(activityReportCsv(filtered), `audit_${range}.csv`); setExportError(false); } catch { setExportError(true); }
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.activity.title')}</h1><p className="muted small">{t('admin.activity.subtitle')}</p></div>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>{t('admin.activity.export')}</Button>
      </div>
      {exportError && <p role="alert">{t('admin.reporting.activityFailed')}</p>}
      <Card padding="sm" className="row wrap act-filters">
        <Select value={range} onChange={(e) => { onRange(e.target.value as Range); setSelected(null); setActor(''); setEntity(''); }} aria-label={t('admin.activity.range')}>{RANGES.map((r) => <option key={r} value={r}>{t(`admin.activity.range.${r}`)}</option>)}</Select>
        <Select value={actor} onChange={(e) => setActor(e.target.value)} aria-label={t('admin.activity.col.who')}><option value="">{t('admin.activity.anyone')}</option>{actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select>
        <Select value={entity} onChange={(e) => setEntity(e.target.value)} aria-label={t('admin.activity.col.object')}><option value="">{t('admin.activity.anyArea')}</option>{entities.map((e) => <option key={e} value={e}>{e}</option>)}</Select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.reporting.activitySearch')} aria-label={t('core.common.search')} style={{ flex: '1 1 160px' }} />
        <span className="xs muted">{t('core.common.rows', { n: filtered.length })}</span>
      </Card>
      {truncated > 0 && <Notice tone="info">{t('admin.activity.truncated', { n: truncated })}</Notice>}
      {loading ? <EmptyState tone="loading" title={t('core.common.loading')} /> : filtered.length === 0 ? <EmptyState title={t('admin.activity.empty')} body={rows.length === 0 && live ? t('admin.activity.empty.none') : t('admin.activity.empty.body')} /> : (
        <DataTable<Row> columns={columns} rows={filtered} rowKey={(r) => r.id} onRowClick={(r) => setSelected(r.id)} selectedKey={selected} dense pageSize={100} />
      )}
      <p className="xs muted">{t(live ? 'admin.activity.retention.live' : 'admin.activity.retention')}</p>
      <Drawer open={!!row} onClose={() => setSelected(null)} title={row ? <div className="row wrap"><code>{row.action}</code><Badge>{row.source}</Badge></div> : undefined} width={520}>
        {row && (
          <div className="stack-sm">
            <div className="small"><strong>{row.who}</strong>{row.roleLabel && <span className="muted"> · {row.roleLabel}</span>}</div>
            <div className="xs muted mono">{formatDateTime(row.created_at, lang)} · {row.object} · {row.id}</div>
            {row.diff?.before !== undefined && <><div className="eyebrow">{t('admin.activity.before')}</div><pre className="act-pre">{JSON.stringify(row.diff.before, null, 2)}</pre></>}
            {row.diff?.after !== undefined && <><div className="eyebrow">{t('admin.activity.after')}</div><pre className="act-pre">{JSON.stringify(row.diff.after, null, 2)}</pre></>}
            <div className="eyebrow">{t('admin.activity.raw')}</div><pre className="act-pre">{JSON.stringify(row.diff ?? {}, null, 2)}</pre>
            <p className="xs muted">{t('admin.activity.immutable')}</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
