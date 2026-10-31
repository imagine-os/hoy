/**
 * Holiday hours → bookings `review_closed_dates` (lane H2). Reception is closed on every day a `closed` hours override
 * covers, so a transfer hold's clock (bookings, J1) must not run then. The app keeps the bookings setting equal to
 * those dates, from today on, whenever an override is written (CompanyOSProvider). Pure functions.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A single override never spans more than this many days (a typo must not write a year of dates). */
const MAX_SPAN_DAYS = 366;

const addDay = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
};

export interface ClosedLike { start_date: string | null; end_date: string | null; closed: boolean }

/** Every date (YYYY-MM-DD) from `today` on that a closed override covers, sorted and unique. */
export function closedDatesOf(rows: readonly ClosedLike[], today: string): string[] {
  const out = new Set<string>();
  for (const r of rows) {
    if (!r.closed || !r.start_date || !DAY.test(r.start_date)) continue;
    const end = r.end_date && DAY.test(r.end_date) && r.end_date >= r.start_date ? r.end_date : r.start_date;
    let d = r.start_date;
    for (let i = 0; i < MAX_SPAN_DAYS && d <= end; i++, d = addDay(d)) if (d >= today) out.add(d);
  }
  return [...out].sort();
}

/** The setting's text (`"2026-12-25, 2027-01-01"`) → its dates. */
export const parseClosedDates = (value: unknown): string[] => (typeof value === 'string' ? value.split(/[\s,]+/).filter((d) => DAY.test(d)).sort() : []);
export const formatClosedDates = (dates: readonly string[]): string => dates.join(', ');
