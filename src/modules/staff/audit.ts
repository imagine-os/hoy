import { useCallback } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';

/** Where the action came from — M-07 shows it as the "Source" column. */
export type AuditSource = 'front_desk' | 'admin' | 'teacher_app' | 'automation' | 'app';

/**
 * Every staff write appends a row to `audit_log` (actor, action, entity, row id, diff).
 * `diff` carries the effective role and the source so M-07 can filter without a join.
 *
 *   const audit = useAudit('front_desk');
 *   await audit('booking.checkin', 'bookings', booking.id, { before: 'booked', after: 'checked_in' });
 */
export function useAudit(source: AuditSource) {
  const data = useData();
  const { user, role } = useSession();
  return useCallback(
    (action: string, entity: string, entityId?: string | null, diff?: Record<string, unknown>) =>
      data.insert('audit_log', { actor_id: user.id, action, entity, entity_id: entityId ?? null, diff: { role, source, ...(diff ?? {}) }, ip: null }),
    [data, user.id, role, source],
  );
}

export interface AuditRow { id: string; created_at: string; actor_id: string | null; action: string; entity: string; entity_id: string | null; diff: (Record<string, unknown> & { role?: string; source?: string; before?: unknown; after?: unknown }) | null; ip: string | null; tenant_id: string; updated_at: string; [k: string]: unknown }

/**
 * Human title for an audit action (`session.cancel` → "Clase cancelada"). The dictionary key is
 * `admin.audit.<action>`; an action nobody translated yet falls back to the raw key, so a new write
 * never breaks the feed — it only reads a little more technical until its string lands.
 */
export function auditTitle(action: string, t: (key: string) => string, dict: Record<string, unknown>): string {
  const key = `admin.audit.${action}`;
  return dict[key] ? t(key) : action;
}
