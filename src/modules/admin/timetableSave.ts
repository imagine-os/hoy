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
import { hasRefusalCopy, refusalCopy } from '../../data/companyos/refusals';
import type { Lang } from '../../i18n/types';

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
 * from Company OS that isn't ambiguous and has its own copy, or a refusal from this file. Null for a lost answer, a
 * 5xx, a code without copy or anything else, which the screen offers to retry with the same request (never a raw code).
 */
export function definiteRefusal(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const err = e as { code?: unknown; status?: unknown; ambiguous?: unknown; refused?: unknown };
  if (typeof err.code !== 'string' || !err.code) return null;
  if (err.refused === true) return err.code;
  return typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.ambiguous !== true && hasRefusalCopy(err.code) ? err.code : null;
}

/**
 * Review round 2 (r2hoy, r2co contract): bookings 1.6.0's timetable check names what the row clashes with in
 * `details` (`source` "schedule": another active row; "class": a class still to come that another row, often a switched-off
 * one, already made), so the editor can say which class, when, and a remedy that works. Anything malformed: null.
 */
interface OverlapDetails { source: 'schedule' | 'class'; title: string; date: string; time: string }
function overlapDetails(e: unknown): OverlapDetails | null {
  const d = e && typeof e === 'object' ? (e as { details?: unknown }).details : null;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const { source, title, date, time } = d as Record<string, unknown>;
  if (source !== 'schedule' && source !== 'class') return null;
  if (typeof title !== 'string' || !title.trim() || typeof date !== 'string' || !isDay(date) || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const short = title.trim().replace(/\s+/g, ' ');
  return { source, title: short.length > 80 ? `${short.slice(0, 79)}…` : short, date, time };
}
const dayLabel = (date: string, lang: Lang) => new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The line the editor shows for a definite refusal: the code's copy, or for a room clash with details, a precise one. */
export function refusalText(e: unknown, lang: Lang): string {
  const code = definiteRefusal(e) ?? (e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : '');
  const d = code === 'resource_overlap' ? overlapDetails(e) : null;
  if (!d) return refusalCopy(code, lang);
  const day = dayLabel(d.date, lang);
  if (d.source === 'schedule') {
    return lang === 'en'
      ? `That room already has “${d.title}” at that time, from another published timetable row (for example on ${day} at ${d.time}). Choose another time or room. If this row replaces that one, switch that one off and start this one after its last class already made.`
      : `Esa sala ya tiene «${d.title}» a esa hora, de otro horario publicado (por ejemplo el ${day} a las ${d.time}). Elige otra hora u otra sala. Si este horario reemplaza a ese, desactívalo y haz que este empiece después de su última clase ya creada.`;
  }
  return lang === 'en'
    ? `That room already has “${d.title}” on ${day} at ${d.time}, a class another timetable row already made (that row may be switched off). Start this row after that date (set its start date), or cancel that class only if nobody has booked it.`
    : `Esa sala ya tiene «${d.title}» el ${day} a las ${d.time}, una clase que otro horario ya creó (ese horario puede estar desactivado). Haz que este horario empiece después de esa fecha (su fecha de inicio), o cancela esa clase solo si nadie la reservó.`;
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

const hasClassType = (v: unknown): boolean => typeof v === 'string' && MODALITY_IDS.has(v);

/**
 * Review round 1 (r1hoy, M2): a row is published only with its class type (without one its classes can't be booked,
 * `no_class_type`). The drawer's Published toggle is off for a draft without one; switching a published row off stays
 * possible whatever it holds.
 */
export const timetablePublishBlocked = (row: Record<string, unknown>): boolean => row.active !== true && !hasClassType(row.modality_id);

/** The editor's fields that differ from the row it was opened on (L3: nothing changed is nothing to save). */
export function draftPatch(draft: Record<string, unknown>, basis: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(draft).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(basis[key])));
}
/**
 * The editor's basis after its own save went through: the fields it sent are what is stored now, so the next diff is
 * taken against them (a field changed back is sent again, never dropped). The version stays the one the editor read:
 * the own-save memory below recognises the row at the version this save produced.
 */
export const basisAfterSave = <T extends Record<string, unknown>>(basis: T, patch: Record<string, unknown>): T => ({ ...basis, ...structuredClone(patch) });
export const nothingToSave = (draft: Record<string, unknown>, basis: Record<string, unknown>): boolean => Object.keys(draftPatch(draft, basis)).length === 0;

/**
 * L4: this tab's own last save of each row, per provider: the version it started from and the version it produced. A
 * second save from an editor whose basis hasn't refreshed yet finds the row at that produced version and goes ahead;
 * anyone else's save in between moves the version on and is still a conflict.
 */
const ownSaves = new WeakMap<object, Map<string, { from: string; to: string }>>();

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
  if (!current) throw timetableRefusal('content_conflict');
  const mine = ownSaves.get(data)?.get(before.id);
  const ownLater = !!mine && mine.from === before.updated_at && mine.to === current.updated_at;
  if (current.updated_at !== before.updated_at) {
    // A retry after a lost answer finds the person's own save: the row already holds the patch, so it is saved.
    if (Object.entries(patch).every(([k, v]) => JSON.stringify(current[k] ?? null) === JSON.stringify(v ?? null))) return before.id;
    if (!ownLater) throw timetableRefusal('content_conflict');
  }
  // M2: the row as it would be after this patch must not be published without a class type.
  const after = { ...current, ...patch };
  if (after.active === true && ('active' in patch || 'modality_id' in patch) && !hasClassType(after.modality_id)) throw timetableRefusal('timetable_class_type_required');
  // No check after the write: a change of session then must not report a saved row as failed.
  const saved = await data.update<BaseRow>('class_templates', before.id, patch);
  if (saved?.updated_at) {
    const rows = ownSaves.get(data) ?? new Map<string, { from: string; to: string }>();
    rows.set(before.id, { from: ownLater ? mine!.from : before.updated_at, to: saved.updated_at });
    ownSaves.set(data, rows);
  }
  return before.id;
}
