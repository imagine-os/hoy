/**
 * Teacher payroll arithmetic, with no React and no provider — so the seed (historical runs), the
 * admin payouts page (M-09a "generate draft") and the teacher statement (S-03) all compute the same
 * number from the same rule.
 *
 * The rule: a teacher is paid per class actually taught. One completed `class_sessions` row whose
 * `teacher_id` is theirs = one `payroll_lines` row of kind 'class' at `teachers.rate_per_class`.
 * Bonuses and adjustments are extra lines finance adds by hand; they are never derived.
 *
 * The second rule (0017, Especiales): a teacher booked by hand on an Especial — a private class, a
 * birthday session, a teacher sold alongside a rental — is paid what the desk agreed on the
 * `special_charges` row (`teacher_payout`). One such row whose service falls in the period = one
 * `payroll_lines` row of kind 'manual', sourced by `special_charge_id`, so regenerating a draft
 * replaces it instead of adding it twice.
 */
import type { BookingRow, ClassSessionRow, PayrollLineRow, SpaceBookingRow, SpecialChargeRow, TeacherRow } from './schema';

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
  /** The Especial a manual line comes from; null on every other kind. */
  special_charge_id: string | null;
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
      special_charge_id: null,
      kind: 'class' as const,
      rate: rate.get(s.teacher_id) ?? 0,
      amount: rate.get(s.teacher_id) ?? 0,
      attendees: attendees.get(s.id) ?? 0,
      note: null,
    }));
}

/** The day an Especial was delivered: its room window when it has one, else the day it was sold. */
export const specialServiceDate = (sc: SpecialChargeRow, bookings: SpaceBookingRow[]): string =>
  (sc.space_booking_id && bookings.find((b) => b.id === sc.space_booking_id)?.starts_at) || sc.created_at;

/** The label every statement prints for a manual line — M-09b, S-03 and the CSV all read it from `note`. */
export const manualLineNote = (concept: string) => `Especial: ${concept}`;

/**
 * The manual lines of a period: every Especial with a teacher and a payout whose service date falls
 * in it. A cancelled room booking drops the line — the teacher did not work. Deterministic, like
 * `classLinesFor`, so the generator can replace a draft without drift.
 */
export function manualLinesFor(period: Period, specials: SpecialChargeRow[], bookings: SpaceBookingRow[], teachers: TeacherRow[]): DraftLine[] {
  const known = new Set(teachers.map((t) => t.id));
  return specials
    .filter((sc) => !!sc.teacher_id && known.has(sc.teacher_id) && (sc.teacher_payout ?? 0) > 0)
    .filter((sc) => !sc.space_booking_id || bookings.find((b) => b.id === sc.space_booking_id)?.status !== 'cancelled')
    .map((sc) => ({ sc, when: specialServiceDate(sc, bookings) }))
    .filter(({ when }) => inPeriod(when, period))
    .sort((a, b) => a.when.localeCompare(b.when))
    .map(({ sc }) => ({
      teacher_id: sc.teacher_id as string,
      class_session_id: null,
      special_charge_id: sc.id,
      kind: 'manual' as const,
      rate: 0,
      amount: sc.teacher_payout ?? 0,
      attendees: null,
      note: manualLineNote(sc.concept),
    }));
}

export interface DraftInputs { sessions: ClassSessionRow[]; bookings: BookingRow[]; teachers: TeacherRow[]; specials: SpecialChargeRow[]; spaceBookings: SpaceBookingRow[] }

/** Everything a period's draft contains: class lines, then manual lines. The one call M-09a and the seed make. */
export const draftLinesFor = (period: Period, i: DraftInputs): DraftLine[] => [
  ...classLinesFor(period, i.sessions, i.bookings, i.teachers),
  ...manualLinesFor(period, i.specials, i.spaceBookings, i.teachers),
];

export const runTotal = (lines: { amount: number }[]) => lines.reduce((a, l) => a + l.amount, 0);

/** Lines grouped by teacher, each with its subtotal — the shape both statements render. */
export function byTeacher<T extends { teacher_id: string; amount: number }>(lines: T[]): { teacherId: string; lines: T[]; subtotal: number }[] {
  const map = new Map<string, T[]>();
  for (const l of lines) map.set(l.teacher_id, [...(map.get(l.teacher_id) ?? []), l]);
  return [...map.entries()]
    .map(([teacherId, ls]) => ({ teacherId, lines: ls, subtotal: runTotal(ls) }))
    .sort((a, b) => b.subtotal - a.subtotal);
}
