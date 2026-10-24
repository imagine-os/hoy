import { digitsOf, isPhone } from '../i18n/format';
import type { DataProvider } from './types';
import type { ProfileRow, UserRow } from './schema';
import { assertAdmissionContext, type AdmissionControl } from './sessionAdmission';
import { tenant } from '../tenant/tenant';

export interface BookingContact { name: string; email: string; phone: string | null }
/** Supplied details only; format checks do not verify identity or deliver messages. */
export function validBookingContact(contact: BookingContact): boolean {
  if (typeof contact.name !== 'string' || typeof contact.email !== 'string' || typeof contact.phone !== 'string') return false;
  const email = contact.email.trim();
  return !!contact.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    && !/@sin-email\.hoyos\.test$/i.test(email) && isPhone(contact.phone ?? '')
    && digitsOf(contact.phone ?? '').length <= 15;
}
/** Same scoped rule at the mock adapter's final fresh-admission boundary. */
export function customerBookingContactValid(users: UserRow[], profiles: ProfileRow[], userId: string, tenantId: string): boolean {
  const owners = users.filter(u => u.id === userId && u.tenant_id === tenantId);
  const names = profiles.filter(p => p.user_id === userId && p.tenant_id === tenantId);
  return owners.length === 1 && names.length === 1 && owners[0].status === 'active'
    && validBookingContact({ name: names[0].full_name, email: owners[0].email, phone: owners[0].phone });
}
/** Fresh transactional reads before financial or admission writes; no historical repair. */
export async function requireExistingBookingContact(data: DataProvider, userId: string, tenantId: string = tenant.id, control: AdmissionControl = {}): Promise<void> {
  assertAdmissionContext(control);
  const users = await data.list<UserRow>('users', { where: { id: userId, tenant_id: tenantId } });
  assertAdmissionContext(control);
  const profiles = await data.list<ProfileRow>('profiles', { where: { user_id: userId, tenant_id: tenantId } });
  assertAdmissionContext(control);
  if (!customerBookingContactValid(users, profiles, userId, tenantId)) throw new Error('booking_contact_required');
}
