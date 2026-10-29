import type { CosRequest } from '../../staff/desk/wire';

/**
 * AD-06 · team users on Company OS (integration guide §12 and the admin routes). Two launch roles: Front desk and
 * Administration (recipe role keys `front_desk`, `administrator`). The change applies on the person's next request:
 * `/me` reads the membership every time.
 *
 * - invite: `POST /invitations { email, roleKey, redirectUrl }`; Company OS creates the login, the membership and the
 *   sign-in invitation and hands back its link. The provider sends no email: this app sends it (`comms_log` with
 *   `deliver: true`), as §12 asks. Re-sending is safe (the newest link stays valid).
 * - re-send: the same `POST /invitations` (the membership is reused; the link created last stays valid, and a failed
 *   re-send leaves the earlier link working). Company OS refuses it (`role_mismatch`) for a login holding any other
 *   role, so for Administration the `super_admin` membership is set aside for the call and added back after it.
 * - change role: add the new membership first, then remove the old ones (there is no in-place role change), so a
 *   failure half-way leaves the person with too much access for a retry to fix, never with none
 *   (`PartialTeamChange`: the screen says so and offers the retry).
 * - remove: `DELETE /admin/memberships/:id`.
 *
 * Administration also holds the tenant `super_admin` membership (decision AD-04): Company OS reads `isSuperAdmin` from a
 * membership with that key, and the team, invitation and module-settings routes need it. So making someone
 * Administration adds both, and demoting or removing them deletes both. A `super_admin` alone counts as Administration.
 */
export const TEAM_ROLES = ['front_desk', 'administrator'] as const;
export type TeamRoleKey = (typeof TEAM_ROLES)[number];
export interface TeamUser { userId: string; email: string; name: string | null; memberships: { membershipId: string; roleKey: string; roleName?: string }[] }

export const SUPER_ADMIN = 'super_admin';
export const isTeamRole = (k: string): k is TeamRoleKey => (TEAM_ROLES as readonly string[]).includes(k);
/** The membership keys each team role holds. */
const KEYS_OF: Record<TeamRoleKey, string[]> = { front_desk: ['front_desk'], administrator: ['administrator', SUPER_ADMIN] };
const isStaffKey = (k: string) => isTeamRole(k) || k === SUPER_ADMIN;
const isAdmin = (u: TeamUser) => u.memberships.some(m => m.roleKey === 'administrator' || m.roleKey === SUPER_ADMIN);
/** The team role shown for a user: Administration when they hold `administrator` or `super_admin`. */
export const teamRoleOf = (u: TeamUser): TeamRoleKey | null => (isAdmin(u) ? 'administrator' : u.memberships.some(m => m.roleKey === 'front_desk') ? 'front_desk' : null);
/** Staff only: customers (`member`) are not team users and are listed in the customer list. */
export const teamMembers = (users: TeamUser[]) => users.filter(u => u.memberships.some(m => isStaffKey(m.roleKey)));
export const adminCount = (users: TeamUser[]) => users.filter(isAdmin).length;

/** Refuses, before anything is sent, a change that would leave the studio without an administrator or lock the caller out. */
export function teamGuard(users: TeamUser[], target: TeamUser, next: TeamRoleKey | null, selfId: string): 'last_admin' | 'self' | null {
  if (target.userId === selfId) return 'self';
  if (isAdmin(target) && next !== 'administrator' && adminCount(users) <= 1) return 'last_admin';
  return null;
}

export const listTeam = async (request: CosRequest) => teamMembers((await request<{ users: TeamUser[] }>('GET', '/admin/users')).users);

const code = (e: unknown) => (e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : '');
/** `POST /admin/users` answers 409 "user already has this role in this scope" for a membership that exists: that is the goal. */
async function addMembership(request: CosRequest, email: string, name: string | null, roleKey: string) {
  try { await request('POST', '/admin/users', { email, ...(name ? { name } : {}), roleKey }); }
  catch (e) { if (!code(e).startsWith('user_already_has_this_role')) throw e; }
}

/**
 * - `invited`: a new login; the caller emails `url`.
 * - `added`: the address already had a login with another role here (a customer): `409 role_mismatch`, so the role is
 *   added with `POST /admin/users`. No email is sent; they sign in with their usual account.
 * - `signed_up`: `409 already_signed_up`: the role is in place, Company OS sent no invitation; they can sign in now.
 */
export type InviteResult = { kind: 'invited'; url: string } | { kind: 'added' } | { kind: 'signed_up' } | { kind: 'has_account' };

/**
 * A team write that stopped after its first step: `changeRole` added the new role but could not remove an old one
 * (they now hold both) or could not add the role's second membership (`incomplete`: Administration without
 * `super_admin`), or `removeFromTeam` removed only part of the access. Running the same action again finishes it.
 */
export class PartialTeamChange extends Error {
  constructor(readonly step: 'role_added' | 'incomplete' | 'partly_removed', readonly cause: unknown) { super(step); this.name = 'PartialTeamChange'; }
}
/** The invitation exists but an Administration login is missing `super_admin`: the list offers "Completar acceso". */
export type InviteOutcome = InviteResult & { repair?: boolean };

