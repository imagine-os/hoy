/**
 * 0045 — M-03 "Calendario" and "Línea de tiempo": the table's rows handed to the CalendarView / TimelineView organisms,
 * placed by the view's date column (config.dateColumn, default dateColumnOf) and end column (config.endColumn, default
 * endColumnOf). Tones: the row's own tone → the tone of a row it points at (a class's modality) → its status enum.
 */
import { useCallback, useMemo } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { TONES } from '../../../design/tokens';
import type { BaseRow, ColumnDef, TableViewConfig } from '../../../data/schema';
import { biText, columnLabel, enumLabel, rowTitle } from '../../../data/labels';
import type { Lang } from '../../../i18n/types';
import { formatWhen } from './cells';
import { dateColumnOf, dateColumnsOf, endColumnOf } from '../../../data/relations';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Select } from '../../../components/atom/Input/Input';
import { Icon } from '../../../components/atom/Icon/Icon';
import { CalendarView, type CalendarMode } from '../../../components/organism/CalendarView/CalendarView';
import { TimelineView, type TimelineZoom } from '../../../components/organism/TimelineView/TimelineView';
import type { EventTone } from '../../../components/organism/CalendarView/events';
import { cellText, type Def, type Resolve } from './model';

/** The date and end columns a view places rows by (invalid saved names fall back to the defaults). */
export function timeColumns(def: Def, cfg: TableViewConfig): { date: string | null; end: string | null; options: string[] } {
  const options = dateColumnsOf(def.name);
  const date = cfg.dateColumn && options.includes(cfg.dateColumn) ? cfg.dateColumn : dateColumnOf(def.name);
  const end = cfg.endColumn === undefined ? endColumnOf(def.name, date) : cfg.endColumn && options.includes(cfg.endColumn) && cfg.endColumn !== date ? cfg.endColumn : null;
  return { date, end, options };
}

const statusCol = (def: Def) => def.columns.find((c) => c.enum && /(^|_)status$/.test(c.name));
const isTone = (v: unknown): v is EventTone => typeof v === 'string' && (TONES as readonly string[]).includes(v);

/** Row → tone, muted, detail badge, shared by both views. */
function useRowLook(def: Def, resolve: Resolve, groupBy?: string | null) {
  const { lang } = useI18n();
  const st = statusCol(def);
  const fks = def.columns.filter((c) => c.references && c.references !== 'tenants');
  const getTone = useCallback((r: BaseRow): EventTone | null => {
    if (isTone(r.tone)) return r.tone;
    for (const c of fks) { const v = r[c.name]; if (typeof v === 'string') { const ref = resolve(c.references!, v); if (ref && isTone(ref.tone)) return ref.tone; } }
    const sv = st ? r[st.name] : null;
    return typeof sv === 'string' ? toneForStatus(sv) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, resolve]);
  const getMuted = useCallback((r: BaseRow) => { const sv = st ? r[st.name] : null; return typeof sv === 'string' && toneForStatus(sv) === 'danger'; }, [st]);
  const getDetail = useCallback((r: BaseRow) => { const sv = st ? r[st.name] : null; return typeof sv === 'string' ? <Badge tone={toneForStatus(sv)}>{enumLabel(sv, lang)}</Badge> : null; }, [st, lang]);
  const getTitle = useCallback((r: BaseRow) => timeTitle(def, r, lang, resolve, groupBy), [def, lang, resolve, groupBy]);
  return { getTone, getMuted, getDetail, getTitle };
}

const isDateCol = (c?: ColumnDef) => !!c && (c.type === 'date' || c.type === 'timestamptz');
/**
 * The text of a chip or a bar. rowTitle, except where it would repeat what the view already shows: a date title
 * (payroll_runs.period_start, hours_overrides.start_date) or a slug (events.slug) gives way to a title / name / label / note column or reads as
 * a formatted date, and a title that is the lane (memberships.plan_id in lanes by plan) gives way to the next reference (the person).
 */
function timeTitle(def: Def, r: BaseRow, lang: Lang, resolve: Resolve, groupBy?: string | null): string {
  const tc = def.allColumns.find((c) => c.name === def.titleColumn);
  if (tc && groupBy && tc.name === groupBy) {
    const other = def.columns.find((c) => c.references && c.references !== 'tenants' && c.name !== groupBy && typeof r[c.name] === 'string');
    const ref = other ? resolve(other.references!, String(r[other.name])) : undefined;
    if (other && ref) return rowTitle(other.references!, ref, lang, resolve);
  }
  // a date or a slug / key reads worse than the row's own words (events.slug → events.title)
  if (isDateCol(tc) || (tc && /^(slug|key)$/.test(tc.name))) {
    for (const name of ['title', 'name', 'label', 'note']) {
      const c = def.columns.find((x) => x.name === name);
      const v = c ? r[c.name] : null;
      const text = v == null || v === '' ? '' : c!.type === 'json' ? biText(v, lang) ?? '' : String(v);
      if (text) return text;
    }
    const v = r[tc!.name];
    if (isDateCol(tc) && typeof v === 'string') return formatWhen(tc!, v, lang);
  }
  return rowTitle(def, r, lang, resolve);
}

