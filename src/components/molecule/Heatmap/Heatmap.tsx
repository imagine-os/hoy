import { useI18n } from '../../../i18n/I18nProvider';
import './Heatmap.css';

export interface HeatmapAxis { key: string; label: string }
export interface HeatmapCell { row: string; col: string; /** 0–100 */ value: number; hint?: string }

export interface HeatmapProps {
  /** Weekdays (row headers). */
  rows: HeatmapAxis[];
  /** Hours (column headers). */
  cols: HeatmapAxis[];
  /** A missing row × col pair renders as an empty "no class" cell. */
  cells: HeatmapCell[];
  /** Formats the value in the cell and its name; default `${v}%`. */
  format?: (v: number) => string;
  /** Ends of the 5-step legend, already translated ("Baja" / "Alta"). */
  legend?: { low: string; high: string };
  /** Name of the table (also its caption for screen readers). */
  ariaLabel: string;
  /** Print the formatted value inside each cell (default false: the value is in every cell's title and accessible
   *  name; direct labels on every cell crowd the grid). Turn on only for a handful of large cells. */
  showValues?: boolean;
  /** Name of an empty cell; bilingual default "Sin clase". */
  emptyLabel?: string;
}

const WORDS = { empty: { es: 'Sin clase', en: 'No class' } };

/** 0–100 → step 1–5 (0–19 · 20–39 · 40–59 · 60–79 · 80–100). A class at 0 % is still a class: step 1, not empty. */
export const heatStep = (v: number) => Math.min(5, Math.max(1, Math.floor(Math.max(0, v) / 20) + 1));

/**
 * Weekday × hour fill grid (M-12 analytics). Five sequential steps of the brand blue mixed into the tile surface with
 * `color-mix()`, one `<td>` per slot with a title and an accessible name, every cell focusable. The table scrolls
 * inside its card when the column is narrower than the grid; the weekday column stays sticky.
 */
export function Heatmap({ rows, cols, cells, format = (v) => `${Math.round(v)}%`, legend, ariaLabel, showValues = false, emptyLabel }: HeatmapProps) {
  const { bi } = useI18n();
  const map = new Map(cells.map((c) => [`${c.row}\u0000${c.col}`, c]));
  const empty = emptyLabel ?? bi(WORDS.empty);
  return (
    <div className="heatmap">
      <div className="heatmap-scroll">
        <table className="heatmap-table" aria-label={ariaLabel} style={{ ['--hm-cols' as string]: cols.length }}>
          <caption className="sr-only">{ariaLabel}</caption>
          <thead>
            <tr>
              <td className="heatmap-corner" aria-hidden />
              {cols.map((c) => <th key={c.key} scope="col" className="heatmap-col">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="heatmap-row">{r.label}</th>
                {cols.map((c) => {
                  const cell = map.get(`${r.key}\u0000${c.key}`);
                  const name = cell ? cell.hint ?? `${r.label} ${c.label}: ${format(cell.value)}` : `${r.label} ${c.label}: ${empty}`;
                  return (
                    <td key={c.key} className="heatmap-cell" data-step={cell ? heatStep(cell.value) : 0} tabIndex={0} title={name} aria-label={name}>
                      {cell && showValues ? <span className="heatmap-value" aria-hidden>{format(cell.value)}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {legend && (
        <div className="heatmap-legend xs muted" aria-hidden>
          <span>{legend.low}</span>
          {[1, 2, 3, 4, 5].map((s) => <span key={s} className="heatmap-swatch" data-step={s} />)}
          <span>{legend.high}</span>
          <span className="heatmap-swatch heatmap-swatch-empty" data-step={0} />
          <span>{empty}</span>
        </div>
      )}
    </div>
  );
}
