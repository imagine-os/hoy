import { Fragment, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useT } from '../../../i18n/I18nProvider';
import './DataTable.css';
import { Icon } from '../../atom/Icon/Icon';

export interface DataTableColumn<T> {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  /** 0044: the value the column sorts by when it is not `row[key]` (a foreign key sorts by the referenced row's title). */
  sortValue?: (row: T) => unknown;
}

export interface DataTableSort { key: string; dir: 'asc' | 'desc' }

/** 0044: rows grouped under header rows (M-03 "Agrupar por"). Groups keep the order of their first row after sorting unless `order` says otherwise. */
export interface DataTableGroupBy<T> {
  value: (row: T) => string;
  label?: (value: string, count: number) => ReactNode;
  order?: string[];
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  search?: string;
  emptyText?: string;
  dense?: boolean;
  pageSize?: number;
  stickyHeader?: boolean;
  /** 0044: column keys not rendered (the column list stays the same, so a saved view can hide and show them). */
  hiddenColumns?: string[];
  /** 0044: group rows under header rows. */
  groupBy?: DataTableGroupBy<T>;
  /** 0044: allow several sort keys — Shift + click (or Shift + Enter) on a header adds it; a plain click replaces the sort. */
  multiSort?: boolean;
  /** 0044: controlled sort (with `onSortsChange`); omit both for the built-in single-column sort. */
  sorts?: DataTableSort[];
  onSortsChange?: (sorts: DataTableSort[]) => void;
  /** 0044: a page-wide cell renderer that wins over `column.render` when it returns something other than undefined. */
  onCellRender?: (row: T, column: DataTableColumn<T>) => ReactNode | undefined;
}

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** Sortable, searchable, paginated table. Rows are objects; columns say how to render them. */
export function DataTable<T extends Record<string, unknown>>({ columns, rows, rowKey, onRowClick, selectedKey, search = '', emptyText, dense = false, pageSize = 50, stickyHeader = true, hiddenColumns, groupBy, multiSort = false, sorts, onSortsChange, onCellRender }: DataTableProps<T>) {
  const t = useT();
  const [ownSorts, setOwnSorts] = useState<DataTableSort[]>([]);
  const [page, setPage] = useState(0);
  const activeSorts = sorts ?? ownSorts;
  const setSorts = (next: DataTableSort[]) => { if (onSortsChange) onSortsChange(next); if (!sorts) setOwnSorts(next); };
  const shown = useMemo(() => (hiddenColumns?.length ? columns.filter((c) => !hiddenColumns.includes(c.key)) : columns), [columns, hiddenColumns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)));
  }, [rows, columns, search]);
  const sorted = useMemo(() => {
    if (activeSorts.length === 0) return filtered;
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const val = (r: T, key: string) => { const c = byKey.get(key); return c?.sortValue ? c.sortValue(r) : r[key]; };
    return [...filtered].sort((a, b) => {
      for (const s of activeSorts) { const d = cmp(val(a, s.key), val(b, s.key)); if (d !== 0) return s.dir === 'asc' ? d : -d; }
      return 0;
    });
  }, [filtered, activeSorts, columns]);
  const grouped = useMemo(() => {
    if (!groupBy) return sorted;
    const order = new Map<string, number>();
    (groupBy.order ?? []).forEach((g, i) => order.set(g, i));
    for (const r of sorted) { const g = groupBy.value(r); if (!order.has(g)) order.set(g, order.size + 1e6); }
    return [...sorted].sort((a, b) => (order.get(groupBy.value(a))! - order.get(groupBy.value(b))!));
  }, [sorted, groupBy]);
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (groupBy) for (const r of grouped) { const g = groupBy.value(r); m.set(g, (m.get(g) ?? 0) + 1); }
    return m;
  }, [grouped, groupBy]);
  const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = grouped.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key: string, add: boolean) => {
    const cur = activeSorts.find((s) => s.key === key);
    const nextDir: DataTableSort | null = !cur ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null;
    if (multiSort && add) setSorts(nextDir ? (cur ? activeSorts.map((s) => (s.key === key ? nextDir : s)) : [...activeSorts, nextDir]) : activeSorts.filter((s) => s.key !== key));
    else setSorts(nextDir ? [nextDir] : []);
  };
  const sortOf = (key: string) => activeSorts.find((s) => s.key === key);
  const sortIndex = (key: string) => activeSorts.findIndex((s) => s.key === key);
  const cell = (r: T, c: DataTableColumn<T>) => {
    const custom = onCellRender?.(r, c);
    if (custom !== undefined) return custom;
    return c.render ? c.render(r) : formatCell(r[c.key]);
  };

  let lastGroup: string | null = null;
  return (
    <div className={`datatable ${dense ? 'is-dense' : ''}`}>
      <div className="datatable-scroll">
        <table>
          <thead className={stickyHeader ? 'is-sticky' : ''}>
            <tr>
              {shown.map((c) => {
                const s = sortOf(c.key);
                return (
                  <th key={c.key} style={{ width: c.width, textAlign: c.align }} aria-sort={s ? (s.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortable === false ? c.label : (
                      <button type="button" className="datatable-sort" onClick={(e: MouseEvent) => toggleSort(c.key, e.shiftKey)}>
                        <span className="datatable-thlabel">{c.label}</span>
                        <span className="datatable-sorticon" aria-hidden><Icon name={s ? (s.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'sort'} size="xs" />{s && activeSorts.length > 1 && <span className="datatable-sortn">{sortIndex(c.key) + 1}</span>}</span>
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={shown.length} className="datatable-empty">{emptyText ?? t('core.common.empty')}</td></tr>}
            {visible.map((r) => {
              const k = rowKey(r);
              const g = groupBy ? groupBy.value(r) : null;
              const head = groupBy && g !== lastGroup;
              lastGroup = g;
              return (
                <Fragment key={k}>
                  {head && (
                    <tr className="datatable-group">
                      <th colSpan={shown.length} scope="colgroup">
                        {groupBy!.label ? groupBy!.label(g!, groupCounts.get(g!) ?? 0) : <>{g || '—'} <span className="datatable-groupcount">{groupCounts.get(g!) ?? 0}</span></>}
                      </th>
                    </tr>
                  )}
                  <tr className={`${onRowClick ? 'is-clickable' : ''} ${selectedKey === k ? 'is-selected' : ''}`} onClick={onRowClick ? () => onRowClick(r) : undefined} tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(r); } : undefined}>
                    {shown.map((c) => <td key={c.key} className={c.mono ? 'mono' : ''} style={{ textAlign: c.align }}>{cell(r, c)}</td>)}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="datatable-foot">
        <span className="muted small">{t('core.common.rows', { n: grouped.length })}</span>
        {pages > 1 && (
          <span className="row datatable-pager">
            <button type="button" className="datatable-page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label={t('core.common.previous')}><Icon name="chevron-left" size="sm" /></button>
            <span className="small">{safePage + 1} / {pages}</span>
            <button type="button" className="datatable-page" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label={t('core.common.next')}><Icon name="chevron-right" size="sm" /></button>
          </span>
        )}
      </div>
    </div>
  );
}

export function formatCell(v: unknown): ReactNode {
  if (v == null || v === '') return <span className="muted">—</span>;
  if (typeof v === 'boolean') return v ? '✓' : '·';
  if (typeof v === 'object') return <code className="datatable-json">{JSON.stringify(v)}</code>;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return <span className="mono small">{s.slice(0, 16).replace('T', ' ')}</span>;
  return s;
}
