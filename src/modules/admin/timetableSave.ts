/**
 * Lane Y5 (owner 2026-11-01, "Open timetable saves"): in the production build the M-02 timetable rows
 * (`class_templates`) save to Company OS `schedule` records: create (as a draft), edit, and deactivate (Published off).
 * The rest of M-02 stays refused `content_later` until Wave 3 (contentRecovery.ts).
 *
 * - Who: `classes.write` (Administration, the Coordinator, Super Admin; decision A-02: the coordinator keeps the
 *   timetable). Marketing holds `content.write` but not the timetable. Company OS decides again on its side.
 * - What: only the columns Company OS stores (`TIMETABLE_FIELDS`). Theme, description and level are derived in the
 *   mapping (not stored), so the production editor hides them and a patch naming them is refused, never dropped.
 * - Rows are deactivated, never deleted: generated classes keep pointing at their row.
 * - Business rules stay in Company OS: a room clash is refused there (`resource_overlap`, bookings 1.6.0
 *   enforce_no_overlap); this file checks only shapes, so a hostile value never reaches the API.
 */
import type { DataProvider } from '../../data/types';
import type { BaseRow } from '../../data/schema';
import type { Role } from '../../auth/roles';
import { roleCan } from '../../auth/permissions';
import { modalities } from '../../data/seed/catalog';
import { tenant } from '../../tenant/tenant';

export const TIMETABLE_FIELDS = ['title', 'modality_id', 'teacher_id', 'room_id', 'weekday', 'start_time', 'duration_min', 'capacity', 'start_date', 'end_date', 'active'] as const;
/** Editor fields Company OS doesn't store (derived in mapping.ts): hidden in production. */
export const TIMETABLE_UNSTORED = ['theme', 'description', 'level', 'generation_mode'] as const;

export interface TimetableActor { id: string; role: Role }
export type TimetableIntent =
  | { kind: 'create'; table: 'class_templates'; patch: Record<string, unknown> }
  | { kind: 'update' | 'delete'; table: 'class_templates'; before: BaseRow; patch?: Record<string, unknown> };

export const canSaveTimetable = (role: Role): boolean => roleCan(role, 'classes.write');

/** A refusal made here, before anything is sent: definite, so the screen shows its copy instead of a retry. */
export function timetableRefusal(code: string): Error {
  return Object.assign(new Error(code), { code, refused: true });
}

/**
 * The code of a definite refusal (nothing was saved and retrying the same request won't change that): a 4xx answer
 * from Company OS that isn't ambiguous, or a refusal from this file. Null for a lost answer, a 5xx or anything else,
 * which the screen offers to retry with the same request.
 */
export function definiteRefusal(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const err = e as { code?: unknown; status?: unknown; ambiguous?: unknown; refused?: unknown };
  if (typeof err.code !== 'string' || !err.code) return null;
  if (err.refused === true) return err.code;
  return typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.ambiguous !== true ? err.code : null;
}

const MODALITY_IDS = new Set(modalities.map((m) => m.id));
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: string) => { const at = new Date(`${v}T00:00:00Z`); return DAY.test(v) && !Number.isNaN(at.getTime()) && at.toISOString().slice(0, 10) === v; };
const isRef = (v: unknown) => v === null || v === '' || typeof v === 'string' && v.length <= 128 && /^[A-Za-z0-9_-]+$/.test(v);

function check(patch: Record<string, unknown>) {
  const keys = Object.keys(patch);
  if (!keys.length || keys.some((k) => !(TIMETABLE_FIELDS as readonly string[]).includes(k))) throw timetableRefusal('content_invalid');
  const bad = (ok: boolean) => { if (!ok) throw timetableRefusal('content_invalid'); };
  for (const [key, v] of Object.entries(patch)) {
    if (key === 'title') bad(typeof v === 'string' && !!v.trim() && v.length <= 500);
    else if (key === 'modality_id') bad(v === null || v === '' || typeof v === 'string' && MODALITY_IDS.has(v));
    else if (key === 'teacher_id' || key === 'room_id') bad(isRef(v));
    else if (key === 'weekday') bad(Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6);
    else if (key === 'start_time') bad(typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
    else if (key === 'duration_min') bad(Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 24 * 60);
    else if (key === 'capacity') bad(Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 1000);
    else if (key === 'start_date' || key === 'end_date') bad(v === null || typeof v === 'string' && isDay(v));
    else if (key === 'active') bad(typeof v === 'boolean');
  }
}

/** Saves one timetable action on Company OS; returns the row id. `requestId` keys a create (a retry can't make two). */
export async function saveTimetableRow(data: DataProvider, actor: TimetableActor, intent: TimetableIntent, requestId: string, currentActor: () => TimetableActor): Promise<string> {
  const assertActor = () => {
    const now = currentActor();
    if (now.id !== actor.id || now.role !== actor.role) throw Error('content_context_changed');
    if (!now.id || !canSaveTimetable(now.role)) throw timetableRefusal('content_denied');
  };
  assertActor();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(requestId)) throw timetableRefusal('content_invalid');
  if (intent.kind === 'delete') throw timetableRefusal('timetable_deactivate_instead');
  if (intent.kind === 'create') {
    // The editor's blank row carries the mock's defaults for the unstored fields; those stay behind.
    const patch = Object.fromEntries(Object.entries(intent.patch).filter(([k]) => !(TIMETABLE_UNSTORED as readonly string[]).includes(k)));
    check(patch);
    if (patch.active === true) throw timetableRefusal('content_invalid');
    const insert = data.insert.bind(data) as (table: string, row: Record<string, unknown>, options: { idempotencyKey: string }) => Promise<BaseRow>;
    const row = await insert('class_templates', { ...patch, active: false }, { idempotencyKey: `timetable_v1_${requestId}` });
    return row.id;
  }
  const patch = intent.patch ?? {};
  check(patch);
  const before = intent.before;
  if (!before?.id || before.tenant_id !== tenant.id) throw timetableRefusal('content_conflict');
  // Someone saved the row since the editor read it: refuse rather than overwrite their change.
  const current = await data.get<BaseRow>('class_templates', before.id);
  assertActor();
  if (!current || current.updated_at !== before.updated_at) throw timetableRefusal('content_conflict');
  // No check after the write: a change of session then must not report a saved row as failed.
  await data.update('class_templates', before.id, patch);
  return before.id;
}
