import { dateKey, studioDate } from '../../i18n/format';

/**
 * Contract §1: days are `YYYY-MM-DD` (the studio's calendar day, America/Bogota); instants are ISO UTC.
 * An instant given where a day is expected becomes the studio day it falls on, never its UTC date.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function toDay(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && DAY.test(value)) return value;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(d.getTime()) ? dateKey(d) : null;
}

export function toInstant(value: unknown): string | null {
  if (value == null || value === '') return null;
  // A bare day is the start of that studio day, not UTC midnight.
  if (typeof value === 'string' && DAY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return studioDate(y, m - 1, d).toISOString();
  }
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export const today = (): string => dateKey(new Date());
