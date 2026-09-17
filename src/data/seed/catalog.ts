import type { BaseRow, ModalityRow, RoomRow, TeacherRow, PlanRow } from '../schema';
import { pricing } from '../../tenant/pricing';
import { tenant } from '../../tenant/tenant';

export const NOW = new Date();
export const iso = (d: Date) => d.toISOString();
export const base = (id: string, daysAgo = 30): BaseRow => {
  const d = new Date(NOW); d.setDate(d.getDate() - daysAgo);
  return { id, tenant_id: tenant.id, created_at: iso(d), updated_at: iso(d) };
};

export const modalities: ModalityRow[] = [
  { ...base('mod_hot_vinyasa', 200), slug: 'hot-vinyasa', name_es: 'Hot Vinyasa', name_en: 'Hot Vinyasa', movement: 'arde', description: { es: 'Flujo dinámico en sala caliente. Sudor, fuerza y foco.', en: 'Dynamic flow in a heated room. Sweat, strength and focus.' }, intensity: 4, heated: true, duration_min: 60, active: true },
  { ...base('mod_morning_flow', 200), slug: 'morning-flow', name_es: 'Morning Flow', name_en: 'Morning Flow', movement: 'fluye', description: { es: 'Vinyasa suave para despertar el cuerpo y ordenar el día.', en: 'Gentle vinyasa to wake the body and order the day.' }, intensity: 2, heated: false, duration_min: 60, active: true },
  { ...base('mod_pilates', 200), slug: 'pilates', name_es: 'Pilates', name_en: 'Pilates', movement: 'enraiza', description: { es: 'Control, centro y precisión en mat.', en: 'Control, core and precision on the mat.' }, intensity: 3, heated: false, duration_min: 55, active: true },
  { ...base('mod_barre', 200), slug: 'barre', name_es: 'Barre', name_en: 'Barre', movement: 'enraiza', description: { es: 'Fuerza y postura con inspiración en ballet.', en: 'Strength and posture with a ballet lineage.' }, intensity: 3, heated: false, duration_min: 50, active: true },
  { ...base('mod_yin', 200), slug: 'yin', name_es: 'Yin', name_en: 'Yin', movement: 'libera', description: { es: 'Posturas largas y quietas para soltar tejido profundo.', en: 'Long, still holds to release deep tissue.' }, intensity: 1, heated: false, duration_min: 60, active: true },
  // 0018: Respiración has its own row; M-08f decides whether the public sees it (breathworkOwnClass) or it stays inside meditación.
  { ...base('mod_respiracion', 200), slug: 'respiracion', name_es: 'Respiración', name_en: 'Breathwork', movement: 'libera', description: { es: 'Pranayama y respiración consciente, sentados o acostados. Sin esfuerzo.', en: 'Pranayama and conscious breathing, seated or lying down. No effort.' }, intensity: 1, heated: false, duration_min: 45, active: true },
  { ...base('mod_meditacion', 200), slug: 'meditacion', name_es: 'Meditación', name_en: 'Meditation', movement: 'libera', description: { es: 'Respiración guiada y silencio compartido.', en: 'Guided breath and shared silence.' }, intensity: 1, heated: false, duration_min: 40, active: true },
];

export const rooms: RoomRow[] = [
  { ...base('room_main', 200), name: 'Sala principal', capacity: tenant.studio.mats, heated: true },
  // The small room: meditation, breathwork, private classes and closed groups (S-05). Demo capacity —
  // the owner confirms the real room list (ROADMAP §E).
  { ...base('room_meditacion', 200), name: 'Sala de meditación', capacity: 8, heated: false },
];

export const teachers: TeacherRow[] = [
  { ...base('tea_andres', 180), user_id: 'usr_teach', display_name: 'Andrés Quintero', bio: { es: 'Hot Vinyasa con humor y disciplina. 8 años enseñando.', en: 'Hot Vinyasa with humour and discipline. 8 years teaching.' }, photo_url: null, specialties: ['mod_hot_vinyasa', 'mod_morning_flow'], rate_per_class: 110000, active: true, rating_avg: 4.8 },
  { ...base('tea_paula', 180), user_id: null, display_name: 'Paula Mejía', bio: { es: 'Pilates clásico y contemporáneo. Precisión amable.', en: 'Classical and contemporary Pilates. Kind precision.' }, photo_url: null, specialties: ['mod_pilates', 'mod_barre'], rate_per_class: 95000, active: true, rating_avg: 4.9 },
  { ...base('tea_santiago', 180), user_id: null, display_name: 'Santiago Vélez', bio: { es: 'Yin y meditación. Menos es más.', en: 'Yin and meditation. Less is more.' }, photo_url: null, specialties: ['mod_yin', 'mod_meditacion'], rate_per_class: 85000, active: true, rating_avg: 4.7 },
  { ...base('tea_manuela', 180), user_id: null, display_name: 'Manuela Torres', bio: { es: 'Morning Flow con música y respiración.', en: 'Morning Flow with music and breath.' }, photo_url: null, specialties: ['mod_morning_flow', 'mod_yin'], rate_per_class: 95000, active: true, rating_avg: 4.6 },
  { ...base('tea_daniel', 180), user_id: null, display_name: 'Daniel Ochoa', bio: { es: 'Barre y fuerza funcional.', en: 'Barre and functional strength.' }, photo_url: null, specialties: ['mod_barre', 'mod_pilates'], rate_per_class: 85000, active: true, rating_avg: 4.5 },
  { ...base('tea_isabela', 180), user_id: null, display_name: 'Isabela Cano', bio: { es: 'Hot Vinyasa exigente y clara.', en: 'Demanding, clear Hot Vinyasa.' }, photo_url: null, specialties: ['mod_hot_vinyasa'], rate_per_class: 110000, active: true, rating_avg: 4.9 },
  { ...base('tea_felipe', 180), user_id: null, display_name: 'Felipe Zapata', bio: { es: 'Meditación y pranayama para gente ocupada.', en: 'Meditation and pranayama for busy people.' }, photo_url: null, specialties: ['mod_meditacion'], rate_per_class: 80000, active: true, rating_avg: 4.7 },
  { ...base('tea_carolina', 180), user_id: null, display_name: 'Carolina Pardo', bio: { es: 'Pilates mat y rehabilitación suave.', en: 'Mat Pilates and gentle rehab.' }, photo_url: null, specialties: ['mod_pilates'], rate_per_class: 95000, active: true, rating_avg: 4.8 },
];

export const plans: PlanRow[] = pricing.map((p, i) => ({
  ...base(`plan_${p.id}`, 200),
  slug: p.id, family: p.family, name_es: p.name.es, name_en: p.name.en, description: p.description,
  price: p.price ?? 0, period: p.period ?? 'once', credits: p.credits ?? null, validity_days: p.validityDays ?? null,
  is_from_price: !!p.from, badge: p.badge ?? null, active: true, sort: i,
}));

/**
 * 0018 — the demo rate card M-08c opens with (COP per class by modality). It lives on the seeded
 * `tenants.settings.payroll.rateCard`, not on the teacher rows: `teachers.rate_per_class` stays as the
 * last fallback `payrollCalc.rateFor()` reads. The owner replaces these numbers in M-08c.
 */
export const SEED_RATE_CARD = {
  byModality: { mod_hot_vinyasa: 110000, mod_morning_flow: 95000, mod_pilates: 95000, mod_barre: 90000, mod_yin: 85000, mod_meditacion: 80000, mod_respiracion: 80000 } as Record<string, number>,
  byTeacher: {} as Record<string, number>,
};
