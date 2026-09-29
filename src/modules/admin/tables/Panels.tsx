import { useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { BaseRow, ColumnDef, TableViewConfig, TableViewRow, ViewFilter, ViewFilterOp } from '../../../data/schema';
import { columnLabel, enumLabel, rowTitle } from '../../../data/labels';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Card } from '../../../components/molecule/Card/Card';
import { Icon, type IconName } from '../../../components/atom/Icon/Icon';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { groupableColumns, hiddenOf, isDate, isNumber, opNeedsValue, opsFor, orderedColumns, type Def } from './model';

export type PanelId = 'filter' | 'sort' | 'group' | 'columns' | 'export' | 'views';

interface Base { def: Def; cfg: TableViewConfig; setCfg: (fn: (c: TableViewConfig) => TableViewConfig) => void; technical: boolean }

const move = <T,>(list: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= list.length) return list; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; return n; };

/** The column picker used by every panel: human label, raw name after it when technical names are on. */
function ColumnSelect({ def, cols, value, onChange, label, technical }: { def: Def; cols: ColumnDef[]; value: string; onChange: (v: string) => void; label: string; technical: boolean }) {
  const { lang } = useI18n();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="tbl-ctl">
      {cols.map((c) => <option key={c.name} value={c.name}>{columnLabel(def, c, lang)}{technical ? ` · ${c.name}` : ''}</option>)}
    </Select>
  );
}

function IconBtn({ icon, label, onClick, disabled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="tbl-iconbtn ctl-round" onClick={onClick} disabled={disabled} aria-label={label} title={label}><Icon name={icon} size="sm" /></button>;
}

function PanelShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="tbl-panel" title={title} padding="md" actions={<IconBtn icon="close" label={t('core.common.close')} onClick={onClose} />}>
      <div className="stack-sm">{children}</div>
    </Card>
  );
}

