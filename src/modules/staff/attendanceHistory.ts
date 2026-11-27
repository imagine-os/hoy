import type { BookingRow, ClassSessionRow } from '../../data/schema';
import { addDaysKey, dateKey, formatTime, fromDateKey, startOfDay } from '../../i18n/format';
import type { Lang } from '../../i18n/types';
import type { CosPort, CosRecord, QuerySpec } from '../transfers/launch/cos';

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

/** Production reads stay on the existing authenticated Company OS transport, with no widened role or write. */
export async function loadAttendance(cos: CosPort, range: AttendanceRange, now: number, active: () => boolean = () => true) {
  const start = startOfDay(fromDateKey(range.from)).toISOString();
  const end = startOfDay(fromDateKey(addDaysKey(range.to, 1))).toISOString();
  const timeSort = { field: 'starts_at', dir: 'asc' as const };
  const idSort = { field: 'id', dir: 'asc' as const };
  const data = await completeQuery(cos, {
    entity: 'occurrence',
    filter: { and: [{ field: 'starts_at', op: 'gte', value: start }, { field: 'starts_at', op: 'lt', value: end }] },
    sort: [timeSort, idSort],
  }, active);
  const parsed = data.map(({ id, data: d }) => {
    const { starts_at, ends_at, status, title } = d;
    if (typeof starts_at !== 'string' || !Number.isFinite(Date.parse(starts_at)) || typeof ends_at !== 'string' || !Number.isFinite(Date.parse(ends_at)) || typeof title !== 'string' || typeof status !== 'string') throw new Error('attendance_incomplete');
    return { id, starts_at, ends_at, status: status as Session['status'], title };
  });
  const sessions = attendanceSessions(parsed, range, now);
  const bookings: AttendanceBooking[] = [];
  for (let i = 0; i < sessions.length; i += 50) {
    const ids = sessions.slice(i, i + 50).map(s => s.id);
    const rows = await completeQuery(cos, {
      entity: 'booking',
      filter: { and: [{ field: 'occurrence', op: 'in', value: ids }, { field: 'status', op: 'eq', value: 'checked_in' }] },
      sort: [idSort],
    }, active);
    for (const { data: d } of rows) {
      const session_id = idOf(d.occurrence);
      const user_id = idOf(d.person);
      if (!ids.includes(session_id) || !user_id || d.status !== 'checked_in') throw new Error('attendance_incomplete');
      bookings.push({ session_id, user_id, status: 'checked_in' });
    }
  }
  return attendanceReport(sessions, bookings);
}

const idOf = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'id' in v && typeof v.id === 'string') return v.id;
  return '';
};

async function completeQuery(
  cos: CosPort,
  spec: QuerySpec,
  active: () => boolean,
) {
  type Row = CosRecord<Record<string, unknown>>;
  const out: Row[] = [];
  const seen = new Set<string>();
  const limit = 500;
  for (let offset = 0; offset < 5000; offset += limit) {
    if (!active()) throw new Error('attendance_context_changed');
    const { data } = await cos.request<{ data: Row[] }>('POST', '/query', { ...spec, offset, limit });
    if (!active()) throw new Error('attendance_context_changed');
    if (!Array.isArray(data) || data.length > limit) throw new Error('attendance_incomplete');
    for (const row of data) {
      if (!row || !row.data || typeof row.id !== 'string' || !row.id || seen.has(row.id)) throw new Error('attendance_incomplete');
      seen.add(row.id);
      out.push(row);
    }
    if (data.length < limit) return out;
  }
  // A full final page does not prove we reached the end. Never publish partial totals.
  throw new Error('attendance_incomplete');
}
