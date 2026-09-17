import type { Lang } from './types';

/** BCP-47 locale for a UI language: Spanish is Colombian Spanish, English is en-US. */
export const localeOf = (lang: Lang) => (lang === 'es' ? 'es-CO' : 'en-US');

/** Milliseconds in a minute, an hour and a day — the only place these literals are written. */
export const MS = { min: 60e3, hour: 3600e3, day: 86400e3 } as const;

const pad = (n: number) => String(n).padStart(2, '0');
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `YYYY-MM-DD` of a Date in the browser's local time — which for the studio is America/Bogota.
 * Never `toISOString().slice(0, 10)`: that is UTC, and after 19:00 in Bogotá it names tomorrow.
 */
export const dateKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A date key back to a Date at local noon, so no offset can shift it onto the previous day. */
export const fromDateKey = (key: string) => new Date(`${key}T12:00:00`);

export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
/** `key` shifted by `n` days, as a key. */
export const addDaysKey = (key: string, n: number) => dateKey(addDays(fromDateKey(key), n));

/** ISO timestamp, date key or Date → Date; a bare date key is read as local noon (see `fromDateKey`). */
const toDate = (v: string | Date): Date => (typeof v === 'string' ? (DATE_KEY.test(v) ? fromDateKey(v) : new Date(v)) : v);

/** COP with the `$` symbol in both languages (`$ 15.326.000` · `$15,326,000`), no decimals. */
export function formatCOP(amount: number, lang: Lang = 'es'): string {
  return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency: 'COP', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(amount);
}
export function formatDate(iso: string | Date, lang: Lang = 'es', opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat(localeOf(lang), opts).format(toDate(iso));
}
export function formatTime(iso: string | Date, lang: Lang = 'es'): string {
  return new Intl.DateTimeFormat(localeOf(lang), { hour: 'numeric', minute: '2-digit' }).format(toDate(iso));
}
export function formatDateTime(iso: string | Date, lang: Lang = 'es'): string {
  return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(toDate(iso));
}
export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = toDate(a), db = toDate(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** Only the digits of a typed value ('+57 300 123 4567' → '573001234567'). */
export const digitsOf = (raw: string) => raw.replace(/\D/g, '');
/** A typed amount as a whole number of pesos ('1.200.000' → 1200000; nonsense → 0). */
export const parseDigits = (raw: string) => Math.max(0, Math.round(Number(digitsOf(raw)) || 0));
/** True when the value carries at least `min` digits — the whole check a phone field does. */
export const isPhone = (raw: string, min = 10) => digitsOf(raw).length >= min;

/** wa.me deep link: to a number when there is one, otherwise the share sheet with the text prefilled. */
export const waLink = (phone: string | null | undefined, text?: string) =>
  `https://wa.me/${phone ? digitsOf(phone) : ''}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
