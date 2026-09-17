import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { specCompleteness, type PageSpec } from '../../specs/types';
import { getRoutes } from '../../app/registry';
import { PageStub } from '../../components/template/PageStub/PageStub';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Input } from '../../components/atom/Input/Input';
import { InspectorPanel } from '../../components/organism/InspectorPanel/InspectorPanel';

type Row = { code: string; name: string; family: string; score: number; missing: string; route: string; status: 'built' | 'stub' | 'none'; spec: PageSpec; [k: string]: unknown };

function isStubElement(el: React.ReactNode): boolean {
  return !!el && typeof el === 'object' && 'type' in el && (el as { type: unknown }).type === PageStub;
}

/** /dev/specs — every spec, its completeness and where it lives. */
export function SpecsIndexPage() {
  const { t, bi } = useI18n();
  const [family, setFamily] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<PageSpec | null>(null);

  const rows = useMemo<Row[]>(() => {
    const allRoutes = getRoutes();
    const all = new Map<string, PageSpec>(Object.entries(canvasSpecs));
    for (const r of allRoutes) if (!all.has(r.spec.code)) all.set(r.spec.code, r.spec);
    return [...all.values()].map((spec) => {
      const routes = allRoutes.filter((r) => r.spec.code === spec.code);
      const primary = routes.find((r) => !r.path.includes(':')) ?? routes[0];
      const { score, missing } = specCompleteness(spec);
      const status: Row['status'] = !primary ? 'none' : routes.every((r) => isStubElement(r.element)) ? 'stub' : 'built';
      return { code: spec.code, name: bi(spec.name), family: spec.code.split('-')[0], score, missing: missing.join(', '), route: primary?.path ?? '', status, spec };
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [bi]);
  const families = [...new Set(rows.map((r) => r.family))];
  const filtered = rows.filter((r) => family === 'all' || r.family === family);

  const columns: DataTableColumn<Row>[] = [
    { key: 'code', label: 'Code', mono: true, width: 90 },
    { key: 'name', label: 'Name' },
    { key: 'score', label: '%', align: 'right', width: 70, render: (r) => <Badge tone={r.score === 100 ? 'success' : r.score >= 70 ? 'warn' : 'danger'}>{r.score}%</Badge> },
    { key: 'missing', label: 'Missing', render: (r) => <span className="xs muted">{r.missing || '—'}</span> },
    { key: 'status', label: 'Status', width: 100, render: (r) => <Badge tone={r.status === 'built' ? 'success' : r.status === 'stub' ? 'warn' : 'neutral'}>{r.status === 'built' ? t('dev.specs.built') : r.status === 'stub' ? t('dev.specs.stub') : t('dev.specs.noRoute')}</Badge> },
    { key: 'route', label: t('dev.specs.route'), render: (r) => r.route ? <Link to={r.route} onClick={(e) => e.stopPropagation()}><code className="xs">#{r.route}</code></Link> : <span className="muted">—</span> },
  ];

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('dev.specs.title')}</h1><p className="muted small">{t('dev.specs.body')}</p></div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('core.common.search')} style={{ width: 220 }} /></div>
      <div className="row wrap"><Chip selected={family === 'all'} onClick={() => setFamily('all')}>{t('core.common.all')} · {rows.length}</Chip>{families.map((f) => <Chip key={f} selected={family === f} onClick={() => setFamily(f)}>{f} · {rows.filter((r) => r.family === f).length}</Chip>)}</div>
      <DataTable columns={columns} rows={filtered} rowKey={(r) => r.code} search={search} onRowClick={(r) => setOpen(r.spec)} dense pageSize={100} />
      <InspectorPanel spec={open} open={!!open} onClose={() => setOpen(null)} routePath={rows.find((r) => r.spec === open)?.route} />
    </div>
  );
}
