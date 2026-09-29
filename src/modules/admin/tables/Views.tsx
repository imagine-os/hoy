import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { BaseRow, ColumnDef, TableViewConfig } from '../../../data/schema';
import { columnLabel, enumLabel, rowTitle } from '../../../data/labels';
import { DataTable, type DataTableColumn, type DataTableSort } from '../../../components/organism/DataTable/DataTable';
import { KanbanBoard, type KanbanCard, type KanbanColumn } from '../../../components/organism/KanbanBoard/KanbanBoard';
import { ListRow } from '../../../components/molecule/ListRow/ListRow';
import { Card } from '../../../components/molecule/Card/Card';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Select } from '../../../components/atom/Input/Input';
import { Icon } from '../../../components/atom/Icon/Icon';
import { CellValue, displayText, type CellCtx } from './cells';
import { cellText, defaultLaneColumn, isNumber, laneColumns, mediaColumn, sortValue, type Def } from './model';

export interface ViewProps {
  def: Def;
  /** Rows after filters and search, sorted (the grid re-sorts itself with the same sorts). */
  rows: BaseRow[];
  /** Visible columns, in view order. */
  cols: ColumnDef[];
  cfg: TableViewConfig;
  setCfg: (fn: (c: TableViewConfig) => TableViewConfig) => void;
  ctx: CellCtx;
  onOpen: (id: string) => void;
  selected: string | null;
  technical: boolean;
  canWrite: boolean;
}

/** The status-like enum a card or row shows as its badge (status, approval_status…). */
const statusCol = (def: Def) => def.columns.find((c) => c.enum && /(^|_)status$/.test(c.name));
const BASE = ['id', 'tenant_id', 'created_at', 'updated_at'];
/** The quiet fields of a card or list row: visible columns minus the title, the base columns, json and bare ids (foreign keys stay). */
const detailCols = (def: Def, cols: ColumnDef[], n: number, exclude: string[] = []) => cols.filter((c) => {
  if (c.name === def.titleColumn || BASE.includes(c.name) || exclude.includes(c.name)) return false;
  if (c.references) return true;
  return c.type !== 'json' && c.type !== 'uuid';
}).slice(0, n);

/** Grid: the DataTable organism with human headers, grouping, multi-sort and design-system cells. */
export function GridView({ def, rows, cols, cfg, setCfg, ctx, onOpen, selected, technical }: ViewProps) {
  const { t, lang } = useI18n();
  const columns = useMemo<DataTableColumn<BaseRow>[]>(() => cols.map((c) => ({
    key: c.name,
    label: <><span>{columnLabel(def, c, lang)}</span>{technical && <code className="tbl-tech">{c.name}</code>}</>,
    align: isNumber(c) ? 'right' : undefined,
    render: (r) => <CellValue c={c} row={r} ctx={ctx} />,
    sortValue: (r) => sortValue(c, r, lang, ctx.resolve),
  })), [cols, def, lang, technical, ctx]);
  const sorts: DataTableSort[] = (cfg.sorts ?? []).map((s) => ({ key: s.column, dir: s.dir }));
  const g = cfg.groupBy ? def.allColumns.find((c) => c.name === cfg.groupBy) : undefined;
  const groupBy = g ? {
    value: (r: BaseRow) => String(r[g.name] ?? ''),
    order: g.enum ? [...g.enum] : g.type === 'bool' ? ['true', 'false'] : undefined,
    label: (value: string, count: number) => (
      <span className="tbl-grouphead">
        <span className="eyebrow">{columnLabel(def, g, lang)}</span>
        <span>{value === '' ? t('admin.tables.empty.value') : g.type === 'bool' ? t(value === 'true' ? 'admin.tables.yes' : 'admin.tables.no') : cellText(g, { [g.name]: value } as BaseRow, lang, ctx.resolve)}</span>
        <span className="tbl-groupcount">{count}</span>
      </span>
    ),
  } : undefined;
  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => onOpen(r.id)} selectedKey={selected} dense multiSort groupBy={groupBy}
      sorts={sorts} onSortsChange={(s) => setCfg((c) => ({ ...c, sorts: s.map((x) => ({ column: x.key, dir: x.dir })) }))} emptyText={t('admin.tables.noRows')} />
  );
}

function useMore(total: number, step: number) {
  const [n, setN] = useState(step);
  return { n, more: total > n ? () => setN((x) => x + step) : null, left: Math.min(step, total - n) };
}

/** List: one ListRow per row — title, two or three quiet fields, the status badge. */
export function ListView({ def, rows, cols, ctx, onOpen }: ViewProps) {
  const { t, lang } = useI18n();
  const st = statusCol(def);
  const details = detailCols(def, cols, 3, st ? [st.name] : []);
  const { n, more, left } = useMore(rows.length, 60);
  if (rows.length === 0) return <EmptyState title={t('admin.tables.noRows')} icon="list" />;
  return (
    <div className="stack-sm">
      <div className="tbl-listgroup">
        {rows.slice(0, n).map((r) => {
          const sv = st ? r[st.name] : null;
          const sub = details.map((c) => { const txt = displayText(c, r, ctx); return txt ? `${columnLabel(def, c, lang)}: ${txt}` : null; }).filter(Boolean).join(' · ');
          return <ListRow key={r.id} icon={def.icon ?? 'table'} title={rowTitle(def, r, lang, ctx.resolve)} subtitle={sub || undefined} onClick={() => onOpen(r.id)}
            trailing={typeof sv === 'string' ? <Badge tone={toneForStatus(sv)}>{enumLabel(sv, lang)}</Badge> : undefined} />;
        })}
      </div>
      {more && <Button variant="secondary" size="sm" onClick={more}>{t('core.kanban.more', { n: left })}</Button>}
    </div>
  );
}

