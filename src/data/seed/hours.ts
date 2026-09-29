/**
 * 0041 — M-08g seed: the next three Colombian public holidays after the seed day, closed, plus one
 * "Jornada especial" Saturday with reduced hours about two weeks out. Computed from NOW so the demo
 * always has upcoming exceptions, whatever day it is seeded on. Nothing has been pushed to Google yet.
 */
import type { HoursOverrideRow } from '../schema';
import { upcomingColombianHolidays } from '../../tenant/holidays.co';
import { addDaysToKey, weekdayOf } from '../../tenant/hours';
import { dateKey } from '../../i18n/format';
import { NOW, base } from './catalog';

export function buildHoursOverrides(): HoursOverrideRow[] {
  const today = dateKey(NOW);
  const holidays: HoursOverrideRow[] = upcomingColombianHolidays(today).slice(0, 3).map((h, i) => ({
    ...base(`hov_${h.key}`, 20 - i),
    start_date: h.date, end_date: h.date, closed: true, open: null, close: null,
    label: h.label, kind: 'holiday', source: 'colombia', note: null, google_synced_at: null, created_by: 'usr_super',
  }));
  let saturday = addDaysToKey(today, 14);
  while (weekdayOf(saturday) !== 6) saturday = addDaysToKey(saturday, 1);
  const special: HoursOverrideRow = {
    ...base('hov_jornada', 6),
    start_date: saturday, end_date: saturday, closed: false, open: '08:00', close: '11:00',
    label: { es: 'Jornada especial', en: 'Special day' }, kind: 'special', source: 'manual',
    note: 'Mantenimiento de la sala después de las 11:00 (dato de demo).', google_synced_at: null, created_by: 'usr_admin',
  };
  return [...holidays, special];
}
