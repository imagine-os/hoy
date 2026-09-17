import { useT } from '../../../i18n/I18nProvider';
import './CapacityMeter.css';

export function CapacityMeter({ booked, capacity, compact = false }: { booked: number; capacity: number; compact?: boolean }) {
  const t = useT();
  const left = Math.max(0, capacity - booked);
  const pct = Math.min(100, Math.round((booked / Math.max(1, capacity)) * 100));
  const state = left === 0 ? 'full' : left <= 3 ? 'low' : 'ok';
  const label = left === 0 ? t('core.common.full') : t('core.common.spots', { n: left });
  return (
    <div className={`capmeter capmeter-${state} ${compact ? 'is-compact' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={booked} aria-label={label}>
      <div className="capmeter-bar"><span style={{ width: `${pct}%` }} /></div>
      <span className="capmeter-label">{label}</span>
    </div>
  );
}
