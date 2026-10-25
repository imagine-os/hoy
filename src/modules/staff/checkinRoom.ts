import type { Role } from '../../auth/roles';

/** Match the existing S-02 route roles; this is a display fence, not server authorization. */
export function canReadCheckinRoom(actorId: string, role: Role, tenantId: string): boolean {
  return !!actorId && !!tenantId && ['super_admin', 'admin', 'coordinator', 'front_desk'].includes(role);
}

/** Existing assignments remain readable even when their room is unpublished. */
export function checkinRoomName(rows: unknown, roomId: string, tenantId: string): string | null {
  if (!roomId || !tenantId || !Array.isArray(rows) || rows.length > 1) throw Error('checkin_room_invalid');
  if (!rows.length) return null;
  const row = rows[0];
  if (!row || typeof row !== 'object' || row.id !== roomId || row.tenant_id !== tenantId || typeof row.name !== 'string' || !row.name.trim()) throw Error('checkin_room_invalid');
  return row.name.trim();
}
