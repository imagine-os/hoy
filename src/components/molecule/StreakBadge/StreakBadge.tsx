import { useI18n } from '../../../i18n/I18nProvider';
import { Icon } from '../../atom/Icon/Icon';
import './StreakBadge.css';

export type StreakState = 'none' | 'building' | 'alive' | 'at_risk' | 'broken';

export interface StreakBadgeProps {
  count: number;
  /** Already translated, e.g. "semanas". */
  unit: string;
  state: StreakState;
  best?: number;
  /** Already translated, e.g. "Mejor". Shown as "Mejor: 9 semanas". */
  bestLabel?: string;
  /** One line under the stamp (the page says what the state means: "Ve esta semana para no perderla"). */
  hint?: string;
  /** Screen-reader word for the state; bilingual defaults. */
  stateLabel?: string;
}

const STATE_WORDS: Record<StreakState, { es: string; en: string }> = {
  none: { es: 'Sin racha', en: 'No streak' },
  building: { es: 'Racha en construcción', en: 'Streak building' },
  alive: { es: 'Racha activa', en: 'Streak alive' },
  at_risk: { es: 'Racha en riesgo', en: 'Streak at risk' },
  broken: { es: 'Racha interrumpida', en: 'Streak broken' },
};

/**
 * The streak as a small stamp: flame medallion + big count + unit, the best run on a second line. Tone by state
 * (alive warm, at_risk warn with a dashed ring, building neutral, none/broken muted and hollow) — the shape changes
 * with the tone, and the state is also written for screen readers, so it never relies on colour.
 */
export function StreakBadge({ count, unit, state, best, bestLabel, hint, stateLabel }: StreakBadgeProps) {
  const { bi } = useI18n();
  return (
    <div className="streak" data-state={state}>
      <span className="streak-medal" aria-hidden><Icon name="flame" size="md" className={state === 'alive' ? 'is-strong' : ''} /></span>
      <div className="streak-body">
        <span className="sr-only">{stateLabel ?? bi(STATE_WORDS[state])}: </span>
        <div className="streak-main">
          <span className="streak-count">{count}</span>
          <span className="streak-unit">{unit}</span>
        </div>
        {best != null && <div className="streak-best xs muted">{bestLabel ? `${bestLabel}: ` : ''}{best} {unit}</div>}
      </div>
      {hint && <div className="streak-hint xs muted">{hint}</div>}
    </div>
  );
}
