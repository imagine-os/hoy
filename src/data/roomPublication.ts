import type { BaseRow } from './schema';
import { tenant } from '../tenant/tenant';

/** Browser CMS extension only. Missing legacy state stays published; malformed state fails closed. */
export function roomIsPublished(room: (Pick<BaseRow, 'tenant_id'> & { active?: unknown }) | null | undefined, tenantId: string = tenant.id): boolean {
  return !!room && room.tenant_id === tenantId && (room.active === undefined || room.active === true);
}
/** Prospective references only; existing sessions/bookings keep their room and admission semantics. */
export function requireAssignableRoom<T extends BaseRow>(rooms: readonly T[], roomId: string, tenantId: string): T {
  const matches = rooms.filter(room => room.id === roomId);
  if (matches.length !== 1 || !roomIsPublished(matches[0], tenantId)) throw Error('room_unavailable');
  return matches[0];
}
