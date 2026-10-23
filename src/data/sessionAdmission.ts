import type { BaseRow, ClassSessionRow, ModalityRow, RoomRow } from './schema';
import type { DataProvider } from './types';
import { usesMats } from './mats';
import { tenant } from '../tenant/tenant';

/** New admissions only. Existing attendance, cancellation and historical reads keep their own rules. */
export function sessionAdmissionAvailable(session: ClassSessionRow, modality?: Pick<ModalityRow, 'active'>, template?: Pick<BaseRow, 'id'> & { active?: unknown }, now = Date.now(), tenantId: string = tenant.id): boolean {
  return session.tenant_id === tenantId && session.status === 'scheduled'
    && Number.isFinite(Date.parse(session.starts_at)) && Number.isFinite(Date.parse(session.ends_at))
    && Date.parse(session.starts_at) > now && Date.parse(session.ends_at) > Date.parse(session.starts_at)
    && modality?.active === true && (!session.template_id || template?.id === session.template_id && template.active === true);
}
/** Imported session snapshots cannot exceed their current physical room or mat ceiling.
 * This is a fresh-admission limit only; callers must not persist it over historical sessions. */
export function effectiveAdmissionCapacity(session: ClassSessionRow, room: RoomRow | null | undefined, modality: Pick<ModalityRow, 'slug'> | null | undefined, tenantId: string = tenant.id): number {
  if (session.tenant_id !== tenantId || !room || room.id !== session.room_id || room.tenant_id !== tenantId
    || !Number.isSafeInteger(session.capacity) || session.capacity < 1 || !Number.isSafeInteger(room.capacity) || room.capacity < 1) throw new Error('session_unavailable');
  return Math.min(session.capacity, room.capacity, usesMats(modality) ? tenant.studio.mats : Infinity);
}
export interface AdmissionControl { isCurrent?: () => boolean; now?: number }
export function assertAdmissionContext(control: AdmissionControl = {}): void {
  if (control.isCurrent && !control.isCurrent()) throw new Error('admission_context_changed');
}
/** Fresh scoped reads inside the caller's transaction; every await retains the captured actor context. */
export async function requireSessionAdmission(data: DataProvider, sessionId: string, control: AdmissionControl = {}): Promise<ClassSessionRow> {
  assertAdmissionContext(control);
  const session = await data.get<ClassSessionRow>('class_sessions', sessionId);
  assertAdmissionContext(control);
  if (!session || session.id !== sessionId || session.tenant_id !== tenant.id) throw new Error('session_unavailable');
  const modality = await data.get<ModalityRow>('modalities', session.modality_id);
  assertAdmissionContext(control);
  const template = session.template_id ? await data.get<BaseRow & { active?: unknown }>('class_templates', session.template_id) : null;
  assertAdmissionContext(control);
  if (!modality || modality.id !== session.modality_id || modality.tenant_id !== tenant.id || template && template.tenant_id !== tenant.id || !sessionAdmissionAvailable(session, modality, template ?? undefined, control.now)) throw new Error('session_unavailable');
  const room = await data.get<RoomRow>('rooms', session.room_id);
  assertAdmissionContext(control);
  return { ...session, capacity: effectiveAdmissionCapacity(session, room, modality) };
}
