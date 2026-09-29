import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { BookingRow } from '../../../data/schema';
import { occupiesMat } from '../../../data/mats';
import { tenant } from '../../../tenant/tenant';
import './MatPicker.css';
export interface MatPickerProps { sessionId: string; capacity: number; value: number | null; onChange: (n: number) => void }
/** Minimum mat width and the grid gap, in rem (they follow the --ui band); `MAT_MIN_REM` matches `--mat-size` in MatPicker.css. */
export const MAT_MIN_REM = 3.5, MAT_GAP_REM = 0.5;
/**
 * How many mats of a physical room row fit side by side in `width` px: the largest divisor of `perRow` whose mats stay at
 * least `matMin` wide with `gap` between them, so a row of 8 becomes 8, 4, 2 or 1 per line and every line still maps to a
 * whole part of the real row (the row label says which).
 */
export function matColumns(width: number, perRow: number, matMin: number, gap: number): number {
  for (let d = perRow; d > 1; d--) if (perRow % d === 0 && d * matMin + (d - 1) * gap <= width) return d;
  return 1;
}
/** Measures the room's inline size (ResizeObserver) and derives the columns from the room's row length, not a breakpoint. */
function useMatColumns(ref: React.RefObject<HTMLElement>, perRow: number) {
  const [cols, setCols] = useState(perRow);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; const cs = getComputedStyle(el); const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); setCols(matColumns(w, perRow, MAT_MIN_REM * rem, MAT_GAP_REM * rem)); };
    measure();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }
    const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, [ref, perRow]);
  return cols;
}
/**
 * The room map: `tenant.studio.mats` mats in `tenant.studio.matRows` physical rows, front (teacher) at the top, entrance at the
 * bottom. Each physical row is its own grid whose column count comes from the available width (0026), so a row of 8 shows as
 * 8, 4 or 2 per line; when it wraps, a row label ("Fila 1 · mats 01–08") keeps the row readable.
 */
export function MatPicker({ sessionId, capacity, value, onChange }: MatPickerProps) {
  const { t } = useI18n();
  const { rows } = useTable<BookingRow>('bookings', { where: { session_id: sessionId } });
  const taken = new Set(rows.filter(occupiesMat).map(b => b.mat_number));
  const valid = value != null && !taken.has(value) && value <= capacity;
  const { mats, matRows } = tenant.studio;
  const perRow = Math.ceil(mats / matRows);
  const roomRef = useRef<HTMLDivElement>(null);
  const cols = useMatColumns(roomRef, perRow);
  const pad = (n: number) => String(n).padStart(2, '0');
  const physicalRows = Array.from({ length: matRows }, (_, r) => Array.from({ length: perRow }, (_, i) => r * perRow + i + 1).filter(n => n <= mats));
  return <section className="mat-picker" data-tone="moss">
    <div className="row-between wrap"><div><p className="eyebrow">{t('site.mat.eyebrow')}</p><h3>{t('site.mat.title')}</h3></div><span className="small muted">{t('site.mat.layout', { n: mats, rows: matRows })}</span></div>
    <div className="mat-room" ref={roomRef} data-cols={cols}><div className="mat-teacher">{t('site.mat.front')}</div>
      <div className="mat-rows">{physicalRows.map((list, r) => <div key={r} className="mat-row">
        {cols < perRow && <div className="mat-row-label"><span>{t('site.mat.row', { n: r + 1 })}</span><span>{t('site.mat.rowRange', { from: pad(list[0]), to: pad(list[list.length - 1]) })}</span></div>}
        <div className="mat-grid" role="group" aria-label={t('site.mat.row', { n: r + 1 })} style={{ '--mat-cols': cols } as CSSProperties}>
          {list.map(n => { const occupied = taken.has(n) || n > capacity; return <button key={n} type="button" className={`mat-place ${valid && n === value ? 'is-selected' : ''}`} disabled={occupied} aria-pressed={valid && n === value} aria-label={t(occupied ? 'site.mat.occupiedLabel' : 'site.mat.number', { n })} onClick={() => onChange(n)}><span>{pad(n)}</span>{occupied && <small aria-hidden>×</small>}</button>; })}
        </div>
      </div>)}</div>
      <div className="mat-entry">{t('site.mat.entry')}</div></div>
    <div className="mat-legend small"><span><i />{t('site.mat.available')}</span><span><i className="selected" />{t('site.mat.selected')}</span><span><i className="occupied" />{t('site.mat.occupied')}</span></div>
    <p className="small" aria-live="polite">{valid ? t('site.mat.chosen', { n: value }) : t('site.mat.hint')}</p>
  </section>;
}
