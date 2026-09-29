/**
 * 0041 — the studio's opening hours as data (D-0016). The weekly hours saved in M-08a
 * (`tenants.settings.openingHours`) are the source of truth; dated exceptions (holidays, special
 * hours, events) live in the `hours_overrides` table and win over the week for the dates they cover.
 * Every surface reads the result through `useOpeningHours()` (src/modules/admin/settings.ts); the
 * Google Business Profile body and the website's JSON-LD are derived here from the same two inputs.
 *
 * Pure functions, no runtime imports (type imports only), so `scripts/test-hours.mjs` can import this
 * file with `node --experimental-strip-types`.
 */
import type { HoursOverrideRow } from '../data/schema';

export type Lang = 'es' | 'en';
export type DayHours = { open: string; close: string } | null;
/** 0 = Sunday … 6 = Saturday; `null` = closed. tenant.ts and M-08a both use this shape. */
export type WeeklyHours = Record<string, DayHours | undefined>;
/** The fields of an override these functions read, so plain objects work in tests. */
export type OverrideLike = Pick<HoursOverrideRow, 'start_date' | 'end_date' | 'closed' | 'open' | 'close' | 'label' | 'kind'>;

const DAY_ABBR = { es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const DAY_NAME = { es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
const GOOGLE_DAY = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
const SCHEMA_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
/** Monday first — how the studio (and Google) reads a week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const KIND_LABEL: Record<HoursOverrideRow['kind'], { es: string; en: string }> = {
  holiday: { es: 'Festivo', en: 'Holiday' },
  special: { es: 'Horario especial', en: 'Special hours' },
  event: { es: 'Evento', en: 'Event' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (hhmm: string) => hhmm.replace(/^0/, '');
const minutesOf = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };

/* ---------------------------------------------------------------------------------------------
 * Date keys (YYYY-MM-DD), computed in UTC so the answer never depends on the machine's zone.
 * ------------------------------------------------------------------------------------------- */
const toUtc = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const fromUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const weekdayOf = (key: string) => toUtc(key).getUTCDay();
export const addDaysToKey = (key: string, n: number) => { const d = toUtc(key); d.setUTCDate(d.getUTCDate() + n); return fromUtc(d); };
/** Inclusive list of date keys from `start` to `end` (at most `cap`, so a typo cannot loop for years). */
export function datesBetween(start: string, end: string, cap = 400): string[] {
  const out: string[] = [];
  for (let k = start; k <= end && out.length < cap; k = addDaysToKey(k, 1)) out.push(k);
  return out;
}
const dateParts = (key: string) => { const [year, month, day] = key.split('-').map(Number); return { year, month, day }; };

/** The weekly hours for one weekday; `undefined` (a key missing from a stored copy) reads as closed. */
const weekdayHours = (weekly: WeeklyHours, wd: number): DayHours => weekly[String(wd)] ?? null;

/* ---------------------------------------------------------------------------------------------
 * Readers
 * ------------------------------------------------------------------------------------------- */

/**
 * The opening hours as one sentence — "Lun–Vie 6:00–20:00 · Sáb 8:00–13:00 · Dom cerrado" — grouping
 * consecutive days with the same hours, Monday first. Footers, W-06, C-25, the manual and M-08a quote it.
 */
export function hoursSentence(weekly: WeeklyHours, lang: Lang): string {
  const runs: { from: number; to: number; v: DayHours }[] = [];
  for (const d of WEEK_ORDER) {
    const v = weekdayHours(weekly, d);
    const last = runs[runs.length - 1];
    if (last && JSON.stringify(last.v) === JSON.stringify(v)) last.to = d; else runs.push({ from: d, to: d, v });
  }
  const closed = lang === 'es' ? 'cerrado' : 'closed';
  return runs.map((r) => {
    const days = r.from === r.to ? DAY_ABBR[lang][r.from] : `${DAY_ABBR[lang][r.from]}–${DAY_ABBR[lang][r.to]}`;
    return `${days} ${r.v ? `${clock(r.v.open)}–${clock(r.v.close)}` : closed}`;
  }).join(' · ');
}

/** The override that governs `date`: the narrowest range that covers it; on a tie, the later one in the list. */
export function overrideFor<O extends OverrideLike>(date: string, overrides: readonly O[]): O | undefined {
  let best: O | undefined;
  let bestLen = Infinity;
  for (const o of overrides) {
    if (o.start_date > date || o.end_date < date) continue;
    const len = datesBetween(o.start_date, o.end_date).length;
    if (len <= bestLen) { best = o; bestLen = len; }
  }
  return best;
}

export interface EffectiveHours<O extends OverrideLike = OverrideLike> {
  /** `null` = closed that day. */
  hours: DayHours;
  /** The override that decided it, when one did. */
  override?: O;
}

/**
 * What the studio is open on `date` (YYYY-MM-DD): an override covering the date wins (ranges are inclusive);
 * otherwise the weekly hours for that weekday. An open override with an empty time falls back to the week's time.
 */
export function effectiveHoursFor<O extends OverrideLike>(date: string, weekly: WeeklyHours, overrides: readonly O[]): EffectiveHours<O> {
  const o = overrideFor(date, overrides);
  const week = weekdayHours(weekly, weekdayOf(date));
  if (!o) return { hours: week };
  if (o.closed) return { hours: null, override: o };
  const open = o.open || week?.open, close = o.close || week?.close;
  return { hours: open && close ? { open, close } : null, override: o };
}

/** Overrides that touch the window [fromDate, fromDate + days − 1], by start date. */
export function upcomingOverrides<O extends OverrideLike>(overrides: readonly O[], fromDate: string, days: number): O[] {
  const to = addDaysToKey(fromDate, Math.max(0, days - 1));
  return overrides.filter((o) => o.end_date >= fromDate && o.start_date <= to).sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));
}

