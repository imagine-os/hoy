import { useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import { TABLE_GROUPS, tableRegistry, tables, type BaseRow, type ColumnDef } from '../../data/schema';
import { DataTable, formatCell, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Field } from '../../components/molecule/Field/Field';
import { Chip } from '../../components/atom/Chip/Chip';
import './tables.css';
import { formatCOP } from '../../i18n/format';

/** M-03 — the table manager. Sidebar of tables, DataTable, row drawer with inline edit, JSON export. */
export function TablesPage() {
  const { t, bi, lang } = useI18n();
  const { table } = useParams();
  const nav = useNavigate();
  const data = useData();
  const { can } = useSession();
  const def = table ? tableRegistry[table] : undefined;
  const { rows } = useTable<BaseRow>(def?.name ?? 'tenants');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'data' | 'schema'>('data');
  const counts = useCounts();
  const canWrite = can('tables.write');

  const columns = useMemo<DataTableColumn<BaseRow>[]>(() => {
    if (!def) return [];
    const visible = def.allColumns.filter((c) => !c.wide && !['tenant_id', 'created_at'].includes(c.name));
    return visible.map((c) => ({
      key: c.name, label: c.name, mono: c.type === 'uuid', width: c.type === 'bool' ? 60 : undefined, align: c.type === 'int' || c.type === 'numeric' ? 'right' : undefined,
      render: (r) => {
        const v = r[c.name];
        if (c.type === 'enum' && typeof v === 'string') return <Badge tone={toneForStatus(v)}>{v}</Badge>;
        if (c.references && typeof v === 'string') return <button type="button" className="tbl-ref" onClick={(e) => { e.stopPropagation(); nav(`/admin/tables/${c.references}?id=${v}`); }} title={`${c.references}/${v}`}>{v}</button>;
        if ((c.type === 'int') && typeof v === 'number' && /price|amount|total|subtotal|tax|balance|rate/.test(c.name)) return formatCOP(v, lang);
        return formatCell(v);
      },
    }));
  }, [def, nav, lang]);

  const selectedRow = rows.find((r) => r.id === selected) ?? null;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${def?.name}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const addRow = async () => {
    if (!def) return;
    const blank: Record<string, unknown> = {};
    for (const c of def.columns) blank[c.name] = c.type === 'bool' ? false : c.type === 'int' || c.type === 'numeric' ? 0 : c.type === 'json' ? null : c.enum ? c.enum[0] : c.nullable ? null : '';
    const row = await data.insert(def.name, blank);
    setSelected(row.id);
  };

  return (
    <div className="tbl">
      <aside className="tbl-side">
        <div className="tbl-side-head"><h2 className="tbl-h2">{t('admin.tables.title')}</h2><span className="xs muted">{t('admin.tables.provider', { name: data.name })}</span></div>
        <nav className="tbl-nav" aria-label={t('core.nav.tables')}>
          {TABLE_GROUPS.map((g) => (
            <div key={g.id} className="tbl-group">
              <div className="eyebrow tbl-grouplabel">{bi(g.label)}</div>
              {tables.filter((x) => x.group === g.id).map((x) => (
                <NavLink key={x.name} to={`/admin/tables/${x.name}`} className={({ isActive }) => `tbl-link ${isActive ? 'is-active' : ''}`} onClick={() => { setSearch(''); setSelected(null); }}>
                  <code>{x.name}</code><span className="xs muted">{counts[x.name] ?? 0}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {data.reset && canWrite && <div className="tbl-side-foot"><Button size="sm" variant="ghost" onClick={() => { if (confirm(t('admin.tables.resetConfirm'))) data.reset!(); }}>{t('admin.tables.resetSeed')}</Button></div>}
      </aside>

      <section className="tbl-main">
        {!def && <div className="stack"><h1>{t('admin.tables.title')}</h1><p className="muted">{t('admin.tables.subtitle')}</p><p className="small muted">{t('admin.tables.pick')}</p></div>}
        {def && (
          <>
            <div className="tbl-head">
              <div className="grow">
                <div className="row wrap"><h1 className="tbl-title"><code>{def.name}</code></h1><Badge>{bi(TABLE_GROUPS.find((g) => g.id === def.group)!.label)}</Badge></div>
                <p className="muted small">{bi(def.description)} · {t('admin.tables.columns', { n: def.allColumns.length })} · {t('core.common.rows', { n: rows.length })}</p>
              </div>
              <div className="row wrap">
                <div className="row wrap" role="tablist">
                  <Chip selected={tab === 'data'} onClick={() => setTab('data')}>{t('admin.tables.data')}</Chip>
                  <Chip selected={tab === 'schema'} onClick={() => setTab('schema')}>{t('admin.tables.schema')}</Chip>
                </div>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.tables.search', { table: def.name })} style={{ width: 220 }} aria-label={t('core.common.search')} />
                <Button variant="secondary" size="sm" onClick={exportJson}>{t('core.common.export')}</Button>
                {canWrite && <Button size="sm" onClick={addRow}>{t('admin.tables.addRow')}</Button>}
              </div>
            </div>
            {tab === 'data'
              ? <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} search={search} onRowClick={(r) => setSelected(r.id)} selectedKey={selected} dense />
              : <SchemaView columns={def.allColumns} />}
          </>
        )}
      </section>

      <Drawer open={!!selectedRow} onClose={() => setSelected(null)} width={480} title={<div className="row wrap"><span>{t('admin.tables.row')}</span><code className="xs">{selectedRow?.id}</code></div>}
        footer={canWrite && selectedRow && def ? <Button variant="danger" size="sm" onClick={async () => { if (confirm(t('admin.tables.deleteConfirm'))) { await data.remove(def.name, selectedRow.id); setSelected(null); } }}>{t('core.common.delete')}</Button> : undefined}>
        {selectedRow && def && <RowEditor table={def.name} columns={def.allColumns} row={selectedRow} readOnly={!canWrite} />}
      </Drawer>
    </div>
  );
}

function useCounts(): Record<string, number> {
  const data = useData();
  const [, force] = useState(0);
  useMemo(() => data.subscribe('*', () => force((n) => n + 1)), [data]);
  return Object.fromEntries(tables.map((x) => [x.name, data.peek?.(x.name)?.length ?? 0]));
}

function SchemaView({ columns }: { columns: ColumnDef[] }) {
  const { t } = useI18n();
  return (
    <div className="tbl-schema">
      {columns.map((c) => (
        <div key={c.name} className="tbl-schema-row">
          <code className="tbl-schema-name">{c.name}</code>
          <Badge tone="primary">{c.type}{c.enum ? `(${c.enum.join(' | ')})` : ''}</Badge>
          {c.nullable && <Badge>null</Badge>}
          {c.references && <span className="xs muted">{t('admin.tables.references')} <NavLink to={`/admin/tables/${c.references}`}><code>{c.references}</code></NavLink></span>}
          {c.description && <span className="xs muted">— {c.description}</span>}
        </div>
      ))}
    </div>
  );
}

function RowEditor({ table, columns, row, readOnly }: { table: string; columns: ColumnDef[]; row: BaseRow; readOnly: boolean }) {
  const { t } = useI18n();
  const data = useData();
  const [saved, setSaved] = useState<string | null>(null);
  const save = async (name: string, value: unknown) => { await data.update(table, row.id, { [name]: value }); setSaved(name); setTimeout(() => setSaved(null), 1200); };
  const locked = (c: ColumnDef) => readOnly || ['id', 'tenant_id', 'created_at', 'updated_at'].includes(c.name);
  return (
    <div className="stack-sm">
      {columns.map((c) => {
        const v = row[c.name];
        const hint = `${c.type}${c.references ? ` → ${c.references}` : ''}${locked(c) ? ` · ${t('admin.tables.readonly')}` : saved === c.name ? ` · ${t('admin.tables.saved')}` : ''}`;
        return (
          <Field key={c.name} label={c.name} hint={hint}>
            {(id) => {
              if (c.type === 'bool') return <Select id={id} disabled={locked(c)} value={String(!!v)} onChange={(e) => save(c.name, e.target.value === 'true')}><option value="true">true</option><option value="false">false</option></Select>;
              if (c.enum) return <Select id={id} disabled={locked(c)} value={String(v ?? '')} onChange={(e) => save(c.name, e.target.value)}>{c.enum.map((o) => <option key={o} value={o}>{o}</option>)}</Select>;
              if (c.type === 'json') return <textarea id={id} className="input tbl-json" disabled={locked(c)} defaultValue={v == null ? '' : JSON.stringify(v, null, 2)} rows={4} onBlur={(e) => { try { save(c.name, e.target.value ? JSON.parse(e.target.value) : null); } catch { /* keep editing */ } }} />;
              if (c.type === 'int' || c.type === 'numeric') return <Input id={id} type="number" disabled={locked(c)} defaultValue={v == null ? '' : String(v)} onBlur={(e) => save(c.name, e.target.value === '' ? null : Number(e.target.value))} />;
              return <Input id={id} disabled={locked(c)} defaultValue={v == null ? '' : String(v)} onBlur={(e) => { const nv = e.target.value === '' && c.nullable ? null : e.target.value; if (nv !== v) save(c.name, nv); }} />;
            }}
          </Field>
        );
      })}
    </div>
  );
}