export async function invite(request: CosRequest, rawEmail: string, roleKey: TeamRoleKey, redirectUrl: string): Promise<InviteOutcome> {
  const email = rawEmail.trim().toLowerCase();
  let result: InviteResult;
  try {
    const res = await request<{ userId: string; invitationId: string; url: string }>('POST', '/invitations', { email, roleKey, redirectUrl });
    result = { kind: 'invited', url: res.url };
  } catch (e) {
    if (code(e) === 'role_mismatch') { await addMembership(request, email, null, roleKey); result = { kind: 'added' }; }
    else if (code(e) === 'already_signed_up') result = { kind: 'signed_up' };
    else {
      // `502 invitation_failed`: the login and membership were committed; complete Administration before reporting it.
      if (code(e) === 'invitation_failed' && roleKey === 'administrator') await addMembership(request, email, null, SUPER_ADMIN);
      throw e;
    }
  }
  // After the invitation: `/invitations` refuses (role_mismatch) a login already holding `super_admin`. The invitation
  // exists by now, so a failure here doesn't hide its link: the caller still emails it and the list offers the repair.
  if (roleKey === 'administrator') {
    try { await addMembership(request, email, null, SUPER_ADMIN); } catch { return { ...result, repair: true }; }
  }
  return result;
}

/**
 * Re-sends a listed team user's invitation (integration guide §12). `already_signed_up` means they have an account and
 * can sign in; `role_mismatch` (`has_account`) means the login holds another role (a customer account), so they sign in
 * with it. Open for Company OS: `/invitations` could accept `super_admin` beside `administrator`, so nothing is set aside.
 */
export async function resendInvitation(request: CosRequest, user: TeamUser, redirectUrl: string): Promise<InviteOutcome> {
  const roleKey = teamRoleOf(user);
  if (!roleKey) throw Object.assign(new Error('not_on_team'), { code: 'not_on_team' });
  const email = user.email.trim().toLowerCase();
  let setAside = 0;
  /**
   * Gives `super_admin` back only when this call took it and the person is still Administration, read afresh: another
   * administrator may have demoted or removed them meanwhile, and that decision must stand. `false` = it needs repair.
   */
  const restore = async (): Promise<boolean> => {
    if (roleKey !== 'administrator') return true;
    try {
      const now = (await request<{ users: TeamUser[] }>('GET', '/admin/users')).users.find(u => u.userId === user.userId);
      if (!now?.memberships.some(m => m.roleKey === 'administrator')) return true; // no longer Administration: nothing to give back
      if (!setAside && now.memberships.some(m => m.roleKey === SUPER_ADMIN)) return true;
      await addMembership(request, email, user.name, SUPER_ADMIN);
      return true;
    } catch { return false; }
  };
  let result: InviteResult;
  try {
    for (const m of roleKey === 'administrator' ? user.memberships.filter(m => m.roleKey === SUPER_ADMIN) : []) {
      await request('DELETE', `/admin/memberships/${encodeURIComponent(m.membershipId)}`);
      setAside++;
    }
    const res = await request<{ userId: string; invitationId: string; url: string }>('POST', '/invitations', { email, roleKey, redirectUrl });
    result = { kind: 'invited', url: res.url };
  } catch (e) {
    if (code(e) === 'already_signed_up') result = { kind: 'signed_up' };
    else if (code(e) === 'role_mismatch') result = { kind: 'has_account' };
    else {
      const ok = await restore();
      throw ok ? e : Object.assign(e as object, { repair: true });
    }
  }
  // Administration holds `super_admin` again afterwards (also when it was missing: the resend repairs it).
  return (await restore()) ? result : { ...result, repair: true };
}

/** A team user missing one of their role's memberships (an Administration without `super_admin`): `changeRole` repairs it. */
export const needsRepair = (u: TeamUser) => { const role = teamRoleOf(u); return !!role && KEYS_OF[role].some(k => !u.memberships.some(m => m.roleKey === k)); };

export async function changeRole(request: CosRequest, user: TeamUser, roleKey: TeamRoleKey) {
  const keep = KEYS_OF[roleKey];
  let wrote = false; // something was written already: a later failure is half-applied, not "nothing changed"
  const step = async (failed: PartialTeamChange['step'], work: () => Promise<unknown>) => {
    try { await work(); wrote = true; } catch (e) { throw wrote ? new PartialTeamChange(failed, e) : e; }
  };
  for (const k of keep) if (!user.memberships.some(m => m.roleKey === k)) await step('incomplete', () => addMembership(request, user.email, user.name, k));
  for (const m of user.memberships.filter(m => isStaffKey(m.roleKey) && !keep.includes(m.roleKey))) await step('role_added', () => request('DELETE', `/admin/memberships/${encodeURIComponent(m.membershipId)}`));
}

export async function removeFromTeam(request: CosRequest, user: TeamUser) {
  let removed = 0;
  for (const m of user.memberships.filter(m => isStaffKey(m.roleKey))) {
    try { await request('DELETE', `/admin/memberships/${encodeURIComponent(m.membershipId)}`); removed++; }
    catch (e) { if (removed) throw new PartialTeamChange('partly_removed', e); throw e; }
  }
}

/** Where an invitation lands: sign-in, then the role's home (the server compares the origin only). */
export const inviteRedirect = (origin: string, roleKey: TeamRoleKey) => `${origin}/#/auth/sign-in?next=${roleKey === 'administrator' ? '/admin' : '/staff'}`;

/** The invitation email: subject and body come from the strings table (ES, with EN). The link goes in the body; note
 * that the delivered `comms_log` row keeps it, readable by staff with comms read (handed over to the coordinator). */
export async function sendInvitationEmail(request: CosRequest, input: { email: string; subject: string; body: string }) {
  return request('POST', '/api/comms_log', { deliver: true, channel: 'email', address: input.email.trim().toLowerCase(), subject: input.subject, body: input.body });
}
