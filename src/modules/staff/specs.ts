import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

/** S-01 role home — live numbers and the two counter actions. */
export const S01 = defineSpec({
  ...canvasSpecs['S-01'],
  layout: ['RoleBadge + KPIRow', 'NextClassCard', 'TodayList', 'QuickActions (check-in · register · rooms S-05)', 'AuditNotice (recent activity)'],
  data: ['class_sessions', 'bookings', 'waitlist', 'payments', 'audit_log', 'teachers'],
  notes: [...(canvasSpecs['S-01'].notes ?? []), 'Live: subscribes to bookings and class_sessions through useTable.'],
});

/** S-02 door / check-in — sections are the layout-editor keys. */
export const S02 = defineSpec({
  ...canvasSpecs['S-02'],
  // Canvas audit #26: no scanner — the door is a person with a search box, so the scan API and face templates are dropped.
  api: (canvasSpecs['S-02'].api ?? []).filter((a) => !/scan|face/i.test(a)),
  logic: (canvasSpecs['S-02'].logic ?? []).filter((l) => !/face.template/i.test(l)),
  layout: ['TodayStrip (now / next / later)', 'MemberSearch + CapacityMeter', 'RosterList (expected / checked in / waitlist)', 'TeachersInToday', 'QuickSell (walk-in)'],
  data: ['class_sessions', 'bookings', 'waitlist', 'users', 'profiles', 'memberships', 'plans', 'teachers', 'modalities', 'audit_log', 'tenants'],
  states: [...(canvasSpecs['S-02'].states ?? []).filter((s) => !/scan/i.test(s)), 'No classes today: empty strip', 'Loading roster', 'No permission: roster read-only'],
  notes: [...(canvasSpecs['S-02'].notes ?? []), 'Late = checked in after starts_at + policies.lateGraceMin (M-08).', 'Keyboard: / focuses search, Enter checks in the first expected match, Esc clears.', 'Capacity comes from the session row (seeded from tenant.studio.mats).'],
});

/** S-04 register & take payment. */
export const S04 = defineSpec({
  ...canvasSpecs['S-04'],
  layout: ['Step1 · Who (new / existing)', 'Step2 · What (pricing.ts)', 'Step3 · How they pay', 'SummaryRail (IVA + total)', 'Receipt'],
  data: ['users', 'profiles', 'user_roles', 'consents', 'payments', 'invoices', 'memberships', 'credits', 'bookings', 'class_sessions', 'message_log', 'audit_log', 'tenants'],
  states: [...(canvasSpecs['S-04'].states ?? []), 'No permission: form read-only', 'Sale complete: receipt view'],
  notes: [...(canvasSpecs['S-04'].notes ?? []), 'Prices only from src/tenant/pricing.ts; IVA from M-08 tax settings.', 'Wompi link is a placeholder: payment stays pending until the gateway confirms.'],
});

/** S-05 rooms — the day of every room; classes and space bookings side by side (Especiales, 0017). */
export const S05 = defineSpec({
  code: 'S-05',
  name: { es: 'Salas y reservas de espacio', en: 'Rooms & space bookings' },
  purpose: { es: 'Ver cada sala por día con sus clases y sus reservas de espacio, reservar una ventana para un evento privado, alquiler, clase privada, mantenimiento o bloqueo, y confirmar, cancelar o cerrar la reserva.', en: 'See every room by day with its classes and space bookings, book a window for a private event, rental, private class, maintenance or a block, and confirm, cancel or close the booking.' },
  layout: ['DateStrip', 'DayGrid', 'BookingForm', 'Selected', 'UpcomingList'],
  data: ['rooms', 'class_sessions', 'space_bookings', 'special_charges', 'teachers', 'modalities', 'users', 'profiles', 'audit_log'],
  roles: ['super_admin', 'admin', 'coordinator', 'front_desk'],
  logic: [
    'A room is taken by a scheduled class or by a space booking that is not cancelled; two windows conflict when they overlap for more than zero minutes (src/modules/staff/rooms.ts findConflicts). The form refuses an overlapping window and lists what is in the way.',
    'Statuses: held (quoted, no deposit — dashed block) → confirmed → done; cancelled at any point frees the room. Each transition writes an audit_log row (space_booking.<status>).',
    'Booking and charging are two acts: "Cobrar" opens S-04 with ?booking=<id>, which sells an Especial and links it back (special_charge_id) while confirming the booking. S-04 can also create the booking inside the sale.',
    'A teacher on a booking is paid through the Especial (special_charges.teacher_payout → payroll_lines kind manual), never here.',
    'bookings.write_any gates every write; the rest of the page is read-only for other staff.',
  ],
  integrations: [],
  states: ['Loading', 'No rooms', 'Empty day', 'Day with classes only', 'Held / confirmed / done / cancelled blocks', 'Cancelled hidden by default (toggle)', 'Conflict: CTA disabled with the list of what overlaps', 'Read-only (no bookings.write_any)', 'Selected class → open check-in', 'Selected booking → confirm / done / cancel / charge'],
  notes: ['Sections: DateStrip (14 days + any date) · DayGrid (rooms × hours: class_sessions + space_bookings) · BookingForm (kind, room, window, title, who, teacher, note, conflict check) · Selected (status actions, Cobrar → S-04) · UpcomingList.', 'Rooms come from the rooms table (seed: Sala principal + Sala de meditación); the grid draws as many columns as there are rows.', 'The hour range widens to fit the blocks; 06–21 is only the display default, not a studio fact.'],
});
