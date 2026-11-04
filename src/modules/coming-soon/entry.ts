import { superAdminTab } from '../../auth/superAdminTab';
import type { SessionCtx } from '../../auth/sessionContext';

/**
 * `/coming-soon` is a Hub surface (W-11). Before go-live it is the public landing page, for everyone. Once the site is
 * live, in production, the Super Admin still sees it (`superAdminTab`, so viewing as another role keeps it) and anyone
 * else goes to the site. The review build is unchanged.
 * - Launch settings not read yet (`settled` false): wait, because `live` is only the default until then, and the landing
 *   must not flash on launch day. A failed read settles too (`src/config/launch.ts`), so this ends.
 * - Session `loading`: wait, or the Super Admin would be sent away before `/me` answers.
 * - Session `error` (a failed /me or Clerk): this is where it differs from the Hub's rule, for which `error` is
 *   `unsettled`, not a refusal. Here it goes to the site, which works signed out: the Super Admin can come back, and a
 *   visitor must not be left on a blank or out-of-date page.
 */
export type ComingSoonEntry = 'show' | 'wait' | 'redirect';

export function comingSoonEntry({ production, live, settled, session }: { production: boolean; live: boolean; settled: boolean; session: Pick<SessionCtx, 'status' | 'signedIn' | 'isSuperAdmin' | 'viewAs'> }): ComingSoonEntry {
  if (!production) return 'show';
  if (!settled) return 'wait';
  if (!live) return 'show';
  if (superAdminTab(session) === 'allowed') return 'show';
  return session.status === 'loading' ? 'wait' : 'redirect';
}

/** SW-08: `/` is the website once live, else the landing; in production it waits for the launch settings, as above. */
export function rootEntry({ production, live, settled }: { production: boolean; live: boolean; settled: boolean }): 'wait' | 'site' | 'landing' {
  if (production && !settled) return 'wait';
  return live ? 'site' : 'landing';
}
