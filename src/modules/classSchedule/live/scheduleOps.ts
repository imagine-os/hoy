import type { BatchOp } from '../../staff/desk/wire';

/**
 * AD-01 / AD-02 · class, schedule, teacher and room writes in Company OS terms (bookings `schedule`, `occurrence`,
 * `resource`; people `person` + `coach`). Pure builders, so the named tests read exactly what is sent.
 *
 * Hoy's classes run from :00 to :50 (50 minutes, on the hour); rooms hold 16 and 8 mats, so a class takes its room's
 * capacity and numbered spots by default.
 */
export const CLASS_MINUTES = 50;
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Monday first; 0 = Sunday, as Company OS stores it

export interface ScheduleDraft { title: string; weekday: number; start_time: string; resource: string; coach: string; capacity: number; valid_from: string; valid_until?: string; active: boolean }
export interface ResourceDraft { name: string; capacity: number }
export interface CoachDraft { name: string; email?: string; phone?: string; active: boolean }

export type ScheduleProblem = 'title' | 'weekday' | 'start_time' | 'on_the_hour' | 'resource' | 'coach' | 'capacity' | 'valid_from';

/** Checks a class before it is sent: the server checks types and references; the :00 start is Hoy's rule. */
export function scheduleProblems(d: ScheduleDraft, roomCapacity: number | undefined): ScheduleProblem[] {
  const out: ScheduleProblem[] = [];
  if (!d.title.trim()) out.push('title');
  if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) out.push('weekday');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start_time)) out.push('start_time');
  else if (!d.start_time.endsWith(':00')) out.push('on_the_hour');
  if (!d.resource) out.push('resource');
  if (!d.coach) out.push('coach');
  if (!Number.isInteger(d.capacity) || d.capacity < 1 || (roomCapacity != null && d.capacity > roomCapacity)) out.push('capacity');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.valid_from)) out.push('valid_from');
  return out;
}

export const scheduleData = (d: ScheduleDraft) => ({
  title: d.title.trim(), kind: 'class', weekday: d.weekday, start_time: d.start_time, duration_minutes: CLASS_MINUTES,
  resource: d.resource, coach: d.coach, capacity: d.capacity, spots_enabled: true,
  valid_from: d.valid_from, valid_until: d.valid_until || null, active: d.active,
});

export const createScheduleOps = (d: ScheduleDraft): BatchOp[] => [{ op: 'create', entity: 'schedule', data: scheduleData(d) }];
export const updateScheduleOps = (id: string, d: ScheduleDraft): BatchOp[] => [{ op: 'update', entity: 'schedule', id, data: scheduleData(d) }];
/** Publish / unpublish a class: an inactive schedule generates no new dates; dates already generated stay as they are. */
export const publishScheduleOps = (id: string, active: boolean): BatchOp[] => [{ op: 'update', entity: 'schedule', id, data: { active } }];
/** Generate the published classes' dates up to `until` (inclusive); idempotent per schedule and date. */
export const generateOps = (until: string, schedule?: string): BatchOp[] => [{ op: 'create', entity: 'generation_request', data: { until, ...(schedule ? { schedule } : {}) } }];

export const resourceData = (d: ResourceDraft) => ({ name: d.name.trim(), kind: 'room', capacity: d.capacity });
export const createResourceOps = (d: ResourceDraft): BatchOp[] => [{ op: 'create', entity: 'resource', data: resourceData(d) }];
export const updateResourceOps = (id: string, d: ResourceDraft): BatchOp[] => [{ op: 'update', entity: 'resource', id, data: resourceData(d) }];

/** A teacher is a person with a `coach` facet, created together. */
export function createCoachOps(d: CoachDraft): BatchOp[] {
  return [
    { op: 'create', entity: 'person', data: { name: d.name.trim(), ...(d.email?.trim() ? { email: d.email.trim().toLowerCase() } : {}), ...(d.phone?.trim() ? { phone: d.phone.trim() } : {}) } },
    { op: 'create', entity: 'coach', data: { person: { $ref: 0 }, kind: 'teacher', active: d.active } },
  ];
}
export function updateCoachOps(coachId: string, personId: string, d: CoachDraft): BatchOp[] {
  return [
    { op: 'update', entity: 'person', id: personId, data: { name: d.name.trim(), ...(d.phone?.trim() ? { phone: d.phone.trim() } : {}) } },
    { op: 'update', entity: 'coach', id: coachId, data: { active: d.active } },
  ];
}

/**
 * AD-02 · studio cancel. One write: the server cancels every active booking, returns each class to its own lot
 * (credits `studio_cancel`), closes the waitlist, and the class-cancelled automation emails everyone (lane H-9).
 * `ifMatch` refuses it if someone else cancelled or completed the class first.
 */
export function cancelOccurrenceOps(id: string, reason: string): BatchOp[] {
  return [{ op: 'update', entity: 'occurrence', id, data: { status: 'cancelled', cancel_reason: reason.trim() }, ifMatch: { field: 'status', value: 'scheduled' } }];
}
