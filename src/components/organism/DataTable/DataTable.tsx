import { useMemo, useState, type ReactNode } from 'react';
import { useT } from '../../../i18n/I18nProvider';
import './DataTable.css';

export interface DataTableColumn<T> {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
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
}

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** Sortable, searchable, paginated table. Rows are objects; columns say how to render them. */
export function DataTable<T extends Record<string, unknown>>({ columns, rows, rowKey, onRowClick, selectedKey, search = '', emptyText, dense = false, pageSize = 50, stickyHeader = true }: DataTableProps<T>) {
  const t = useT();
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)));
  }, [rows, columns, search]);
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const s = [...filtered].sort((a, b) => cmp(a[sort.key], b[sort.key]));
    return sort.dir === 'asc' ? s : s.reverse();
  }, [filtered, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key: string) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  return (
    <div className={`datatable ${dense ? 'is-dense' : ''}`}>
      <div className="datatable-scroll">
        <table>
          <thead className={stickyHeader ? 'is-sticky' : ''}>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width, textAlign: c.align }} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable === false ? c.label : (
                    <button type="button" className="datatable-sort" onClick={() => toggleSort(c.key)}>
                      {c.label}<span className="datatable-sorticon" aria-hidden>{sort?.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={columns.length} className="datatable-empty">{emptyText ?? t('core.common.empty')}</td></tr>}
            {visible.map((r) => {
              const k = rowKey(r);
              return (
                <tr key={k} className={`${onRowClick ? 'is-clickable' : ''} ${selectedKey === k ? 'is-selected' : ''}`} onClick={onRowClick ? () => onRowClick(r) : undefined} tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}>
                  {columns.map((c) => <td key={c.key} className={c.mono ? 'mono' : ''} style={{ textAlign: c.align }}>{c.render ? c.render(r) : formatCell(r[c.key])}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="datatable-foot">
        <span className="muted small">{t('core.common.rows', { n: sorted.length })}</span>
        {pages > 1 && (
          <span className="row">
            <button type="button" className="datatable-page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹</button>
            <span className="small mono">{safePage + 1} / {pages}</span>
            <button type="button" className="datatable-page" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>›</button>
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
