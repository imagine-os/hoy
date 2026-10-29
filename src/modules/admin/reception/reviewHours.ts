/**
 * AD-05 · reception hours (J1b) as the bookings module stores them (bookings 1.4.0):
 * - `review_hours`: `<day>[-<day>] HH:MM-HH:MM` entries separated by commas, days `mon`…`sun`, one window per weekday,
 *   a weekday with no entry is closed; empty text = every day, all day.
 * - `review_closed_dates`: `YYYY-MM-DD` dates separated by commas.
 * The server validates both (`invalid_settings`); this module only converts the weekly form to and from that text.
 */
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
/** Monday first, the way the studio reads its week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export type Window = { open: string; close: string } | null;
/** Index = weekday (0 = Sunday). */
export type WeekWindows = Window[];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseWeek(text: string): WeekWindows {
  const out: WeekWindows = Array(7).fill(null);
  if (!text.trim()) return Array(7).fill({ open: '00:00', close: '24:00' });
  for (const part of text.toLowerCase().split(/[,;]/).map(p => p.trim()).filter(Boolean)) {
    const m = /^([a-z]{3})(?:-([a-z]{3}))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(part.replace(/\s+/g, ' '));
    if (!m) continue;
    const first = DAY_KEYS.indexOf(m[1] as never), last = m[2] ? DAY_KEYS.indexOf(m[2] as never) : first;
    if (first < 0 || last < 0) continue;
    for (let d = first, n = 0; n < 7; d = (d + 1) % 7, n++) { out[d] = { open: m[3], close: m[4] }; if (d === last) break; }
  }
  return out;
}

/** One entry per open weekday, Monday first (no ranges, so a single day's change is a single entry's change). */
export function formatWeek(week: WeekWindows): string {
  return WEEK_ORDER.filter(d => week[d]).map(d => `${DAY_KEYS[d]} ${week[d]!.open}-${week[d]!.close}`).join(', ');
}

export type WeekProblem = { day: number; problem: 'time' | 'order' };
export function weekProblems(week: WeekWindows): WeekProblem[] {
  const out: WeekProblem[] = [];
  week.forEach((w, day) => {
    if (!w) return;
    if (!HHMM.test(w.open) || !(HHMM.test(w.close) || w.close === '24:00')) out.push({ day, problem: 'time' });
    else if (w.close <= w.open) out.push({ day, problem: 'order' });
  });
  return out;
}

export const parseDates = (text: string) => [...new Set(text.split(/[\s,]+/).filter(d => DATE.test(d)))].sort();
export const formatDates = (dates: string[]) => [...new Set(dates.filter(d => DATE.test(d)))].sort().join(', ');

/**
 * Q-15 · the Sunday rule. With reception closed on Sunday, a transfer made on Sunday waits for Monday's opening to be
 * reviewed; a receipt uploaded before the class keeps the spot (J1c) and no receipt releases it at the class start.
 * The screen says so whenever Sunday has classes but no reception window.
 */
export const sundayNeedsNotice = (week: WeekWindows, sundayClasses: number) => !week[0] && sundayClasses > 0;
