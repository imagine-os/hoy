/**
 * `deletion_requests` (0019): three cases so C-26, W-09 and M-11 open with data — one just asked from
 * the app, one being processed, one closed from the public page (no account: email only). The demo
 * member (usr_cust) has none, so the customer flow can be exercised from scratch.
 */
import type { BaseRow, DeletionRequestRow } from '../schema';
import { base, iso, NOW } from './catalog';

const daysAgo = (n: number) => iso(new Date(NOW.getTime() - n * 86400e3));

export function buildDeletionRequests(): { rows: DeletionRequestRow[]; audit: BaseRow[] } {
  const rows: DeletionRequestRow[] = [
    { ...base('del_c19', 2), user_id: 'usr_c19', email: null, phone: null, channel: 'app', status: 'requested', reason: 'Me mudo de ciudad.', requested_at: daysAgo(2), resolved_at: null, resolved_by: null, checklist: null, note: null },
    { ...base('del_c27', 9), user_id: 'usr_c27', email: null, phone: null, channel: 'app', status: 'processing', reason: null, requested_at: daysAgo(9), resolved_at: null, resolved_by: null, checklist: { profile: true, contact: true, notifications: true }, note: 'Tiene una factura de septiembre: se conserva anonimizada.' },
    { ...base('del_web1', 30), user_id: null, email: 'ex-socio@demo.hoyos.test', phone: null, channel: 'website', status: 'done', reason: 'Nunca terminé de crear la cuenta.', requested_at: daysAgo(30), resolved_at: daysAgo(21), resolved_by: 'usr_admin', checklist: { profile: true, contact: true, notifications: true, messages: true, auth: true, payments: true, confirm: true }, note: 'Sin cuenta en users: solo se confirmó por correo.' },
  ];
  const audit: BaseRow[] = [
    { ...base('aud_del_1', 2), actor_id: 'usr_c19', action: 'account.deletion_request', entity: 'deletion_requests', entity_id: 'del_c19', diff: { role: 'customer', source: 'app', after: 'requested' }, ip: null },
    { ...base('aud_del_2', 9), actor_id: 'usr_c27', action: 'account.deletion_request', entity: 'deletion_requests', entity_id: 'del_c27', diff: { role: 'customer', source: 'app', after: 'requested' }, ip: null },
    { ...base('aud_del_3', 8), actor_id: 'usr_admin', action: 'deletion.processing', entity: 'deletion_requests', entity_id: 'del_c27', diff: { role: 'admin', source: 'admin', before: 'requested', after: 'processing' }, ip: null },
    { ...base('aud_del_4', 30), actor_id: null, action: 'account.deletion_request', entity: 'deletion_requests', entity_id: 'del_web1', diff: { role: 'public', source: 'app', channel: 'website', after: 'requested' }, ip: null },
    { ...base('aud_del_5', 21), actor_id: 'usr_admin', action: 'deletion.done', entity: 'deletion_requests', entity_id: 'del_web1', diff: { role: 'admin', source: 'admin', before: 'processing', after: 'done' }, ip: null },
  ];
  return { rows, audit };
}
