import type { BaseRow, MembershipRow, PlanRow, ProfileRow, UserRow } from '../../data/schema';
import type { DataProvider } from '../../data/types';
import type { Person } from './people';

export const receptionPeopleTables = ['users', 'profiles', 'user_roles', 'memberships', 'plans'] as const;
export type ReceptionPeopleRows = Record<typeof receptionPeopleTables[number], BaseRow[]>;
export const emptyReceptionPeople = (): ReceptionPeopleRows => ({ users: [], profiles: [], user_roles: [], memberships: [], plans: [] });
export const hasReceptionTenant = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0;

/** This is a frontend scope guard; production providers must enforce authorization too. */
export async function readReceptionPeople(data: DataProvider, tenantId: string | null | undefined): Promise<ReceptionPeopleRows> {
  if (!hasReceptionTenant(tenantId)) return emptyReceptionPeople();
  const rows = await Promise.all(receptionPeopleTables.map(async table => [table, await data.list(table, { where: { tenant_id: tenantId } })] as const));
  return Object.fromEntries(rows) as ReceptionPeopleRows;
}

/** Scope every side of the join, including providers/snapshots that ignore query filters. */
export function projectReceptionPeople(rows: ReceptionPeopleRows, tenantId: string | null | undefined): Person[] {
  if (!hasReceptionTenant(tenantId)) return [];
  const scoped = <T extends BaseRow>(table: typeof receptionPeopleTables[number]) => rows[table].filter(row => row.tenant_id === tenantId) as T[];
  const profiles = new Map(scoped<ProfileRow & { birthday?: string | null; notes?: string | null }>('profiles').map(p => [p.user_id, p]));
  const roles = new Map(scoped<BaseRow & { user_id: string; role: string }>('user_roles').map(r => [r.user_id, r.role]));
  const memberships = new Map(scoped<MembershipRow>('memberships').filter(m => ['active', 'paused', 'past_due'].includes(m.status)).map(m => [m.user_id, m]));
  const plans = new Map(scoped<PlanRow>('plans').map(p => [p.id, p]));
  return scoped<UserRow>('users').map(u => {
    const profile = profiles.get(u.id), membership = memberships.get(u.id), name = profile?.full_name ?? u.email;
    return { id: u.id, name, initials: profile?.initials ?? name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase(), email: u.email, phone: u.phone,
      // A missing scoped role must not promote a foreign/malformed role into a customer candidate.
      role: roles.get(u.id) ?? '', profileId: profile?.id ?? null, birthday: profile?.birthday ?? null, notes: profile?.notes ?? null,
      marketingOptin: !!profile?.marketing_optin, whatsappVerified: !!profile?.whatsapp_verified, createdAt: u.created_at,
      membership, plan: membership ? plans.get(membership.plan_id) : undefined };
  });
}

const foldName = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** Text stays text: only phone-shaped queries participate in digit normalization. */
export function receptionPersonMatches(person: Pick<Person, 'name' | 'phone' | 'email'>, query: string): boolean {
  const text = query.trim();
  if (!text) return true;
  if (foldName(person.name).includes(foldName(text)) || person.email.toLowerCase().includes(text.toLowerCase())) return true;
  if (!/^[+\d\s().-]+$/.test(text)) return false;
  const digits = text.replace(/\D/g, '');
  return digits.length > 0 && (person.phone ?? '').replace(/\D/g, '').includes(digits);
}
