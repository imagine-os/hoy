import { Badge } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import { Icon } from '../../atom/Icon/Icon';
import './ReadToggle.css';

export type ReadState = 'unread' | 'read' | 'outdated';

export interface ReadToggleLabels {
  /** "Marcar como leído" */
  mark: string;
  /** "Marcar como no leído" */
  unmark: string;
  /** "Hay una versión nueva" */
  newVersion: string;
}

export interface ReadToggleProps {
  /** unread → the primary "mark as read"; read → the read state + an outline "mark as unread"; outdated → both. */
  state: ReadState;
  /** The read line, already formatted ("Leído el 30 sep"); shown when read or outdated. */
  readLabel?: string;
  labels: ReadToggleLabels;
  onMark: () => void;
  onUnmark: () => void;
  /** Which of the two writes is running (spinner on that button, the other disabled). */
  busy?: 'mark' | 'unmark';
}

/**
 * A chapter's read state as a toggle (0050): one primary button while unread; once read, the read date with a check
 * and a quieter outline button to go back to unread. Both 44 px, one height, so the pair reads as one control group.
 */
export function ReadToggle({ state, readLabel, labels, onMark, onUnmark, busy }: ReadToggleProps) {
  const read = state !== 'unread';
  return (
    <span className={`read-toggle is-${state}`}>
      {state === 'outdated' && <Badge tone="warn">{labels.newVersion}</Badge>}
      {read && readLabel && <span className="read-toggle-done" role="status"><Icon name="check" size={16} />{readLabel}</span>}
      {state !== 'read' && <Button variant="primary" icon="check" loading={busy === 'mark'} disabled={busy === 'unmark'} onClick={onMark}>{labels.mark}</Button>}
      {read && <Button variant="outline" loading={busy === 'unmark'} disabled={busy === 'mark'} onClick={onUnmark}>{labels.unmark}</Button>}
    </span>
  );
}
