import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

const base = canvasSpecs['S-03'];
const data = ['teachers', 'class_sessions', 'bookings', 'modalities', 'users', 'profiles', 'audit_log'];

/** S-03 teacher home. */
export const S03 = defineSpec({
  ...base,
  layout: ['NextClassCard', 'TodayClasses (roster count)', 'Specials (own space_bookings, S-05)', 'ScheduleList (week)', 'SubstitutionRequest', 'PayrollTile'],
  data: [...data, 'space_bookings', 'special_charges', 'rooms'],
  notes: [...(base.notes ?? []), 'Mobile-first inside PhoneShell.', 'Substitution requests are written to audit_log (action substitution.request) for the coordinator.'],
});

/** /teach/class/:id — roster, attendance, notes. */
export const S03Class = defineSpec({
  ...base,
  name: { es: 'Clase · lista y asistencia', en: 'Class · roster & attendance' },
  purpose: { es: 'Marcar asistencia desde el mat y dejar notas de la clase.', en: 'Mark attendance from the mat and leave class notes.' },
  layout: ['ClassHeader', 'AttendanceWindow', 'RosterSheet → attendance marks', 'ReviewSummary (read-only)', 'ClassNotes'],
  data: [...data, 'reviews'],
  states: ['Attendance open (T−15m … T+2h)', 'Attendance locked: read-only with reason', 'Coordinator override', 'Class not found'],
  notes: ['Marks write bookings.status (checked_in / no_show) and an audit_log row.', 'Notes are audit_log rows (action session.note) so they appear in M-07.', 'Reviews are read-only here: the average, count and tags of the `reviews` rows for this session (C-10). Anonymous reviews never show who wrote them.'],
});

/** /teach/payroll — the teacher's own statement, from payroll_runs / payroll_lines. */
export const S03Payroll = defineSpec({
  ...base,
  name: { es: 'Nómina', en: 'Payroll' },
  purpose: { es: 'El extracto del profesor: clases dictadas × tarifa del mes, el desglose por clase, el historial de corridas y cómo preguntar por un monto.', en: 'The teacher’s statement: classes taught × rate for the month, the per-class breakdown, the run history and how to ask about an amount.' },
  layout: ['MonthPicker', 'RunStateCard (borrador / aprobada / pagada / estimado)', 'SummaryTiles (clases, tarifa, total)', 'Breakdown (fecha, clase, asistentes, monto)', 'ExtrasLines (bono, ajuste, Especial)', 'PayoutMethodCard', 'RunHistory', 'PrintStatement + AskFinance (WhatsApp)'],
  data: ['payroll_runs', 'payroll_lines', 'special_charges', 'teachers', 'class_sessions', 'bookings', 'class_templates', 'payment_methods', 'tenants'],
  integrations: ['Wompi', 'WhatsApp'],
  logic: [
    'Before finance generates the run, the month is computed live from completed sessions × teachers.rate_per_class (src/data/payrollCalc.ts) and labelled as an estimate.',
    'Once a payroll_runs row covers the period, the page reads payroll_lines instead — so what the teacher sees is what finance will pay, bonuses and adjustments included.',
    'A line of kind manual is a teacher payout agreed on an Especial (special_charges.teacher_payout, S-04); it prints as "Especial: <concept>" here and in M-09b (0017).',
    'A substitution is a session whose template teacher differs from the session teacher; it is a badge, not a different rate.',
    'The payout method on file comes from payment_methods for the teacher’s user; the method of the run itself is shown next to it.',
    '“Ask about this statement” opens WhatsApp to the studio contact from M-08 with the period and total prefilled.',
  ],
  states: ['Estimate (no run yet)', 'Draft run', 'Approved run', 'Paid run (with date)', 'No classes this month', 'Substitutions present', 'Negative adjustment', 'No payout method on file', 'Not linked to a teacher profile'],
  notes: [
    'Read-only by design: only finance writes payroll (M-09a/M-09b).',
    'The Wompi dispersion is simulated (wompiPayout() in src/modules/admin/payouts.ts); the page says so instead of pretending money moved.',
  ],
});

/** /teach/profile — public profile editor. */
export const S03Profile = defineSpec({
  ...base,
  name: { es: 'Mi perfil', en: 'My profile' },
  purpose: { es: 'Foto, bio en dos idiomas y especialidades; los cambios pasan por coordinación.', en: 'Photo, bilingual bio and specialties; changes go through the coordinator.' },
  layout: ['PhotoAndName', 'BioEditor ES / EN', 'Specialties', 'RateReadOnly'],
  data: ['teachers', 'modalities', 'audit_log'],
  states: ['Saved: sent for review', 'Not linked to a teacher profile'],
  notes: ['Edits update teachers and write audit_log teacher.profile.submit.'],
});
