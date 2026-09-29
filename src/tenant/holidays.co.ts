/**
 * 0041 — Colombian public holidays ("festivos") for a year, computed, not typed in: Ley 51 de 1983
 * ("Ley Emiliani") moves most holidays to the following Monday. M-08g imports them as closed
 * `hours_overrides` rows (source `colombia`), and the seed uses the next few.
 *
 * - Fixed, never moved: 1 Jan, 1 May, 20 Jul, 7 Aug, 8 Dec, 25 Dec.
 * - Easter-relative, never moved: Holy Thursday (Easter − 3), Good Friday (Easter − 2).
 * - Fixed date moved to the next Monday: 6 Jan, 19 Mar, 29 Jun, 15 Aug, 12 Oct, 1 Nov, 11 Nov.
 * - Easter-relative moved to the next Monday: Ascension (+39), Corpus Christi (+60), Sacred Heart (+68).
 *
 * Easter is the anonymous Gregorian (Meeus / Jones / Butcher) algorithm. Pure, no runtime imports, so
 * `scripts/test-holidays.mjs` imports this file with `node --experimental-strip-types`.
 */

export interface ColombianHoliday {
  /** YYYY-MM-DD, the day the holiday is observed. */
  date: string;
  /** Stable id of the holiday (same every year), e.g. `raza`. */
  key: string;
  label: { es: string; en: string };
  /** True for the six calendar dates that never move; false for the Easter-relative and the Monday-moved ones. */
  fixed: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const plus = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
/** The same day when it is a Monday, else the next Monday. */
const nextMonday = (d: Date) => plus(d, (8 - d.getUTCDay()) % 7);

/** Easter Sunday for a Gregorian year (Meeus). */
export function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

type Rule = { key: string; label: { es: string; en: string } } & ({ fixed: [number, number] } | { moved: [number, number] } | { easter: number; move: boolean });

const RULES: Rule[] = [
  { key: 'ano-nuevo', label: { es: 'Año Nuevo', en: 'New Year’s Day' }, fixed: [1, 1] },
  { key: 'reyes', label: { es: 'Día de los Reyes Magos', en: 'Epiphany' }, moved: [1, 6] },
  { key: 'san-jose', label: { es: 'Día de San José', en: 'Saint Joseph’s Day' }, moved: [3, 19] },
  { key: 'jueves-santo', label: { es: 'Jueves Santo', en: 'Maundy Thursday' }, easter: -3, move: false },
  { key: 'viernes-santo', label: { es: 'Viernes Santo', en: 'Good Friday' }, easter: -2, move: false },
  { key: 'trabajo', label: { es: 'Día del Trabajo', en: 'Labour Day' }, fixed: [5, 1] },
  { key: 'ascension', label: { es: 'Ascensión del Señor', en: 'Ascension Day' }, easter: 39, move: true },
  { key: 'corpus', label: { es: 'Corpus Christi', en: 'Corpus Christi' }, easter: 60, move: true },
  { key: 'sagrado-corazon', label: { es: 'Sagrado Corazón', en: 'Sacred Heart' }, easter: 68, move: true },
  { key: 'san-pedro', label: { es: 'San Pedro y San Pablo', en: 'Saint Peter and Saint Paul' }, moved: [6, 29] },
  { key: 'independencia', label: { es: 'Día de la Independencia', en: 'Independence Day' }, fixed: [7, 20] },
  { key: 'boyaca', label: { es: 'Batalla de Boyacá', en: 'Battle of Boyacá' }, fixed: [8, 7] },
  { key: 'asuncion', label: { es: 'La Asunción de la Virgen', en: 'Assumption Day' }, moved: [8, 15] },
  { key: 'raza', label: { es: 'Día de la Raza', en: 'Columbus Day' }, moved: [10, 12] },
  { key: 'todos-santos', label: { es: 'Todos los Santos', en: 'All Saints’ Day' }, moved: [11, 1] },
  { key: 'cartagena', label: { es: 'Independencia de Cartagena', en: 'Independence of Cartagena' }, moved: [11, 11] },
  { key: 'inmaculada', label: { es: 'Inmaculada Concepción', en: 'Immaculate Conception' }, fixed: [12, 8] },
  { key: 'navidad', label: { es: 'Navidad', en: 'Christmas Day' }, fixed: [12, 25] },
];

/** The 18 public holidays of `year`, sorted by date. */
export function colombianHolidays(year: number): ColombianHoliday[] {
  const easter = easterSunday(year);
  return RULES.map((r) => {
    let d: Date;
    if ('fixed' in r) d = utc(year, r.fixed[0], r.fixed[1]);
    else if ('moved' in r) d = nextMonday(utc(year, r.moved[0], r.moved[1]));
    else d = r.move ? nextMonday(plus(easter, r.easter)) : plus(easter, r.easter);
    return { date: keyOf(d), key: r.key, label: r.label, fixed: 'fixed' in r };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** Holidays on or after `fromDate` (YYYY-MM-DD) in that year and the next — what M-08g imports. */
export function upcomingColombianHolidays(fromDate: string, years = 2): ColombianHoliday[] {
  const y = Number(fromDate.slice(0, 4));
  return Array.from({ length: years }, (_, i) => colombianHolidays(y + i)).flat().filter((h) => h.date >= fromDate);
}
