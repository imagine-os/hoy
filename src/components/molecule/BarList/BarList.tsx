import './BarList.css';

export interface BarListItem { id: string; label: string; value: number; hint?: string }

export interface BarListProps {
  items: BarListItem[];
  /** Formats the value at the end of each bar. */
  format?: (v: number) => string;
  /** Scale ceiling; defaults to the largest value. */
  max?: number;
  /** Draws that item in the accent hue (e.g. "today"). */
  emphasizeId?: string;
  emptyText?: string;
}

/** Single-series magnitude chart as a labelled bar list: one hue, thin marks, value at the data end, table-readable. */
export function BarList({ items, format = (v) => String(v), max, emphasizeId, emptyText = '—' }: BarListProps) {
  const ceiling = Math.max(1, max ?? Math.max(...items.map((i) => i.value), 0));
  if (items.length === 0) return <p className="small muted barlist-empty">{emptyText}</p>;
  return (
    <div className="barlist" role="table">
      {items.map((it) => {
        const pct = Math.max(0, Math.min(100, (it.value / ceiling) * 100));
        return (
          <div key={it.id} className={`barlist-row ${emphasizeId === it.id ? 'is-emph' : ''}`} role="row" title={`${it.label}: ${format(it.value)}${it.hint ? ` · ${it.hint}` : ''}`}>
            <span className="barlist-label" role="cell">{it.label}</span>
            <span className="barlist-track" role="cell" aria-hidden><span className="barlist-fill" style={{ width: `${pct}%` }} /></span>
            <span className="barlist-value mono" role="cell">{format(it.value)}{it.hint && <span className="xs muted barlist-hint"> {it.hint}</span>}</span>
          </div>
        );
      })}
    </div>
  );
}