/** Value control for a filter, by column type. */
function FilterValue({ c, f, onChange, resolveRows }: { c: ColumnDef; f: ViewFilter; onChange: (v: string | string[]) => void; resolveRows: (table: string) => BaseRow[] }) {
  const { t, lang } = useI18n();
  const label = t('admin.tables.filter.value');
  if (!opNeedsValue(f.op)) return null;
  if (c.enum && f.op === 'in') {
    const set = Array.isArray(f.value) ? f.value : f.value ? String(f.value).split(',') : [];
    return (
      <div className="row wrap tbl-chips" role="group" aria-label={label}>
        {c.enum.map((o) => <Chip key={o} selected={set.includes(o)} onClick={() => onChange(set.includes(o) ? set.filter((x) => x !== o) : [...set, o])}>{enumLabel(o, lang)}</Chip>)}
      </div>
    );
  }
  const v = Array.isArray(f.value) ? f.value.join(',') : f.value ?? '';
  if (c.enum) return <Select className="tbl-ctl" aria-label={label} value={v} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{c.enum.map((o) => <option key={o} value={o}>{enumLabel(o, lang)}</option>)}</Select>;
  if (c.type === 'bool') return <Select className="tbl-ctl" aria-label={label} value={v} onChange={(e) => onChange(e.target.value)}><option value="">—</option><option value="true">{t('admin.tables.yes')}</option><option value="false">{t('admin.tables.no')}</option></Select>;
  if (isDate(c)) return <Input className="tbl-ctl" type="date" aria-label={label} value={v.slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
  if (isNumber(c)) return <Input className="tbl-ctl" type="number" aria-label={label} value={v} onChange={(e) => onChange(e.target.value)} />;
  if (c.references && f.op !== 'contains') {
    const opts = resolveRows(c.references).map((r) => ({ id: r.id, title: rowTitle(c.references!, r, lang) })).sort((a, b) => a.title.localeCompare(b.title)).slice(0, 300);
    return <Select className="tbl-ctl" aria-label={label} value={v} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</Select>;
  }
  return <Input className="tbl-ctl" aria-label={label} value={v} onChange={(e) => onChange(e.target.value)} placeholder={t('admin.tables.filter.valueHint')} />;
}

export function FilterPanel({ def, cfg, setCfg, technical, onClose, resolveRows, cols }: Base & { onClose: () => void; resolveRows: (table: string) => BaseRow[]; cols: ColumnDef[] }) {
  const { t } = useI18n();
  const filters = cfg.filters ?? [];
  const set = (i: number, patch: Partial<ViewFilter>) => setCfg((c) => ({ ...c, filters: (c.filters ?? []).map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const first = cols[0];
  return (
    <PanelShell title={t('admin.tables.filter')} onClose={onClose}>
      {filters.length === 0 && <p className="small muted">{t('admin.tables.filter.none')}</p>}
      {filters.map((f, i) => {
        const c = def.allColumns.find((x) => x.name === f.column) ?? first;
        return (
          <div key={i} className="tbl-rule">
            <span className="small muted tbl-rule-join">{i === 0 ? t('admin.tables.filter.where') : t('admin.tables.filter.and')}</span>
            <ColumnSelect def={def} cols={cols} value={c.name} technical={technical} label={t('admin.tables.filter.column')} onChange={(name) => { const nc = def.allColumns.find((x) => x.name === name)!; set(i, { column: name, op: opsFor(nc)[0], value: undefined }); }} />
            <Select className="tbl-ctl" aria-label={t('admin.tables.filter.op')} value={f.op} onChange={(e) => set(i, { op: e.target.value as ViewFilterOp, value: e.target.value === 'in' ? [] : f.value })}>
              {opsFor(c).map((op) => <option key={op} value={op}>{t(`admin.tables.op.${op}`)}</option>)}
            </Select>
            <FilterValue c={c} f={f} onChange={(value) => set(i, { value })} resolveRows={resolveRows} />
            <IconBtn icon="close" label={t('admin.tables.filter.remove')} onClick={() => setCfg((cc) => ({ ...cc, filters: (cc.filters ?? []).filter((_, j) => j !== i) }))} />
          </div>
        );
      })}
      <div className="row wrap">
        {first && <Button size="sm" variant="secondary" icon="plus" onClick={() => setCfg((c) => ({ ...c, filters: [...(c.filters ?? []), { column: first.name, op: opsFor(first)[0] }] }))}>{t('admin.tables.filter.add')}</Button>}
        {filters.length > 0 && <Button size="sm" variant="ghost" onClick={() => setCfg((c) => ({ ...c, filters: [] }))}>{t('admin.tables.filter.clear')}</Button>}
      </div>
    </PanelShell>
  );
}

export function SortPanel({ def, cfg, setCfg, technical, onClose, cols }: Base & { onClose: () => void; cols: ColumnDef[] }) {
  const { t } = useI18n();
  const sorts = cfg.sorts ?? [];
  const setSorts = (fn: (s: NonNullable<TableViewConfig['sorts']>) => NonNullable<TableViewConfig['sorts']>) => setCfg((c) => ({ ...c, sorts: fn(c.sorts ?? []) }));
  return (
    <PanelShell title={t('admin.tables.sort')} onClose={onClose}>
      {sorts.length === 0 && <p className="small muted">{t('admin.tables.sort.none')}</p>}
      {sorts.map((s, i) => (
        <div key={`${s.column}-${i}`} className="tbl-rule">
          <span className="small muted tbl-rule-join">{i === 0 ? t('admin.tables.sort.by') : t('admin.tables.sort.then')}</span>
          <ColumnSelect def={def} cols={cols} value={s.column} technical={technical} label={t('admin.tables.filter.column')} onChange={(column) => setSorts((l) => l.map((x, j) => (j === i ? { ...x, column } : x)))} />
          <Select className="tbl-ctl" aria-label={t('admin.tables.sort.dir')} value={s.dir} onChange={(e) => setSorts((l) => l.map((x, j) => (j === i ? { ...x, dir: e.target.value as 'asc' | 'desc' } : x)))}>
            <option value="asc">{t('admin.tables.sort.asc')}</option><option value="desc">{t('admin.tables.sort.desc')}</option>
          </Select>
          <IconBtn icon="arrow-up" label={t('admin.tables.moveUp')} disabled={i === 0} onClick={() => setSorts((l) => move(l, i, -1))} />
          <IconBtn icon="arrow-down" label={t('admin.tables.moveDown')} disabled={i === sorts.length - 1} onClick={() => setSorts((l) => move(l, i, 1))} />
          <IconBtn icon="close" label={t('admin.tables.sort.remove')} onClick={() => setSorts((l) => l.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div className="row wrap">
        {cols[0] && <Button size="sm" variant="secondary" icon="plus" onClick={() => setSorts((l) => [...l, { column: (cols.find((c) => !l.some((x) => x.column === c.name)) ?? cols[0]).name, dir: 'asc' }])}>{t('admin.tables.sort.add')}</Button>}
        {sorts.length > 0 && <Button size="sm" variant="ghost" onClick={() => setSorts(() => [])}>{t('admin.tables.sort.clear')}</Button>}
      </div>
      <p className="xs muted">{t('admin.tables.sort.tip')}</p>
    </PanelShell>
  );
}

export function GroupPanel({ def, cfg, setCfg, technical, onClose }: Base & { onClose: () => void }) {
  const { t } = useI18n();
  const cols = groupableColumns(def);
  return (
    <PanelShell title={t('admin.tables.group')} onClose={onClose}>
      {cols.length === 0 ? <p className="small muted">{t('admin.tables.group.noneAvailable')}</p> : (
        <div className="tbl-rule">
          <span className="small muted tbl-rule-join">{t('admin.tables.group.by')}</span>
          <Select className="tbl-ctl" aria-label={t('admin.tables.group.by')} value={cfg.groupBy ?? ''} onChange={(e) => setCfg((c) => ({ ...c, groupBy: e.target.value || null }))}>
            <option value="">{t('admin.tables.group.off')}</option>
            {cols.map((c) => <GroupOption key={c.name} def={def} c={c} technical={technical} />)}
          </Select>
        </div>
      )}
      <p className="xs muted">{t('admin.tables.group.tip')}</p>
    </PanelShell>
  );
}
function GroupOption({ def, c, technical }: { def: Def; c: ColumnDef; technical: boolean }) {
  const { lang } = useI18n();
  return <option value={c.name}>{columnLabel(def, c, lang)}{technical ? ` · ${c.name}` : ''}</option>;
}

export function ColumnsPanel({ def, cfg, setCfg, technical, onClose, canWrite }: Base & { onClose: () => void; canWrite: boolean }) {
  const { t, lang } = useI18n();
  const cols = orderedColumns(def, canWrite, cfg);
  const hidden = new Set(hiddenOf(def, cfg));
  const order = cols.map((c) => c.name);
  return (
    <PanelShell title={t('admin.tables.columnsPanel')} onClose={onClose}>
      <ul className="tbl-colslist">
        {cols.map((c, i) => (
          <li key={c.name} className="tbl-colsrow">
            <Toggle size="sm" checked={!hidden.has(c.name)} label={columnLabel(def, c, lang)} onChange={(on) => setCfg((cc) => { const h = new Set(hiddenOf(def, cc)); if (on) h.delete(c.name); else h.add(c.name); return { ...cc, hiddenColumns: [...h] }; })} />
            {technical && <code className="tbl-tech">{c.name}</code>}
            <span className="grow" />
            <IconBtn icon="arrow-up" label={t('admin.tables.moveUp')} disabled={i === 0} onClick={() => setCfg((cc) => ({ ...cc, columnOrder: move(order, i, -1) }))} />
            <IconBtn icon="arrow-down" label={t('admin.tables.moveDown')} disabled={i === cols.length - 1} onClick={() => setCfg((cc) => ({ ...cc, columnOrder: move(order, i, 1) }))} />
          </li>
        ))}
      </ul>
      <div className="row wrap"><Button size="sm" variant="ghost" onClick={() => setCfg((c) => ({ ...c, hiddenColumns: undefined, columnOrder: undefined }))}>{t('admin.tables.columns.reset')}</Button></div>
    </PanelShell>
  );
}

export function ExportPanel({ count, onExport, onClose }: { count: number; onExport: (f: 'json' | 'csv') => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <PanelShell title={t('admin.tables.export')} onClose={onClose}>
      <p className="small muted">{t('admin.tables.export.hint', { n: count })}</p>
      <div className="row wrap">
        <Button size="sm" variant="secondary" icon="braces" onClick={() => onExport('json')}>{t('admin.tables.export.json')}</Button>
        <Button size="sm" variant="secondary" icon="table" onClick={() => onExport('csv')}>{t('admin.tables.export.csv')}</Button>
      </div>
    </PanelShell>
  );
}

export interface ViewsPanelProps {
  views: TableViewRow[]; activeId: string | null; canWrite: boolean; onClose: () => void;
  onPick: (v: TableViewRow) => void; onDefault: () => void; onSave: (name: string) => void;
  /** 0045: rename / delete — only the view's creator or a role with tables.write. */
  canEdit: (v: TableViewRow) => boolean; onRename: (v: TableViewRow, name: string) => void; onDelete: (v: TableViewRow) => void;
}

export function ViewsPanel({ views, activeId, onPick, onDefault, onSave, canWrite, onClose, canEdit, onRename, onDelete }: ViewsPanelProps) {
  const { t, bi } = useI18n();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <PanelShell title={t('admin.tables.views')} onClose={onClose}>
      <ul className="tbl-viewlist">
        <li><button type="button" className={`tbl-viewbtn ${activeId == null ? 'is-active' : ''}`} aria-pressed={activeId == null} onClick={onDefault}><Icon name="table" size="sm" /><span className="grow">{t('admin.tables.views.default')}</span></button></li>
        {views.map((v) => (
          <li key={v.id} className="tbl-viewitem">
            {editing === v.id ? (
              <form className="tbl-rule" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onRename(v, draft.trim()); setEditing(null); } }}>
                <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={t('admin.tables.views.rename')} className="tbl-ctl grow" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); } }} />
                <Button size="sm" type="submit" icon="check" disabled={!draft.trim()}>{t('core.common.save')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t('core.common.cancel')}</Button>
              </form>
            ) : (
              <div className="tbl-viewrow">
                <button type="button" className={`tbl-viewbtn ${activeId === v.id ? 'is-active' : ''}`} aria-pressed={activeId === v.id} onClick={() => onPick(v)}>
                  <Icon name={VIEW_ICON[v.kind]} size="sm" /><span className="grow">{bi(v.name)}</span>
                  <span className="xs muted">{t(`admin.tables.view.${v.kind}`)}{v.is_default ? ` · ${t('admin.tables.views.isDefault')}` : ''}</span>
                </button>
                {canEdit(v) && <IconBtn icon="edit" label={t('admin.tables.views.renameNamed', { name: bi(v.name) })} onClick={() => { setConfirming(null); setDraft(bi(v.name)); setEditing(v.id); }} />}
                {canEdit(v) && <IconBtn icon="trash" label={t('admin.tables.views.deleteNamed', { name: bi(v.name) })} onClick={() => { setEditing(null); setConfirming(v.id); }} />}
              </div>
            )}
            {confirming === v.id && (
              <Notice tone="danger" title={t('admin.tables.views.deleteConfirm', { name: bi(v.name) })}
                action={<div className="row wrap"><Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>{t('core.common.cancel')}</Button><Button size="sm" variant="danger" icon="trash" onClick={() => { onDelete(v); setConfirming(null); }}>{t('core.common.delete')}</Button></div>}>
                {t('admin.tables.views.deleteBody')}
              </Notice>
            )}
          </li>
        ))}
      </ul>
      {canWrite && (
        <form className="tbl-rule" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onSave(name.trim()); setName(''); } }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('admin.tables.views.namePh')} aria-label={t('admin.tables.views.name')} className="tbl-ctl grow" />
          <Button size="sm" type="submit" icon="plus" disabled={!name.trim()}>{t('admin.tables.views.save')}</Button>
        </form>
      )}
    </PanelShell>
  );
}

export const VIEW_ICON = { grid: 'table', list: 'list', gallery: 'grid', kanban: 'kanban', calendar: 'calendar-days', timeline: 'gantt', graph: 'graph' } as const;
