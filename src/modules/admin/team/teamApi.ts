import type { CosRequest } from '../../staff/desk/wire';

/**
 * AD-06 · team users on Company OS (integration guide §12 and the admin routes). Two launch roles: Front desk and
 * Administration (recipe role keys `front_desk`, `administrator`). The change applies on the person's next request:
 * `/me` reads the membership every time.
 *
 * - invite: `POST /invitations { email, roleKey, redirectUrl }`; Company OS creates the login, the membership and the
 *   sign-in invitation and hands back its link. The provider sends no email: this app sends it (`comms_log` with
 *   `deliver: true`), as §12 asks. Re-sending is safe (the newest link stays valid).
 * - change role: remove the membership, then add the new one (there is no in-place role change).
 * - remove: `DELETE /admin/memberships/:id`.
 */
export const TEAM_ROLES = ['front_desk', 'administrator'] as const;
export type TeamRoleKey = (typeof TEAM_ROLES)[number];
export interface TeamUser { userId: string; email: string; name: string | null; memberships: { membershipId: string; roleKey: string; roleName?: string }[] }

export const isTeamRole = (k: string): k is TeamRoleKey => (TEAM_ROLES as readonly string[]).includes(k);
/** Staff only: customers (`member`) are not team users and are listed in the customer list. */
export const teamMembers = (users: TeamUser[]) => users.filter(u => u.memberships.some(m => isTeamRole(m.roleKey)));
const adminCount = (users: TeamUser[]) => users.filter(u => u.memberships.some(m => m.roleKey === 'administrator')).length;

/** Refuses, before anything is sent, a change that would leave the studio without an administrator or lock the caller out. */
export function teamGuard(users: TeamUser[], target: TeamUser, next: TeamRoleKey | null, selfId: string): 'last_admin' | 'self' | null {
  if (target.userId === selfId) return 'self';
  const isAdmin = target.memberships.some(m => m.roleKey === 'administrator');
  if (isAdmin && next !== 'administrator' && adminCount(users) <= 1) return 'last_admin';
  return null;
}

export const listTeam = async (request: CosRequest) => teamMembers((await request<{ users: TeamUser[] }>('GET', '/admin/users')).users);

export async function invite(request: CosRequest, email: string, roleKey: TeamRoleKey, redirectUrl: string) {
  return request<{ userId: string; invitationId: string; url: string }>('POST', '/invitations', { email: email.trim().toLowerCase(), roleKey, redirectUrl });
}

export async function changeRole(request: CosRequest, user: TeamUser, roleKey: TeamRoleKey) {
  for (const m of user.memberships.filter(m => isTeamRole(m.roleKey) && m.roleKey !== roleKey)) await request('DELETE', `/admin/memberships/${encodeURIComponent(m.membershipId)}`);
  if (!user.memberships.some(m => m.roleKey === roleKey)) await request('POST', '/admin/users', { email: user.email, ...(user.name ? { name: user.name } : {}), roleKey });
}

export async function removeFromTeam(request: CosRequest, user: TeamUser) {
  for (const m of user.memberships.filter(m => isTeamRole(m.roleKey))) await request('DELETE', `/admin/memberships/${encodeURIComponent(m.membershipId)}`);
}

/** The invitation email: subject and body come from the strings table (ES, with EN). The link goes in the body; note
 * that the delivered `comms_log` row keeps it, readable by staff with comms read (handed over to the coordinator). */
export async function sendInvitationEmail(request: CosRequest, input: { email: string; subject: string; body: string }) {
  return request('POST', '/api/comms_log', { deliver: true, channel: 'email', address: input.email.trim().toLowerCase(), subject: input.subject, body: input.body });
}
