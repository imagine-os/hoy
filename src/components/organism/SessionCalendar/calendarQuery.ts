import type { CalendarView } from './SessionCalendar';

/**
 * RES-01 (Jas 1 Nov): the calendar keeps its day and view in the URL query (`day=YYYY-MM-DD`, `cv=day|week|month`), so
 * Back from a class returns to the same day. Not `view`: the schedule sends `?view=week` to the week route. Anything
 * malformed is ignored.
 */
const VIEWS: readonly CalendarView[] = ['day', 'week', 'month'];
const validDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v;

export function readCalendarQuery(params: URLSearchParams): { day: string | null; view: CalendarView | null } {
  const day = params.get('day'), view = params.get('cv');
  return { day: validDay(day) ? day : null, view: (VIEWS as readonly string[]).includes(view ?? '') ? view as CalendarView : null };
}

/** The query with the calendar's day and view set, every other parameter kept. */
export function writeCalendarQuery(params: URLSearchParams, day: string, view: CalendarView): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('day', day);
  next.set('cv', view);
  return next;
}
