import { useEffect } from 'react';
import { useSession } from '../auth/SessionProvider';
import { useTheme } from '../design/ThemeProvider';

/**
 * Production (Hoy test-fixes, lane Y3): the wireframe skin belongs to the signed-in super admin, for this tab. Once the
 * session has settled, anyone else (a visitor after sign-out, however the session ended; an Administration login; a
 * value planted in the tab) gets the styled skin back. Viewing as another role keeps it: the person is still the super
 * admin. Renders nothing; App.tsx mounts it in the production build only.
 */
export function WireframeGate() {
  const { status, signedIn, isSuperAdmin, viewAs } = useSession();
  const { skin, setSkin } = useTheme();
  const settled = status !== 'loading';
  const allowed = signedIn && (isSuperAdmin || viewAs !== null);
  useEffect(() => {
    if (settled && !allowed && skin === 'wireframe') setSkin('styled');
  }, [settled, allowed, skin, setSkin]);
  return null;
}
