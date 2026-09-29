/**
 * The operations manual as a staff LMS (0031): a little reading and training history so the K-03
 * "Equipo" view, the progress ring and K-04's request panel open with data. Fixed rows, no RNG.
 */
import type { BaseRow, ManualOverrideRow, ManualProgressRow, ManualRequestRow, ManualTrainingRow, ProfileRow, UserRow } from '../schema';
import { base, iso, NOW } from './catalog';
import { addDays } from '../../i18n/format';
import { demoUsers } from '../../auth/demoUsers';

const at = (days: number) => iso(addDays(NOW, -days));

/** The two roles added in 0031 get their users / profiles / user_roles rows here, after every RNG pass. */
export const LATE_ROLES = new Set(['marketing', 'developer']);

export function buildLateStaff(): { users: UserRow[]; profiles: ProfileRow[]; roles: BaseRow[] } {
  const late = demoUsers.filter((u) => LATE_ROLES.has(u.role));
  return {
    users: late.map((u, i) => ({ ...base(u.id, 20), email: u.email, phone: `+57 310 000 00${10 + i}`, status: 'active', locale: 'es', last_sign_in_at: at(1) })),
    profiles: late.map((u) => ({ ...base(`prf_${u.id.slice(4)}`, 20), user_id: u.id, full_name: u.name, initials: u.initials, photo_url: null, birthday: null, emergency_contact: null, marketing_optin: false, whatsapp_verified: true, notes: null })),
    roles: late.map((u) => ({ ...base(`rol_${u.id.slice(4)}`, 20), user_id: u.id, role: u.role, granted_by: 'usr_admin' })),
  };
}

const read = (user: string, slug: string, days: number): ManualProgressRow => ({ ...base(`mpr_${user.slice(4)}_${slug.slice(0, 2)}`, days), user_id: user, chapter_slug: slug, version: '0.8.0', read_at: at(days) });
const item = (user: string, role: string, stage: ManualTrainingRow['stage'], key: string, days: number, signedBy: string | null = null): ManualTrainingRow =>
  ({ ...base(`mtr_${user.slice(4)}_${stage}_${key}`, days), user_id: user, role, stage, item_key: key, done_at: at(days), signed_by: signedBy });

export function buildManual(): { progress: ManualProgressRow[]; training: ManualTrainingRow[]; requests: ManualRequestRow[]; overrides: ManualOverrideRow[] } {
  const progress = [
    read('usr_desk', '01-quienes-somos-y-filosofia', 12), read('usr_desk', '04-recepcion-y-check-in', 11), read('usr_desk', '08-incidencias-y-emergencias', 10), read('usr_desk', '20-voz-y-tono', 9),
    read('usr_teach', '01-quienes-somos-y-filosofia', 8), read('usr_teach', '02-nuestras-clases', 8), read('usr_teach', '06-maestros', 7),
    read('usr_coord', '01-quienes-somos-y-filosofia', 20), read('usr_coord', '05-clases-y-horarios', 18),
    read('usr_fin', '14-pagos-y-caja', 15),
  ];
  const training = [
    // Camilo (front desk): Day 1 done and signed by Valentina; two Week 1 items done.
    ...['read', 'user', 'tour', 'checkin', 'greeting'].map((k) => item('usr_desk', 'front_desk', 'day1', k, 11)),
    item('usr_desk', 'front_desk', 'day1', '__signoff', 10, 'usr_coord'),
    item('usr_desk', 'front_desk', 'week1', 'openclose', 6), item('usr_desk', 'front_desk', 'week1', 'registrations', 4),
    // Andrés (teacher): two Day 1 items.
    item('usr_teach', 'teacher', 'day1', 'read', 8), item('usr_teach', 'teacher', 'day1', 'app', 8),
  ];
  const requests: ManualRequestRow[] = [
    { ...base('mrq_1', 3), chapter_slug: '04-recepcion-y-check-in', section_heading: '7. Objetos perdidos', lang: 'es', request: 'Los objetos de valor (celulares, llaves) no deberían esperar 30 días en la caja: propongo guardarlos bajo llave y avisar por WhatsApp el mismo día.', requested_by: 'usr_desk', status: 'open', answer: null },
    { ...base('mrq_2', 1), chapter_slug: '06-maestros', section_heading: null, lang: 'es', request: 'Falta explicar qué hago si llego y la sala todavía está caliente de la clase anterior.', requested_by: 'usr_teach', status: 'open', answer: null },
  ];
  return { progress, training, requests, overrides: [] };
}
