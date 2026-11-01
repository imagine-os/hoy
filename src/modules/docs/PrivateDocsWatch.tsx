import { useEffect } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { dropPrivateDocs, privateDocsLoaded } from './privateDocs';

/**
 * Production (lane Y6, review round): the gated docs pack lives in this tab's memory (and in the docs chunks' module
 * constants, which can't be cleared in place). Once the session has settled and the person is no longer the signed-in
 * super admin (sign-out, however it happened, or another login), the PDF links are revoked and the tab reloads, so
 * nothing of the pack stays for the next person. Viewing as another role keeps it: the person is still the super
 * admin. Renders nothing; App.tsx mounts it in the production build only.
 */
export function PrivateDocsWatch() {
  const { status, signedIn, isSuperAdmin, viewAs } = useSession();
  const settled = status !== 'loading';
  const allowed = signedIn && (isSuperAdmin || viewAs !== null);
  useEffect(() => {
    if (settled && !allowed && privateDocsLoaded()) {
      dropPrivateDocs();
      window.location.reload();
    }
  }, [settled, allowed]);
  return null;
}
