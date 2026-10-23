import type { BaseRow, BookingRow, ClassSessionRow, MessageLogRow, ModalityRow, PaymentRow, ProfileRow, TeacherRow } from '../../data/schema';
import type { DataProvider } from '../../data/types';
import { isSameDay } from '../../i18n/format';
import { entryMatches, projectQueue, type QueueSnapshot } from '../transfers/pendingQueue';

export const homeTables = ['class_sessions', 'modalities', 'teachers', 'bookings', 'waitlist', 'payments', 'audit_log', 'profiles', 'message_log', 'transfer_receipts', 'plans'] as const;
export type HomeSnapshot = Record<typeof homeTables[number], BaseRow[]>;
export const emptyHome = (): HomeSnapshot => Object.fromEntries(homeTables.map(table => [table, [] as BaseRow[]])) as HomeSnapshot;
/** All required reads succeed together. Defend against a provider ignoring the tenant query. */
export async function readHome(data: DataProvider, tenantId: string, payments: boolean, members: boolean): Promise<HomeSnapshot> {
  const tables = homeTables.filter(table => (payments || !['payments', 'transfer_receipts', 'plans'].includes(table)) && (members || table !== 'message_log'));
  const rows = await Promise.all(tables.map(async table => [table, (await data.list(table, { where: { tenant_id: tenantId } })).filter(row => row.tenant_id === tenantId)] as const));
  return { ...emptyHome(), ...Object.fromEntries(rows) };
}

export function projectHome(snapshot: HomeSnapshot, tenantId: string, now: Date) {
  const scoped = <T extends BaseRow>(table: typeof homeTables[number]) => snapshot[table].filter(row => row.tenant_id === tenantId) as T[];
  const modalities = scoped<ModalityRow>('modalities'), teachers = scoped<TeacherRow>('teachers');
  // Match Check-in's whole-day noncancelled roster, including completed classes.
  const todayAll = scoped<ClassSessionRow>('class_sessions').filter(s => s.status !== 'cancelled' && isSameDay(s.starts_at, now))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(session => ({ session, modality: modalities.find(m => m.id === session.modality_id), teacher: teachers.find(t => t.id === session.teacher_id) }));
  const today = todayAll.filter(x => x.session.status === 'scheduled');
  const ids = new Set(todayAll.map(x => x.session.id));
  const bookings = scoped<BookingRow>('bookings').filter(b => ids.has(b.session_id));
  const payments = scoped<PaymentRow>('payments');
  const pending = projectQueue({ payments, receipts: scoped('transfer_receipts'), profiles: scoped('profiles'), plans: scoped('plans') } as QueueSnapshot, tenantId).filter(entry => entryMatches(entry, 'pending')).length;
  return { todayAll, today, next: today.find(x => Date.parse(x.session.ends_at) > now.getTime()),
    arrivals: bookings.filter(b => b.status === 'checked_in').length, expected: bookings.filter(b => b.status === 'booked').length,
    openShifts: today.filter(x => Date.parse(x.session.starts_at) > now.getTime()).length,
    paidToday: payments.filter(p => p.status === 'approved' && p.paid_at && isSameDay(p.paid_at, now)).reduce((sum, p) => sum + p.amount, 0), pending,
    waitlist: scoped('waitlist').filter(w => w.status === 'waiting'), profiles: scoped<ProfileRow>('profiles'), messages: scoped<MessageLogRow>('message_log'),
  };
}