/** Local date key and minutes-past-midnight of `now` in an IANA time zone (the studio's, not the viewer's). */
export function zonedNow(now: Date, tz: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** The next moment the studio opens after `date` + `minutes` (same day included), within `horizon` days. */
export function nextOpening<O extends OverrideLike>(date: string, minutes: number, weekly: WeeklyHours, overrides: readonly O[], horizon = 21): { date: string; open: string; offset: number } | null {
  for (let i = 0; i <= horizon; i++) {
    const key = addDaysToKey(date, i);
    const { hours } = effectiveHoursFor(key, weekly, overrides);
    if (hours && (i > 0 || minutesOf(hours.open) > minutes)) return { date: key, open: hours.open, offset: i };
  }
  return null;
}

const overrideName = (o: OverrideLike, lang: Lang) => {
  const kind = KIND_LABEL[o.kind][lang];
  const label = o.label?.[lang] || o.label?.es;
  return label && label !== kind ? `${kind} (${label})` : kind;
};

function whenLabel(next: { date: string; open: string; offset: number }, lang: Lang): string {
  if (next.offset === 0) return lang === 'es' ? `abre hoy ${next.open}` : `opens today ${next.open}`;
  if (next.offset === 1) return lang === 'es' ? `abre mañana ${next.open}` : `opens tomorrow ${next.open}`;
  const wd = weekdayOf(next.date);
  if (next.offset < 7) return lang === 'es' ? `abre el ${DAY_NAME.es[wd]} ${next.open}` : `opens ${DAY_NAME.en[wd]} ${next.open}`;
  const { month, day } = dateParts(next.date);
  return lang === 'es' ? `abre el ${day}/${month} ${next.open}` : `opens ${month}/${day} ${next.open}`;
}

/**
 * Today's line for customers, in the studio's time zone:
 * "Hoy: 06:00–20:00" · "Hoy: 08:00–11:00 · Horario especial (Jornada especial)" ·
 * "Hoy cerrado · Festivo (Día de la Raza) · abre mañana 06:00" · "Cerrado ahora · abre mañana 06:00".
 */
export function todayStatus<O extends OverrideLike>(now: Date, tz: string, weekly: WeeklyHours, overrides: readonly O[], lang: Lang): string {
  const { date, minutes } = zonedNow(now, tz);
  const { hours, override } = effectiveHoursFor(date, weekly, overrides);
  const next = nextOpening(date, minutes, weekly, overrides);
  const then = next ? ` · ${whenLabel(next, lang)}` : '';
  if (!hours) {
    const why = override ? ` · ${overrideName(override, lang)}` : '';
    return `${lang === 'es' ? 'Hoy cerrado' : 'Closed today'}${why}${then}`;
  }
  if (minutes >= minutesOf(hours.close)) return `${lang === 'es' ? 'Cerrado ahora' : 'Closed now'}${then}`;
  const range = `${lang === 'es' ? 'Hoy' : 'Today'}: ${hours.open}–${hours.close}`;
  return override ? `${range} · ${overrideName(override, lang)}` : range;
}

/** One line per override for people ("12 oct · Festivo (Día de la Raza) · cerrado"). */
export function overrideLine(o: OverrideLike, lang: Lang): string {
  const fmt = (k: string) => { const { month, day } = dateParts(k); return lang === 'es' ? `${day}/${month}` : `${month}/${day}`; };
  const dates = o.start_date === o.end_date ? fmt(o.start_date) : `${fmt(o.start_date)}–${fmt(o.end_date)}`;
  const hours = o.closed ? (lang === 'es' ? 'cerrado' : 'closed') : o.open && o.close ? `${o.open}–${o.close}` : (lang === 'es' ? 'horario habitual' : 'usual hours');
  return `${dates} · ${overrideName(o, lang)} · ${hours}`;
}

/* ---------------------------------------------------------------------------------------------
 * Google Business Profile — the `locations.patch` body (Business Information API v1,
 * updateMask=regularHours,specialHours). HoyOS pushes; nothing is pulled into HoyOS (D-0017).
 * ------------------------------------------------------------------------------------------- */
export interface GoogleTimeOfDay { hours: number; minutes: number }
export interface GoogleDate { year: number; month: number; day: number }
export interface GoogleTimePeriod { openDay: typeof GOOGLE_DAY[number]; openTime: GoogleTimeOfDay; closeDay: typeof GOOGLE_DAY[number]; closeTime: GoogleTimeOfDay }
export type GoogleSpecialHourPeriod =
  | { startDate: GoogleDate; endDate: GoogleDate; closed: true }
  | { startDate: GoogleDate; endDate: GoogleDate; openTime: GoogleTimeOfDay; closeTime: GoogleTimeOfDay };
export interface GoogleBusinessHours {
  regularHours: { periods: GoogleTimePeriod[] };
  specialHours: { specialHourPeriods: GoogleSpecialHourPeriod[] };
}
/** The update mask that goes with the body. */
export const GOOGLE_HOURS_UPDATE_MASK = 'regularHours,specialHours';

const tod = (hhmm: string): GoogleTimeOfDay => { const [hours, minutes] = hhmm.split(':').map(Number); return { hours, minutes: minutes || 0 }; };

/**
 * Weekly hours + overrides → the Business Profile body. Google wants one special-hour period per day
 * (`endDate` may be at most one day after `startDate`), so a multi-day override is expanded per date and
 * each date takes the override that `effectiveHoursFor()` picks. Overrides that ended before `fromDate`
 * are left out (Google keeps its own history). A close time at or before the open time closes the next day.
 */
export function toGoogleBusinessHours(weekly: WeeklyHours, overrides: readonly OverrideLike[], fromDate = '0000-01-01'): GoogleBusinessHours {
  const periods: GoogleTimePeriod[] = [];
  for (const wd of WEEK_ORDER) {
    const h = weekdayHours(weekly, wd);
    if (!h) continue;
    const overnight = minutesOf(h.close) <= minutesOf(h.open);
    periods.push({ openDay: GOOGLE_DAY[wd], openTime: tod(h.open), closeDay: GOOGLE_DAY[overnight ? (wd + 1) % 7 : wd], closeTime: tod(h.close) });
  }
  const dates = [...new Set(overrides.filter((o) => o.end_date >= fromDate).flatMap((o) => datesBetween(o.start_date < fromDate ? fromDate : o.start_date, o.end_date)))].sort();
  const specialHourPeriods: GoogleSpecialHourPeriod[] = dates.map((k) => {
    const { hours } = effectiveHoursFor(k, weekly, overrides);
    const startDate = dateParts(k);
    if (!hours) return { startDate, endDate: startDate, closed: true as const };
    const overnight = minutesOf(hours.close) <= minutesOf(hours.open);
    return { startDate, endDate: overnight ? dateParts(addDaysToKey(k, 1)) : startDate, openTime: tod(hours.open), closeTime: tod(hours.close) };
  });
  return { regularHours: { periods }, specialHours: { specialHourPeriods } };
}

/* ---------------------------------------------------------------------------------------------
 * schema.org — what search engines read from the public website (W-xx shell JSON-LD).
 * ------------------------------------------------------------------------------------------- */
export interface SchemaOrgHours {
  openingHoursSpecification: { '@type': 'OpeningHoursSpecification'; dayOfWeek: string[]; opens: string; closes: string }[];
  specialOpeningHoursSpecification: { '@type': 'OpeningHoursSpecification'; validFrom: string; validThrough: string; opens: string; closes: string; name?: string }[];
}

/** Weekly hours grouped by identical times; overrides as special specs (closed = opens/closes 00:00, the schema.org convention). */
export function toSchemaOrgHours(weekly: WeeklyHours, overrides: readonly OverrideLike[], fromDate = '0000-01-01'): SchemaOrgHours {
  const groups = new Map<string, string[]>();
  for (const wd of WEEK_ORDER) {
    const h = weekdayHours(weekly, wd);
    if (!h) continue;
    const k = `${h.open}|${h.close}`;
    groups.set(k, [...(groups.get(k) ?? []), SCHEMA_DAY[wd]]);
  }
  const openingHoursSpecification = [...groups.entries()].map(([k, days]) => { const [opens, closes] = k.split('|'); return { '@type': 'OpeningHoursSpecification' as const, dayOfWeek: days, opens, closes }; });
  const specialOpeningHoursSpecification = overrides.filter((o) => o.end_date >= fromDate).sort((a, b) => a.start_date.localeCompare(b.start_date)).map((o) => {
    const { hours } = effectiveHoursFor(o.start_date, weekly, [o]);
    return { '@type': 'OpeningHoursSpecification' as const, validFrom: o.start_date, validThrough: o.end_date, opens: hours?.open ?? '00:00', closes: hours?.close ?? '00:00', ...(o.label?.es ? { name: o.label.es } : {}) };
  });
  return { openingHoursSpecification, specialOpeningHoursSpecification };
}

/** Plain text for pasting into Google Business Profile by hand (M-10a fallback). */
export function hoursForGoogleText(weekly: WeeklyHours, overrides: readonly OverrideLike[], fromDate: string, lang: Lang): string {
  const lines = WEEK_ORDER.map((wd) => { const h = weekdayHours(weekly, wd); return `${DAY_NAME[lang][wd].replace(/^./, (c) => c.toUpperCase())}: ${h ? `${h.open}–${h.close}` : (lang === 'es' ? 'Cerrado' : 'Closed')}`; });
  const special = overrides.filter((o) => o.end_date >= fromDate).sort((a, b) => a.start_date.localeCompare(b.start_date)).map((o) => `- ${overrideLine(o, lang)}`);
  const head = lang === 'es' ? ['Horario habitual', ...lines] : ['Regular hours', ...lines];
  return special.length ? [...head, '', lang === 'es' ? 'Horarios especiales' : 'Special hours', ...special].join('\n') : head.join('\n');
}
