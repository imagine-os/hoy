import type { BaseRow, BookingRow, ClassSessionRow } from './schema';
import type { DataProvider } from './types';
import type { VoucherBookingRow } from './vouchers';
import { isSameDay } from '../i18n/format';
import { tenant } from '../tenant/tenant';
import { assertAdmissionContext, type AdmissionControl } from './sessionAdmission';

export interface DailyAdmissionRows { bookings?: readonly BaseRow[]; voucher_bookings?: readonly BaseRow[]; class_sessions?: readonly BaseRow[] }
/** Retains the desk/reschedule status contract. Guest names/emails are never inferred account identities. */
export function dailyAdmissionConflict(rows: DailyAdmissionRows, target: ClassSessionRow, userId: string, excludeBookingId?: string): string | null {
  if (tenant.studio.perPersonPerDay !== 1) return null;
  const sameDay = (id: string) => id !== target.id && rows.class_sessions?.some(row => row.id === id && row.tenant_id === target.tenant_id && isSameDay(String(row.starts_at), target.starts_at));
  const regular = rows.bookings?.find(row => row.tenant_id === target.tenant_id && row.id !== excludeBookingId && row.user_id === userId
    && ['booked', 'checked_in', 'no_show'].includes(String(row.status)) && sameDay(String(row.session_id)));
  if (regular) return String(regular.session_id);
  const voucher = (rows.voucher_bookings as readonly VoucherBookingRow[] | undefined)?.find(row => row.tenant_id === target.tenant_id && row.status !== 'cancelled'
    && row.participants.some(person => person.userId === userId) && sameDay(row.sessionId));
  return voucher?.sessionId ?? null;
}

/** Same-session duplicates keep precedence over other daily conflicts. */
export function identifiedSessionAdmission(rows: DailyAdmissionRows, target: ClassSessionRow, userId: string, excludeBookingId?: string): boolean {
  return !!rows.bookings?.some(row => row.tenant_id === target.tenant_id && row.id !== excludeBookingId && row.user_id === userId && row.session_id === target.id && ['booked', 'checked_in', 'no_show'].includes(String(row.status)))
    || !!(rows.voucher_bookings as readonly VoucherBookingRow[] | undefined)?.some(row => row.tenant_id === target.tenant_id && row.sessionId === target.id && row.status !== 'cancelled' && row.participants.some(person => person.userId === userId));
}

/** Fresh scoped transaction reads, fenced after every await. Browser-only; production needs an authorized RPC. */
export async function requireDailyAdmission(data: DataProvider, target: ClassSessionRow, userId: string, control: AdmissionControl = {}, excludeBookingId?: string): Promise<void> {
  assertAdmissionContext(control);
  if (target.tenant_id !== tenant.id) throw new Error('session_unavailable');
  if (tenant.studio.perPersonPerDay !== 1) return;
  const rows: DailyAdmissionRows = {};
  for (const table of ['bookings', 'voucher_bookings', 'class_sessions'] as const) {
    rows[table] = await data.list<BookingRow>(table, { where: { tenant_id: target.tenant_id } });
    assertAdmissionContext(control);
  }
  if (identifiedSessionAdmission(rows, target, userId, excludeBookingId)) throw new Error('booking_exists');
  if (dailyAdmissionConflict(rows, target, userId, excludeBookingId)) throw new Error('same_day_conflict');
}
