import type { SessionCtx } from './sessionContext';

/**
 * Production: whether this tab still belongs to the signed-in super admin, for what only they hold in it (the gated
 * docs pack, PrivateDocsWatch; the wireframe skin, WireframeGate). Viewing as another role keeps it: the person is
 * still the super admin.
 * Review round 2 (r2hoy, L5): only a settled answer drops it. `loading`, and `error` (a /me or Clerk failure, often a
 * network blip after a 401 re-check), are `unsettled`: the tab is not reloaded and the skin stays until /me answers.
 * Signed out, or a settled session that is not the super admin (`ready` without it, `no-role`, `needs-signup`,
 * `unverified`), is `denied`.
 */
export type SuperAdminTab = 'allowed' | 'denied' | 'unsettled';

export function superAdminTab(s: Pick<SessionCtx, 'status' | 'signedIn' | 'isSuperAdmin' | 'viewAs'>): SuperAdminTab {
  if (s.status === 'loading' || s.status === 'error') return 'unsettled';
  return s.signedIn && (s.isSuperAdmin || s.viewAs !== null) ? 'allowed' : 'denied';
}
