import type { BaseRow, BookingRow, ClassSessionRow, ModalityRow, TeacherRow, RoomRow } from '../../data/schema';

/** Defensive UI scope, including providers which return more than the requested rows. */
export function tenantRows<T extends BaseRow>(rows: readonly T[], tenantId: string | null | undefined): T[] {
  return typeof tenantId==='string'&&tenantId.trim() ? rows.filter(row=>row.tenant_id===tenantId) : [];
}
export function ownBookingRows(rows: readonly BookingRow[], tenantId: string | null | undefined, userId: string | null | undefined): BookingRow[] {
  return typeof userId==='string'&&userId.trim() ? tenantRows(rows,tenantId).filter(row=>row.user_id===userId) : [];
}
export function joinTenantSessions(rows: {sessions:readonly ClassSessionRow[];modalities:readonly ModalityRow[];teachers:readonly TeacherRow[];rooms:readonly RoomRow[];templates:readonly (BaseRow&{active:boolean})[]}, tenantId: string | null | undefined) {
  const mod=new Map(tenantRows(rows.modalities,tenantId).map(row=>[row.id,row])),tea=new Map(tenantRows(rows.teachers,tenantId).map(row=>[row.id,row])),room=new Map(tenantRows(rows.rooms,tenantId).map(row=>[row.id,row])),templates=new Map(tenantRows(rows.templates,tenantId).map(row=>[row.id,row]));
  return tenantRows(rows.sessions,tenantId).map(session=>({session,modality:mod.get(session.modality_id),teacher:tea.get(session.teacher_id),room:room.get(session.room_id),templateActive:templates.get(session.template_id??'')?.active}));
}
