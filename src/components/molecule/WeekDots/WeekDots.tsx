import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatDate } from '../../../i18n/format';
import { Icon } from '../../atom/Icon/Icon';
import './WeekDots.css';

export interface WeekDay {
  /** `YYYY-MM-DD` (local date key). */
  date: string;
  attended: boolean;
  booked: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export type WeekDayState = 'attended' | 'booked' | 'none';

export interface WeekDotsProps {
  /** Seven entries, Monday → Sunday. */
  days: WeekDay[];
  /** Weekly goal (classes). 0 = no goal: the row never reads as "met". */
  target: number;
  /** Classes attended this week (the page counts; it may differ from the dots when a day holds two classes). */
  attended: number;
  /** Seven weekday initials, Monday first. Spanish default. */
  labels?: string[];
  /** Per-state words used in each cell's title / accessible name. Defaults are bilingual. */
  stateLabels?: Partial<Record<WeekDayState, string>>;
  size?: 'sm' | 'md';
  /** Name of the whole row; defaults to "Semana: N de M clases". */
  ariaLabel?: string;
  /** Caption under the row (e.g. "2 de 3 esta semana"). */
  children?: ReactNode;
}

const DEFAULT_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const STATE_WORDS: Record<WeekDayState | 'today' | 'row' | 'rowNoGoal', { es: string; en: string }> = {
  attended: { es: 'Asististe', en: 'Attended' },
  booked: { es: 'Reservada', en: 'Booked' },
  none: { es: 'Sin clase', en: 'No class' },
  today: { es: 'hoy', en: 'today' },
  row: { es: 'Semana: {n} de {m} clases', en: 'Week: {n} of {m} classes' },
  rowNoGoal: { es: 'Semana: {n} clases', en: 'Week: {n} classes' },
};

export const weekDayState = (d: WeekDay): WeekDayState => (d.attended ? 'attended' : d.booked && (d.isFuture || d.isToday) ? 'booked' : 'none');

/**
 * The member's current week as seven cells, Monday → Sunday. Display only: attended = filled dot with a check,
 * booked (today or later) = ring, nothing = hollow. Today carries a marker under the dot and a heavier initial;
 * future days without a booking are dimmed. When `attended >= target` (target > 0) the row gets `data-met` and the
 * filled dots take the success tint; `data-over` marks going past the goal.
 */
export function WeekDots({ days, target, attended, labels = DEFAULT_LABELS, stateLabels, size = 'md', ariaLabel, children }: WeekDotsProps) {
  const { lang, bi } = useI18n();
  const met = target > 0 && attended >= target;
  const over = target > 0 && attended > target;
  const word = (s: WeekDayState) => stateLabels?.[s] ?? bi(STATE_WORDS[s]);
  const rowLabel = ariaLabel ?? (target > 0 ? bi(STATE_WORDS.row).replace('{n}', String(attended)).replace('{m}', String(target)) : bi(STATE_WORDS.rowNoGoal).replace('{n}', String(attended)));

  return (
    <div className={`weekdots weekdots-${size}`} data-met={met || undefined} data-over={over || undefined}>
      <ol className="weekdots-row" aria-label={rowLabel}>
        {days.slice(0, 7).map((d, i) => {
          const state = weekDayState(d);
          const when = formatDate(d.date, lang, { weekday: 'long', day: 'numeric', month: 'long' });
          const name = `${when}${d.isToday ? ` (${bi(STATE_WORDS.today)})` : ''}: ${word(state)}`;
          return (
            <li
              key={d.date} className="weekdots-cell" data-state={state} data-today={d.isToday || undefined}
              data-future={(d.isFuture && !d.isToday) || undefined} title={name} aria-label={name}
            >
              <span className="weekdots-initial" aria-hidden>{labels[i] ?? DEFAULT_LABELS[i]}</span>
              <span className="weekdots-dot" aria-hidden>
                {state === 'attended' && <Icon name="check" size={size === 'sm' ? 'xs' : 'sm'} className="is-strong" />}
              </span>
              <span className="weekdots-today" aria-hidden />
            </li>
          );
        })}
      </ol>
      {children != null && <div className="weekdots-caption small muted">{children}</div>}
    </div>
  );
}
