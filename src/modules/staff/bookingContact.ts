import { digitsOf, isPhone } from '../../i18n/format';
import type { DataProvider } from '../../data/types';
import type { ProfileRow, UserRow } from '../../data/schema';

export interface BookingContact { name: string; email: string; phone: string | null }
/** Supplied contact details only; this does not verify identity or deliver messages. */
export function validBookingContact(contact: BookingContact): boolean {
  const email = contact.email.trim();
  return !!contact.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    && !/@sin-email\.hoyos\.test$/i.test(email) && isPhone(contact.phone ?? '')
    && digitsOf(contact.phone ?? '').length <= 15;
}
/** Re-read before any staged sale writes; never repair historical customer records implicitly. */
export async function requireExistingBookingContact(data: DataProvider, userId: string, tenantId: string): Promise<void> {
  const users = (await data.list<UserRow>('users', { where: { id: userId, tenant_id: tenantId } })).filter(u => u.id === userId && u.tenant_id === tenantId);
  const profiles = (await data.list<ProfileRow>('profiles', { where: { user_id: userId, tenant_id: tenantId } })).filter(p => p.user_id === userId && p.tenant_id === tenantId);
  if (users.length !== 1 || profiles.length !== 1 || !validBookingContact({ name: profiles[0].full_name, email: users[0].email, phone: users[0].phone })) throw new Error('booking_contact_required');
}
