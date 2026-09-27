import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { BookingRow } from '../../../data/schema';
import { occupiesMat } from '../../../data/mats';
import { tenant } from '../../../tenant/tenant';
import './MatPicker.css';
export interface MatPickerProps { sessionId: string; capacity: number; value: number | null; onChange: (n: number) => void }
export function MatPicker({ sessionId, capacity, value, onChange }: MatPickerProps) {
  const { t } = useI18n();
  const { rows } = useTable<BookingRow>('bookings', { where: { session_id: sessionId } });
  const taken = new Set(rows.filter(occupiesMat).map(b => b.mat_number));
  const valid = value != null && !taken.has(value) && value <= capacity;
  return <section className="mat-picker" data-movement="enraiza">
    <div className="row-between wrap"><div><p className="eyebrow">{t('site.mat.eyebrow')}</p><h3>{t('site.mat.title')}</h3></div><span className="small muted">{t('site.mat.layout', { n: tenant.studio.mats, rows: tenant.studio.matRows })}</span></div>
    <div className="mat-room"><div className="mat-teacher">{t('site.mat.front')}</div><div className="mat-grid" style={{ gridTemplateColumns: `repeat(${tenant.studio.mats / tenant.studio.matRows}, minmax(0, 1fr))` }}>
      {Array.from({ length: tenant.studio.mats }, (_, i) => i + 1).map(n => { const occupied = taken.has(n) || n > capacity; return <button key={n} type="button" className={`mat-place ${valid && n === value ? 'is-selected' : ''}`} disabled={occupied} aria-pressed={valid && n === value} aria-label={t(occupied ? 'site.mat.occupiedLabel' : 'site.mat.number', { n })} onClick={() => onChange(n)}><span>{String(n).padStart(2, '0')}</span>{occupied && <small aria-hidden>×</small>}</button>; })}
    </div><div className="mat-entry">{t('site.mat.entry')}</div></div>
    <div className="mat-legend small"><span><i />{t('site.mat.available')}</span><span><i className="selected" />{t('site.mat.selected')}</span><span><i className="occupied" />{t('site.mat.occupied')}</span></div>
    <p className="small" aria-live="polite">{valid ? t('site.mat.chosen', { n: value }) : t('site.mat.hint')}</p>
  </section>;
}
