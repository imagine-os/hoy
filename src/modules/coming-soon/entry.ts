import { superAdminTab } from '../../auth/superAdminTab';
import type { SessionCtx } from '../../auth/sessionContext';

/**
 * `/coming-soon` is a Hub surface (W-11). Before go-live it is the public landing page, for everyone. Once the site is
 * live, in production, the Super Admin still sees it (the Hub's own rule, `superAdminTab`, so viewing as another role
 * keeps it) and anyone else goes to the site. The review build is unchanged.
 * - `loading`: wait, or the Super Admin would be sent away before `/me` answers.
 * - `error` (a failed /me or Clerk): the site, which works signed out. The Super Admin can come back; a visitor must not
 *   be left on a blank or out-of-date page.
 */
export type ComingSoonEntry = 'show' | 'wait' | 'redirect';

export function comingSoonEntry({ production, live, session }: { production: boolean; live: boolean; session: Pick<SessionCtx, 'status' | 'signedIn' | 'isSuperAdmin' | 'viewAs'> }): ComingSoonEntry {
  if (!production || !live) return 'show';
  if (superAdminTab(session) === 'allowed') return 'show';
  return session.status === 'loading' ? 'wait' : 'redirect';
}
