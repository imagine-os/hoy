import { RatingScale } from '../RatingScale/RatingScale';
import './RatingSummary.css';

export interface RatingSummaryProps {
  /** Average rating, or null when nothing has been rated yet. */
  average: number | null;
  /** How many ratings the average is made of. */
  count: number;
  /** Most-used tags, already sorted. */
  tags?: { tag: string; n: number }[];
  /** Maps a tag key to its label (i18n stays outside the component). */
  tagLabel?: (tag: string) => string;
  /** Line under the average, e.g. "3 ratings". */
  caption?: string;
  /** Shown instead of the average when count is 0. */
  emptyText?: string;
  size?: 'sm' | 'md';
}

/**
 * Read-only rating roll-up: average as stars, the count, and the tags people picked.
 * Used by the teacher app (class reviews) and teacher profiles; never writes.
 */
export function RatingSummary({ average, count, tags = [], tagLabel, caption, emptyText, size = 'md' }: RatingSummaryProps) {
  if (!count || average == null) return <p className={`ratingsum-empty ${size === 'sm' ? 'xs' : 'small'} muted`}>{emptyText}</p>;
  return (
    <div className={`ratingsum ratingsum-${size}`}>
      <div className="ratingsum-head">
        <strong className="ratingsum-value">{average.toFixed(1)}</strong>
        <RatingScale value={Math.round(average)} size="md" readOnly label={caption ?? String(average)} />
      </div>
      {caption && <span className="xs muted">{caption}</span>}
      {tags.length > 0 && (
        <ul className="ratingsum-tags">
          {tags.map(({ tag, n }) => <li key={tag} className="ratingsum-tag xs">{tagLabel ? tagLabel(tag) : tag}<span className="ratingsum-tag-n mono">{n}</span></li>)}
        </ul>
      )}
    </div>
  );
}
