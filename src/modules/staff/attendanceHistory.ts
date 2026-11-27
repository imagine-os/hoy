import type { BookingRow, ClassSessionRow } from '../../data/schema';
import { addDaysKey, dateKey, formatTime, fromDateKey } from '../../i18n/format';
import type { Lang } from '../../i18n/types';

export type AttendanceRange = { from: string; to: string };
type Session = Pick<ClassSessionRow, 'id' | 'starts_at' | 'ends_at' | 'status' | 'title'>;
type AttendanceBooking = Pick<BookingRow, 'session_id' | 'user_id' | 'status'>;

export function attendanceRange(from: string, to: string, today: string): AttendanceRange | null {
  const valid = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(fromDateKey(key)) === key;
  if (!valid(from) || !valid(to) || from > to || to >= today || to > addDaysKey(from, 30)) return null;
  return { from, to };
}

export function attendanceSessions<T extends Session>(sessions: readonly T[], range: AttendanceRange, now: number): T[] {
  return sessions.filter(s => {
    if (s.status === 'cancelled' || !(Date.parse(s.ends_at) <= now)) return false;
    const day = dateKey(new Date(s.starts_at));
    return day >= range.from && day <= range.to;
  }).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
}

export function attendanceReport(sessions: readonly Session[], bookings: readonly AttendanceBooking[]) {
  const peopleBySession = new Map(sessions.map(s => [s.id, new Set<string>()]));
  for (const b of bookings) {
    // One checked-in person = one attendee, including each named group member. Unused group capacity is not attendance.
    if (b.status === 'checked_in' && b.user_id) peopleBySession.get(b.session_id)?.add(b.user_id);
  }
  return sessions.map(session => ({ session, checkedIn: peopleBySession.get(session.id)?.size ?? 0 }));
}

function csvCell(value: string) {
  const safe = /^(?:\s*[=+\-@]|[\t\r\n])/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function attendanceCsv(report: ReturnType<typeof attendanceReport>, headers: string[], lang: Lang) {
  return [headers.map(csvCell).join(','), ...report.map(({ session, checkedIn }) => [
    dateKey(new Date(session.starts_at)), formatTime(session.starts_at, lang), session.title,
  ].map(csvCell).join(',') + ',' + checkedIn)].join('\r\n');
}
