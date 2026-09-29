/**
 * 0044 — M-03 seed: the default views the table manager opens with, so the first visit already shows a board,
 * a gallery and a filtered grid. Built by hand (no RNG), so the shared seed stream is untouched.
 * 0045: calendar and timeline views (classes open on the week calendar; "Próximas clases" stays as a grid).
 */
import type { TableViewRow } from '../schema';
import { base } from './catalog';

const view = (id: string, table_name: string, name: TableViewRow['name'], kind: TableViewRow['kind'], config: TableViewRow['config'], is_default = false): TableViewRow =>
  ({ ...base(id, 3), table_name, name, kind, config, is_default, shared: true, created_by: 'usr_super' });

export function buildTableViews(): TableViewRow[] {
  return [
    view('tvw_bookings_board', 'bookings', { es: 'Reservas por estado', en: 'Bookings by status' }, 'kanban', { kanbanColumn: 'status', cardFields: ['session_id', 'paid_with', 'checked_in_at'] }),
    view('tvw_sessions_week', 'class_sessions', { es: 'Semana de clases', en: 'Week of classes' }, 'calendar', { dateColumn: 'starts_at', endColumn: 'ends_at', calendarMode: 'week' }, true),
    view('tvw_sessions_upcoming', 'class_sessions', { es: 'Próximas clases', en: 'Upcoming classes' }, 'grid', { filters: [{ column: 'status', op: 'is', value: 'scheduled' }], sorts: [{ column: 'starts_at', dir: 'asc' }], hiddenColumns: ['id', 'tenant_id', 'created_at', 'updated_at', 'template_id', 'cancel_reason'] }),
    view('tvw_sessions_timeline', 'class_sessions', { es: 'Semana por profesor', en: 'Week by teacher' }, 'timeline', { dateColumn: 'starts_at', endColumn: 'ends_at', groupBy: 'teacher_id', timelineZoom: 'week' }),
    view('tvw_sessions_by_teacher', 'class_sessions', { es: 'Clases por profesor', en: 'Classes by teacher' }, 'grid', { groupBy: 'teacher_id', sorts: [{ column: 'starts_at', dir: 'asc' }] }),
    view('tvw_users_gallery', 'users', { es: 'Personas', en: 'People' }, 'gallery', { cardFields: ['phone', 'status', 'last_sign_in_at'] }),
    view('tvw_payments_board', 'payments', { es: 'Pagos por estado', en: 'Payments by status' }, 'kanban', { kanbanColumn: 'status', cardFields: ['amount', 'method', 'paid_at'] }),
    view('tvw_modalities_gallery', 'modalities', { es: 'Modalidades', en: 'Modalities' }, 'gallery', { cardFields: ['tone', 'intensity', 'duration_min', 'heated'] }, true),
    view('tvw_events_month', 'events', { es: 'Eventos del mes', en: 'Events this month' }, 'calendar', { dateColumn: 'starts_at', endColumn: 'ends_at', calendarMode: 'month' }, true),
    // memberships.ends_at is empty while a membership runs; renews_at closes the paid period, so the bar reads start → renewal
    view('tvw_memberships_timeline', 'memberships', { es: 'Membresías por plan', en: 'Memberships by plan' }, 'timeline', { dateColumn: 'starts_at', endColumn: 'renews_at', groupBy: 'plan_id', timelineZoom: 'quarter' }, true),
    view('tvw_hours_calendar', 'hours_overrides', { es: 'Calendario de festivos', en: 'Holiday calendar' }, 'calendar', { dateColumn: 'start_date', endColumn: 'end_date', calendarMode: 'month' }, true),
    view('tvw_payroll_timeline', 'payroll_runs', { es: 'Nóminas en el tiempo', en: 'Payroll over time' }, 'timeline', { dateColumn: 'period_start', endColumn: 'period_end', groupBy: 'status', timelineZoom: 'quarter' }, true),
  ];
}
