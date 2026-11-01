import type { ClassSessionRow, ModalityRow, RoomRow, TeacherRow } from './schema';

export interface SessionAvailabilityInput {
  session: Pick<ClassSessionRow, 'status' | 'starts_at' | 'ends_at'>;
  modality?: Pick<ModalityRow, 'active'>;
  templateActive?: boolean;
}
export type SessionUnavailableReason = 'cancelled' | 'completed' | 'ended' | 'started' | 'unpublished' | 'no_class_type' | 'unavailable';
/** Calendar availability only. Full future classes still open their existing waitlist flow. */
export function sessionUnavailableReason({ session, modality, templateActive }: SessionAvailabilityInput, now = Date.now()): SessionUnavailableReason | null {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';
  const start = Date.parse(session.starts_at), end = Date.parse(session.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'unavailable';
  if (end <= now) return 'ended';
  if (start <= now) return 'started';
  // Owner 2026-11-01 (review round 2, L3, "Stop new classes only"): switching a timetable row off stops new classes; the
  // classes it already made stay on the schedule and bookable (staff cancel one to call it off). Only a withdrawn class
  // type makes a class "not published". `templateActive` is kept for the staff screens, never as a reason here.
  void templateActive;
  if (modality?.active === false) return 'unpublished';
  // Lane Y1: a class without a class type (no colour, letter or description) is not open for booking, as admission says.
  if (!modality) return 'no_class_type';
  return null;
}

/**
 * Whether a class's timetable row is published, for the reader (r1hoy L7): a visitor gets only the published rows, so a
 * class whose row isn't among them was made from a switched-off row: false. Undefined for a one-off class or a reader
 * with no rows. Since the owner's r2 L3 decision this no longer closes the class (`sessionUnavailableReason`).
 */
export function templateActiveOf(templateId: string | null | undefined, templates: readonly { id: string; active?: boolean }[]): boolean | undefined {
  if (!templateId || templates.length === 0) return undefined;
  const row = templates.find((t) => t.id === templateId);
  return row ? row.active !== false : false;
}

export interface JoinedSessionRow { session: ClassSessionRow; modality?: ModalityRow; teacher?: TeacherRow; room?: RoomRow; templateActive?: boolean }

/**
 * Sessions joined with their class type, teacher, room and timetable row (the site and staff screens). L8: nothing is
 * joined while a read is still loading, so no class says "not open for booking" for a moment before its class type
 * arrives.
 */
export function joinSessionRows(rows: { sessions: readonly ClassSessionRow[]; modalities: readonly ModalityRow[]; teachers: readonly TeacherRow[]; rooms: readonly RoomRow[]; templates: readonly { id: string; active?: boolean }[] }, opts: { loading: boolean; filter?: (s: ClassSessionRow) => boolean }): JoinedSessionRow[] {
  if (opts.loading) return [];
  const mod = new Map(rows.modalities.map((m) => [m.id, m]));
  const tea = new Map(rows.teachers.map((t) => [t.id, t]));
  const room = new Map(rows.rooms.map((r) => [r.id, r]));
  return rows.sessions.filter((s) => !opts.filter || opts.filter(s)).map((s) => ({ session: s, modality: mod.get(s.modality_id), teacher: tea.get(s.teacher_id), room: room.get(s.room_id ?? ''), templateActive: templateActiveOf(s.template_id, rows.templates) }));
}
