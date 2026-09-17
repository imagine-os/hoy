/**
 * Teacher payroll arithmetic, with no React and no provider — so the seed (historical runs), the
 * admin payouts page (M-09a "generate draft") and the teacher statement (S-03) all compute the same
 * number from the same rule.
 *
 * The rule: a teacher is paid per class actually taught. One completed `class_sessions` row whose
 * `teacher_id` is theirs = one `payroll_lines` row of kind 'class' at `teachers.rate_per_class`.
 * Bonuses and adjustments are extra lines finance adds by hand; they are never derived.
 */
import type { BookingRow, ClassSessionRow, PayrollLineRow, TeacherRow } from './schema';

export interface Period { start: string; end: string }

/** Calendar month containing `d`, as date-only strings (end is inclusive). */
export function monthPeriod(d: Date): Period {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: local(start), end: local(end) };
}

/** Date-only string in local time (payroll periods are studio-local, never UTC-shifted). */
export function local(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const inPeriod = (isoDate: string, p: Period) => {
  const day = local(new Date(isoDate));
  return day >= p.start && day <= p.end;
};

export interface DraftLine {
  teacher_id: string;
  class_session_id: string | null;
  kind: PayrollLineRow['kind'];
  rate: number;
  amount: number;
  attendees: number | null;
  note: string | null;
}

/**
 * The class lines of a period: every completed session in it, at the teacher's current rate.
 * Deterministic and idempotent — the same inputs always produce the same lines, so regenerating a
 * draft replaces it without drift.
 */
export function classLinesFor(period: Period, sessions: ClassSessionRow[], bookings: BookingRow[], teachers: TeacherRow[]): DraftLine[] {
  const rate = new Map(teachers.map((t) => [t.id, t.rate_per_class ?? 0]));
  const attendees = new Map<string, number>();
  for (const b of bookings) if (b.status === 'checked_in') attendees.set(b.session_id, (attendees.get(b.session_id) ?? 0) + 1);
  return sessions
    .filter((s) => s.status === 'completed' && rate.has(s.teacher_id) && inPeriod(s.starts_at, period))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((s) => ({
      teacher_id: s.teacher_id,
      class_session_id: s.id,
      kind: 'class' as const,
      rate: rate.get(s.teacher_id) ?? 0,
      amount: rate.get(s.teacher_id) ?? 0,
      attendees: attendees.get(s.id) ?? 0,
      note: null,
    }));
}

export const runTotal = (lines: { amount: number }[]) => lines.reduce((a, l) => a + l.amount, 0);

/** Lines grouped by teacher, each with its subtotal — the shape both statements render. */
export function byTeacher<T extends { teacher_id: string; amount: number }>(lines: T[]): { teacherId: string; lines: T[]; subtotal: number }[] {
  const map = new Map<string, T[]>();
  for (const l of lines) map.set(l.teacher_id, [...(map.get(l.teacher_id) ?? []), l]);
  return [...map.entries()]
    .map(([teacherId, ls]) => ({ teacherId, lines: ls, subtotal: runTotal(ls) }))
    .sort((a, b) => b.subtotal - a.subtotal);
}
