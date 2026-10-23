import type { BaseRow, ClassSessionRow, ModalityRow } from './schema';
import type { DataProvider } from './types';
import { tenant } from '../tenant/tenant';

/** New admissions only. Existing attendance, cancellation and historical reads keep their own rules. */
export function sessionAdmissionAvailable(session: ClassSessionRow, modality?: Pick<ModalityRow, 'active'>, template?: Pick<BaseRow, 'id'> & { active?: unknown }, now = Date.now(), tenantId: string = tenant.id): boolean {
  return session.tenant_id === tenantId && session.status === 'scheduled'
    && Number.isFinite(Date.parse(session.starts_at)) && Number.isFinite(Date.parse(session.ends_at))
    && Date.parse(session.starts_at) > now && Date.parse(session.ends_at) > Date.parse(session.starts_at)
    && modality?.active === true && (!session.template_id || template?.id === session.template_id && template.active === true);
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
  return session;
}
