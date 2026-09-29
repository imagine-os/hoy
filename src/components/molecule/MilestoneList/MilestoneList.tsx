import { Icon } from '../../atom/Icon/Icon';
import '../../atom/Chip/Chip.css';
import './MilestoneList.css';

export interface MilestoneListLabels {
  /** Eyebrow over the reached medallions, e.g. "Logros". */
  reached: string;
  /** Eyebrow over the next one, e.g. "Próximo". */
  next: string;
  /** "Faltan 3" */
  remaining: (n: number) => string;
  /** "25 clases" */
  classes: (n: number) => string;
}

export interface MilestoneListProps {
  /** Milestones reached (class counts), any order; shown ascending. */
  reached: number[];
  /** The next milestone and how many classes are left; null when none is left. */
  next: { at: number; remaining: number } | null;
  labels: MilestoneListLabels;
}

/**
 * Reached and next milestones as a compact row of Chip-like medallions: reached ones filled with a star, the next one
 * outlined with a flag and a thin progress bar (done = at − remaining of at). Renders nothing when there is neither.
 * The bar is its own element and not CapacityMeter: that one prints "N spots left" and turns red when full.
 */
export function MilestoneList({ reached, next, labels }: MilestoneListProps) {
  const list = [...reached].sort((a, b) => a - b);
  if (list.length === 0 && !next) return null;
  const done = next ? Math.max(0, next.at - next.remaining) : 0;
  const pct = next ? Math.min(100, Math.round((done / Math.max(1, next.at)) * 100)) : 0;
  return (
    <div className="milestones">
      {list.length > 0 && (
        <section className="milestones-group" aria-label={labels.reached}>
          <div className="eyebrow" aria-hidden>{labels.reached}</div>
          <ul className="milestones-row">
            {list.map((n) => (
              <li key={n} className="chip milestone is-reached"><Icon name="star" size="sm" className="milestone-icon" />{labels.classes(n)}</li>
            ))}
          </ul>
        </section>
      )}
      {next && (
        <section className="milestones-group milestones-next" aria-label={labels.next}>
          <div className="eyebrow" aria-hidden>{labels.next}</div>
          <div className="milestone-next-body">
            <span className="chip milestone is-next"><Icon name="flag" size="sm" className="milestone-icon" />{labels.classes(next.at)}</span>
            <div className="milestone-progress">
              <div className="milestone-bar" role="progressbar" aria-valuemin={0} aria-valuemax={next.at} aria-valuenow={done} aria-valuetext={`${labels.classes(done)} / ${next.at} · ${labels.remaining(next.remaining)}`} aria-label={labels.classes(next.at)}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="milestone-remaining xs muted">{labels.remaining(next.remaining)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
