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
    value: { es: 'Un socio de Membresía puede traer un invitado; el invitado se registra y ocupa un tapete real de la sala.', en: 'A Membership member may bring a guest; the guest is registered and takes a real mat in the room.' } },
  { key: 'quiet_hours_note', chapter: '13', editableBy: 'owner',
    label: { es: 'Horas silenciosas: qué significa', en: 'Quiet hours: what they mean' },
    value: { es: 'Entre esas horas no se envía nada que no sea urgente (una clase cancelada sí se avisa).', en: 'Nothing that is not urgent is sent between those hours (a cancelled class is still announced).' } },
];

/** Seed rows for the `studio_policies` table. Fixed rows, no RNG. */
export function buildStudioPolicies(): StudioPolicyRow[] {
  return STUDIO_POLICIES.map((p) => ({
    ...base(`spol_${p.key}`, 30), key: p.key, label: p.label, value_es: p.value.es, value_en: p.value.en,
    chapter: p.chapter, editable_by: p.editableBy, updated_by: null,
  }));
}
