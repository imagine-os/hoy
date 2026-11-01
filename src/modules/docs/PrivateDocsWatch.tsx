import { useEffect } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { superAdminTab } from '../../auth/superAdminTab';
import { dropPrivateDocs, privateDocsLoaded } from './privateDocs';

/**
 * Production (lane Y6, review round): the gated docs pack lives in this tab's memory (and in the docs chunks' module
 * constants, which can't be cleared in place). Once the session has settled and the person is no longer the signed-in
 * super admin (sign-out, however it happened, or another login), the PDF links are revoked and the tab reloads, so
 * nothing of the pack stays for the next person. Viewing as another role keeps it: the person is still the super
 * admin. Review round 2: a /me that failed once is not settled, so it never reloads the tab mid-read (L5,
 * `superAdminTab`); the drop happens even while the pack is still downloading, so a late answer is thrown away (L6).
 * Renders nothing; App.tsx mounts it in the production build only.
 */
export function PrivateDocsWatch() {
  const verdict = superAdminTab(useSession());
  useEffect(() => {
    if (verdict !== 'denied') return;
    const loaded = privateDocsLoaded();
    dropPrivateDocs();
    if (loaded) window.location.reload();
  }, [verdict]);
  return null;
}