interface TimeProps {
  def: Def;
  rows: BaseRow[];
  cfg: TableViewConfig;
  resolve: Resolve;
  onOpen: (id: string) => void;
  selected: string | null;
  cursor: string;
  onCursorChange: (key: string) => void;
}

export function CalendarTableView({ def, rows, cfg, resolve, onOpen, selected, cursor, onCursorChange, mode, onModeChange, onCreate }: TimeProps & { mode: CalendarMode; onModeChange: (m: CalendarMode) => void; onCreate?: (dateKey: string, time?: string) => void }) {
  const { t, lang } = useI18n();
  const { date, end } = timeColumns(def, cfg);
  const look = useRowLook(def, resolve);
  const getDate = useCallback((r: BaseRow) => (date ? r[date] : null), [date]);
  const getEnd = useCallback((r: BaseRow) => (end ? r[end] : null), [end]);
  const open = useCallback((r: BaseRow) => onOpen(r.id), [onOpen]);
  return (
    <CalendarView<BaseRow> rows={rows} getDate={getDate} getEnd={end ? getEnd : undefined} {...look} onOpen={open} onCreate={onCreate}
      mode={mode} onModeChange={onModeChange} cursor={cursor} onCursorChange={onCursorChange} lang={lang} selectedKey={selected}
      ariaLabel={t('admin.tables.calendar.aria', { column: date ? columnLabel(def, date, lang) : '' })} />
  );
}

export function TimelineTableView({ def, rows, cfg, resolve, onOpen, selected, cursor, onCursorChange, zoom, onZoomChange }: TimeProps & { zoom: TimelineZoom; onZoomChange: (z: TimelineZoom) => void }) {
  const { t, lang } = useI18n();
  const { date, end } = timeColumns(def, cfg);
  const g: ColumnDef | undefined = cfg.groupBy ? def.allColumns.find((c) => c.name === cfg.groupBy) : undefined;
  const look = useRowLook(def, resolve, g?.name);
  const getDate = useCallback((r: BaseRow) => (date ? r[date] : null), [date]);
  const getEnd = useCallback((r: BaseRow) => (end ? r[end] : null), [end]);
  const open = useCallback((r: BaseRow) => onOpen(r.id), [onOpen]);
  const getGroup = useMemo(() => (g ? (r: BaseRow) => {
    const v = r[g.name];
    if (v == null || v === '') return null;
    const label = g.type === 'bool' ? t(v ? 'admin.tables.yes' : 'admin.tables.no') : cellText(g, r, lang, resolve);
    return { key: String(v), label };
  } : undefined), [g, lang, resolve, t]);
  const groupOrder = g?.enum ? [...g.enum] : g?.type === 'bool' ? ['true', 'false'] : undefined;
  return (
    <TimelineView<BaseRow> rows={rows} getDate={getDate} getEnd={end ? getEnd : undefined} {...look} onOpen={open} getGroup={getGroup} groupOrder={groupOrder}
      groupLabel={g ? columnLabel(def, g, lang) : undefined} zoom={zoom} onZoomChange={onZoomChange} cursor={cursor} onCursorChange={onCursorChange} lang={lang} selectedKey={selected}
      ariaLabel={t('admin.tables.timeline.aria', { column: date ? columnLabel(def, date, lang) : '' })} />
  );
}

/** The toolbar's "Fecha" and "Hasta" pickers (calendar and timeline only). */
export function DateColumnPicker({ def, cfg, setCfg, technical }: { def: Def; cfg: TableViewConfig; setCfg: (fn: (c: TableViewConfig) => TableViewConfig) => void; technical: boolean }) {
  const { t, lang } = useI18n();
  const { date, end, options } = timeColumns(def, cfg);
  if (!date) return null;
  const opt = (name: string) => <option key={name} value={name}>{columnLabel(def, name, lang)}{technical ? ` · ${name}` : ''}</option>;
  return (
    <div className="tbl-datepick" role="group" aria-label={t('admin.tables.date.group')}>
      <label className="tbl-datepick-field">
        <span className="small muted">{t('admin.tables.date')}</span>
        <Select className="tbl-ctl" value={date} onChange={(e) => setCfg((c) => ({ ...c, dateColumn: e.target.value, endColumn: undefined }))}>{options.map(opt)}</Select>
      </label>
      <Icon name="arrow-right" size="xs" className="muted" />
      <label className="tbl-datepick-field">
        <span className="small muted">{t('admin.tables.dateEnd')}</span>
        <Select className="tbl-ctl" value={end ?? ''} onChange={(e) => setCfg((c) => ({ ...c, endColumn: e.target.value || null }))}>
          <option value="">{t('admin.tables.dateEnd.none')}</option>
          {options.filter((n) => n !== date).map(opt)}
        </Select>
      </label>
    </div>
  );
}