const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//.test(v);
const TONES = new Set(['moss', 'river', 'clay', 'sun', 'sage', 'slate', 'plum']);

/** Gallery: responsive Card grid — cover (media, tone or table glyph), title, up to four fields, status badge. */
export function GalleryView({ def, rows, cols, cfg, ctx, onOpen }: ViewProps) {
  const { t, lang } = useI18n();
  const st = statusCol(def);
  const media = mediaColumn(def);
  const fields = (cfg.cardFields?.length ? cfg.cardFields.map((n) => def.allColumns.find((c) => c.name === n)).filter((c): c is ColumnDef => !!c) : detailCols(def, cols, 4, st ? [st.name] : [])).slice(0, 4);
  const { n, more, left } = useMore(rows.length, 48);
  if (rows.length === 0) return <EmptyState title={t('admin.tables.noRows')} icon="grid" />;
  return (
    <div className="stack">
      <ul className="tbl-gallery">
        {rows.slice(0, n).map((r) => {
          const title = rowTitle(def, r, lang, ctx.resolve);
          const tone = typeof r.tone === 'string' && TONES.has(r.tone) ? r.tone : null;
          const src = media ? r[media.name] : null;
          const sv = st ? r[st.name] : null;
          return (
            <li key={r.id}>
              <Card padding="none" className="tbl-card">
                <div className={`tbl-cover ${tone ? `tbl-cover-${tone}` : ''}`} aria-hidden>
                  {isUrl(src) ? <img src={src} alt="" loading="lazy" /> : <Icon name={def.icon ?? 'table'} size="xl" />}
                </div>
                <div className="tbl-card-body">
                  <div className="tbl-card-head">
                    <button type="button" className="tbl-card-title" onClick={() => onOpen(r.id)}>{title}</button>
                    {typeof sv === 'string' && <Badge tone={toneForStatus(sv)}>{enumLabel(sv, lang)}</Badge>}
                  </div>
                  <dl className="tbl-fields">
                    {fields.map((c) => (
                      <div key={c.name} className="tbl-field"><dt>{columnLabel(def, c, lang)}</dt><dd><CellValue c={c} row={r} ctx={ctx} /></dd></div>
                    ))}
                  </dl>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      {more && <Button variant="secondary" size="sm" onClick={more}>{t('core.kanban.more', { n: left })}</Button>}
    </div>
  );
}

/** Kanban: one lane per value of an enum / boolean column; drag or "Move to…" writes data.update. */
export function KanbanView({ def, rows, cols, cfg, setCfg, ctx, onOpen, canWrite, onMove, technical }: ViewProps & { onMove: (id: string, column: string, value: string | boolean) => void }) {
  const { t, lang } = useI18n();
  const choices = laneColumns(def);
  const laneName = cfg.kanbanColumn && choices.some((c) => c.name === cfg.kanbanColumn) ? cfg.kanbanColumn : defaultLaneColumn(def);
  const lane = def.allColumns.find((c) => c.name === laneName);
  if (!lane) return <EmptyState title={t('admin.tables.kanban.none')} body={t('admin.tables.kanban.noneBody')} icon="kanban" />;
  const values = lane.type === 'bool' ? ['true', 'false'] : [...(lane.enum ?? [])];
  const hasNull = rows.some((r) => r[lane.name] == null || r[lane.name] === '');
  const columns: KanbanColumn[] = values.map((v) => ({ id: v, label: lane.type === 'bool' ? t(v === 'true' ? 'admin.tables.yes' : 'admin.tables.no') : enumLabel(v, lang), tone: lane.type === 'bool' ? (v === 'true' ? 'success' : 'neutral') : toneForStatus(v) }));
  if (hasNull) columns.push({ id: '__none', label: t('admin.tables.empty.value'), tone: 'neutral' });
  const fields = (cfg.cardFields?.length ? cfg.cardFields.map((n) => def.allColumns.find((c) => c.name === n)).filter((c): c is ColumnDef => !!c) : detailCols(def, cols, 3, [lane.name])).filter((c) => c.name !== lane.name).slice(0, 3);
  const cards: KanbanCard[] = rows.map((r) => {
    const raw = r[lane.name];
    const name = rowTitle(def, r, lang, ctx.resolve);
    return {
      id: r.id, column: raw == null || raw === '' ? '__none' : String(raw), title: name, name,
      meta: fields.map((c) => { const txt = displayText(c, r, ctx); return txt ? <span key={c.name}><span className="muted">{columnLabel(def, c, lang)}:</span> {txt}</span> : null; }),
    };
  });
  return (
    <div className="stack">
      {choices.length > 1 && (
        <label className="row wrap tbl-lanepick">
          <span className="small muted">{t('admin.tables.kanban.by')}</span>
          <Select className="tbl-ctl" value={lane.name} onChange={(e) => setCfg((c) => ({ ...c, kanbanColumn: e.target.value }))}>
            {choices.map((c) => <option key={c.name} value={c.name}>{columnLabel(def, c, lang)}{technical ? ` · ${c.name}` : ''}</option>)}
          </Select>
        </label>
      )}
      {!canWrite && <p className="small muted">{t('admin.tables.kanban.readOnly')}</p>}
      <KanbanBoard ariaLabel={t('admin.tables.kanban.aria', { column: columnLabel(def, lane, lang) })} columns={columns} cards={cards} onOpen={onOpen}
        onMove={canWrite ? (id, to) => { if (to !== '__none') onMove(id, lane.name, lane.type === 'bool' ? to === 'true' : to); } : undefined} />
    </div>
  );
}
