import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

const base = canvasSpecs['S-03'];
const data = ['teachers', 'class_sessions', 'bookings', 'modalities', 'users', 'profiles', 'audit_log'];

/** S-03 teacher home. */
export const S03 = defineSpec({
  ...base,
  layout: ['NextClassCard', 'TodayClasses (roster count)', 'ScheduleList (week)', 'SubstitutionRequest', 'PayrollTile'],
  data,
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

/** /teach/payroll — classes × rate, placeholder until Wompi payroll. */
export const S03Payroll = defineSpec({
  ...base,
  name: { es: 'Nómina', en: 'Payroll' },
  purpose: { es: 'Clases dictadas por mes × tarifa por clase, solo lectura.', en: 'Classes taught per month × per-class rate, read-only.' },
  layout: ['MonthPicker', 'SummaryTiles', 'PayrollLines', 'WompiPlaceholder'],
  data: ['teachers', 'class_sessions', 'bookings', 'modalities'],
  integrations: ['Wompi'],
  states: ['Payroll pending: run closes on the 15th', 'No classes this month'],
  notes: ['Rate is teachers.rate_per_class; substitutions are sessions whose template teacher differs.', 'Placeholder until Wompi payroll runs exist.'],
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
