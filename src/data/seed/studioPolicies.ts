/**
 * `studio_policies` (0031) — the text rules a manual chapter quotes with `{{studio:<key>}}` and the owner
 * or coordination adjust from K-03 without touching the markdown. Numeric policies (cancellation window,
 * waitlist claim, grace, fees) are NOT here: they live in M-08 (`{{policy:…}}`).
 *
 * To add a rule: append one entry to STUDIO_POLICIES below (key in snake_case, label and value in ES and EN,
 * the chapter number that quotes it, who may edit it), then write `{{studio:<key>}}` on its own line in the
 * chapter. Nothing else changes.
 */
import type { StudioPolicyRow } from '../schema';
import { base } from './catalog';

export interface StudioPolicySeed {
  key: string;
  label: { es: string; en: string };
  value: { es: string; en: string };
  /** Chapter number that quotes it ('04'). */
  chapter: string;
  /** owner = admin and super admin only · coordinator = coordination too. */
  editableBy: 'owner' | 'coordinator';
}

export const STUDIO_POLICIES: StudioPolicySeed[] = [
  { key: 'lost_items_days', chapter: '04', editableBy: 'coordinator',
    label: { es: 'Objetos perdidos: cuánto se guardan', en: 'Lost items: how long they are kept' },
    value: { es: '30 días; después se donan. Avísalo al entregar.', en: '30 days; then they are donated. Say so when you hand an item back.' } },
  { key: 'opening_lead_minutes', chapter: '04', editableBy: 'coordinator',
    label: { es: 'Apertura: cuánto antes de la primera clase', en: 'Opening: how long before the first class' },
    value: { es: '45 min', en: '45 min' } },
  { key: 'closing_checklist_owner', chapter: '07', editableBy: 'coordinator',
    label: { es: 'Quién firma la checklist de cierre', en: 'Who signs the closing checklist' },
    value: { es: 'Recepción', en: 'Front desk' } },
  { key: 'guest_allowance_note', chapter: '11', editableBy: 'owner',
    label: { es: 'Invitados de un socio de Membresía', en: 'Guests of a Membership member' },
    value: { es: 'Provisional: un invitado por mes, ocupa un mat; pendiente de decisión del owner.', en: 'Provisional: one guest per month, takes a mat; pending the owner’s decision.' } },
  { key: 'quiet_hours_note', chapter: '13', editableBy: 'owner',
    label: { es: 'Horas silenciosas: qué significa', en: 'Quiet hours: what they mean' },
    value: { es: 'Entre esas horas no se envía nada que no sea urgente (una clase cancelada sí se avisa).', en: 'Nothing that is not urgent is sent between those hours (a cancelled class is still announced).' } },
  // 0032 — the manual-content pass: the house rules the rewritten chapters quote.
  { key: 'greeting_line', chapter: '04', editableBy: 'owner',
    label: { es: 'Saludo a una persona nueva', en: 'Greeting for someone new' },
    value: { es: '"Hola, bienvenida a HOY. ¿Es tu primera vez? Te registro en un minuto."', en: '"Hi, welcome to HOY. Is it your first time? I\'ll get you registered in a minute."' } },
  { key: 'schedule_change_notice_days', chapter: '05', editableBy: 'coordinator',
    label: { es: 'Aviso de un cambio de horario', en: 'Notice for a schedule change' },
    value: { es: '7 días', en: '7 days' } },
  { key: 'teacher_arrival_minutes', chapter: '06', editableBy: 'coordinator',
    label: { es: 'Maestros: cuánto antes de la clase llegan', en: 'Teachers: how early they arrive' },
    value: { es: '15 min', en: '15 min' } },
  { key: 'substitution_notice_hours', chapter: '06', editableBy: 'coordinator',
    label: { es: 'Aviso mínimo para pedir un reemplazo', en: 'Minimum notice to ask for a substitute' },
    value: { es: '24 horas', en: '24 hours' } },
  { key: 'turnover_minutes', chapter: '07', editableBy: 'coordinator',
    label: { es: 'Tiempo entre clases', en: 'Time between classes' },
    value: { es: '15 min', en: '15 min' } },
  { key: 'emergency_number', chapter: '08', editableBy: 'owner',
    label: { es: 'Número de emergencias', en: 'Emergency number' },
    value: { es: '123 (línea única de emergencias de Colombia) — por confirmar', en: '123 (Colombia\'s single emergency line) — to be confirmed' } },
  { key: 'reference_clinic', chapter: '08', editableBy: 'owner',
    label: { es: 'Clínica de referencia', en: 'Reference clinic' },
    value: { es: 'Por definir: nombre, dirección y teléfono.', en: 'To be defined: name, address and phone.' } },
  { key: 'evacuation_route', chapter: '08', editableBy: 'owner',
    label: { es: 'Ruta de evacuación y punto de encuentro', en: 'Evacuation route and meeting point' },
    value: { es: 'Por definir: por dónde se sale y dónde se reúne el grupo.', en: 'To be defined: which way out, and where the group gathers.' } },
  { key: 'b2b_deposit_note', chapter: '12', editableBy: 'owner',
    label: { es: 'Alquiler: anticipo y cancelación', en: 'Rental: deposit and cancellation' },
    value: { es: 'Sin anticipo, la fecha no se bloquea. El porcentaje y cuánto se devuelve si se cancela están por definir.', en: 'No deposit, no date held. The percentage and the refund if it is cancelled are still to be defined.' } },
  { key: 'whatsapp_response_minutes', chapter: '13', editableBy: 'coordinator',
    label: { es: 'WhatsApp: tiempo máximo de respuesta en horario', en: 'WhatsApp: longest reply time during desk hours' },
    value: { es: '15 min', en: '15 min' } },
  { key: 'cash_difference_threshold', chapter: '14', editableBy: 'owner',
    label: { es: 'Caja: diferencia que se avisa al owner', en: 'Till: difference reported to the owner' },
    value: { es: 'Más de $10.000', en: 'More than COP 10,000' } },
  { key: 'content_review_turnaround', chapter: '17', editableBy: 'coordinator',
    label: { es: 'Contenido: plazo para revisar lo que envía un maestro', en: 'Content: time to review a teacher\'s submission' },
    value: { es: 'La misma semana', en: 'The same week' } },
  { key: 'social_calendar_note', chapter: '18', editableBy: 'owner',
    label: { es: 'Calendario de redes', en: 'Social media calendar' },
    value: { es: 'Por definir con marketing: qué días se publica y quién aprueba cada publicación.', en: 'To be set with marketing: which days we post and who approves each post.' } },
];

/** Seed rows for the `studio_policies` table. Fixed rows, no RNG. */
export function buildStudioPolicies(): StudioPolicyRow[] {
  return STUDIO_POLICIES.map((p) => ({
    ...base(`spol_${p.key}`, 30), key: p.key, label: p.label, value_es: p.value.es, value_en: p.value.en,
    chapter: p.chapter, editable_by: p.editableBy, updated_by: null,
  }));
}
