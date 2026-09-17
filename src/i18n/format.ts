import type { Lang } from './types';

const locale = (lang: Lang) => (lang === 'es' ? 'es-CO' : 'en-US');

export function formatCOP(amount: number, lang: Lang = 'es'): string {
  return new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}
export function formatDate(iso: string, lang: Lang = 'es', opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat(locale(lang), opts).format(new Date(iso));
}
export function formatTime(iso: string, lang: Lang = 'es'): string {
  return new Intl.DateTimeFormat(locale(lang), { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
export function formatDateTime(iso: string, lang: Lang = 'es'): string {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
