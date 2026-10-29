import { lazyPages } from '../../app/lazyPage';
import { defineSpec } from '../../specs/define';
import type { RouteDef } from '../../specs/types';
import type { StringTable } from '../../i18n/types';
import { PRODUCTION_BUILD } from '../../config/launch';

const page = lazyPages(() => import('./pages'));

export const bookingPoliciesSpec = defineSpec({
  code: 'M-20', name: { es: 'Reglas de reserva', en: 'Booking rules' },
  purpose: { es: 'Editar minutos de apartado, ventana para mover reservas y cancelación tardía.', en: 'Edit hold minutes, the move window and the late-cancel window.' },
  roles: ['super_admin', 'admin'], layout: ['Future-only notice', 'Holds and windows'],
  data: ['bookings'],
  logic: ['AD-04 / J1b: Company OS bookings settings through PATCH /modules/bookings/settings (ADR 0038).', 'Only changed keys are sent; the server validates again (invalid_settings). Reception hours and closed dates are H-7\'s panel on the same route.', 'With policy_as_of_booking each new booking keeps a copy, so a change applies to future bookings only.'],
  integrations: ['Company OS bookings 1.4.0 settings route (tenant Super Admin; Hoy Administration staff hold it, owner 2026-10-28)'],
  states: ['loading', 'read error with retry', 'editing', 'validation error', 'saving', 'saved', 'forbidden'],
});

/** AD-04 runs on Company OS only: the production build. The review build keeps the hours screen in admin settings. */
export const routes: RouteDef[] = PRODUCTION_BUILD ? [
  { path: '/admin/settings/booking-policies', element: page('BookingPoliciesPage'), spec: bookingPoliciesSpec, roles: bookingPoliciesSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'bookingPolicies.title', icon: 'settings', order: 17.2, group: 'core.nav.group.system' } },
] : [];

export const strings: StringTable = {
  'bookingPolicies.title': { es: 'Reglas de reserva', en: 'Booking rules' },
  'bookingPolicies.futureOnly': { es: 'Los cambios aplican solo a reservas nuevas; las existentes conservan sus reglas.', en: 'Changes apply to new bookings only; existing ones keep their rules.' },
  'bookingPolicies.copiesOff': { es: 'La copia de reglas por reserva está apagada en el servidor: un cambio afectaría también reservas existentes.', en: 'Per-booking rule copies are off on the server: a change would also affect existing bookings.' },
  'bookingPolicies.transfer': { es: 'Minutos de apartado por transferencia', en: 'Transfer hold minutes' },
  'bookingPolicies.desk': { es: 'Minutos de espera para pagar en recepción', en: 'Minutes to pay at the desk' },
  'bookingPolicies.reschedule': { es: 'Horas antes de la clase para mover una reserva (0 = no se puede)', en: 'Hours before class to move a booking (0 = not allowed)' },
  'bookingPolicies.lateCancel': { es: 'Horas antes de la clase para cancelación tardía', en: 'Late-cancel hours before class' },
  'bookingPolicies.hoursElsewhere': { es: 'El horario de recepción y los días cerrados se editan en Configuración › Horarios.', en: 'Reception hours and closed dates are edited in Settings › Hours.' },
  'bookingPolicies.superAdminOnly': { es: 'Solo un Super Admin del estudio puede cambiar estas reglas.', en: 'Only a studio Super Admin can change these rules.' },
  'bookingPolicies.save': { es: 'Guardar reglas', en: 'Save rules' },
  'bookingPolicies.saved': { es: 'Reglas guardadas. Aplican a reservas nuevas.', en: 'Rules saved. They apply to new bookings.' },
  'bookingPolicies.error.transfer': { es: 'Minutos por transferencia: entero de 1 a 1440.', en: 'Transfer minutes: whole number 1–1440.' },
  'bookingPolicies.error.desk': { es: 'Minutos en recepción: entero de 1 a 1440.', en: 'Desk minutes: whole number 1–1440.' },
  'bookingPolicies.error.reschedule': { es: 'Horas para mover: entero de 0 a 168.', en: 'Move hours: whole number 0–168.' },
  'bookingPolicies.error.lateCancel': { es: 'Horas de cancelación tardía: entero de 0 a 168.', en: 'Late-cancel hours: whole number 0–168.' },
};
