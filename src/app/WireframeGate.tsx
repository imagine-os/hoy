import { useEffect } from 'react';
import { useSession } from '../auth/SessionProvider';
import { superAdminTab } from '../auth/superAdminTab';
import { useTheme } from '../design/ThemeProvider';

/**
 * Production (Hoy test-fixes, lane Y3): the wireframe skin belongs to the signed-in super admin, for this tab. Once the
 * session has settled, anyone else (a visitor after sign-out, however the session ended; an Administration login; a
 * value planted in the tab) gets the styled skin back. Viewing as another role keeps it: the person is still the super
 * admin. A /me that failed once is not settled (review round 2, L5: `superAdminTab`). Renders nothing; App.tsx mounts
 * it in the production build only.
 */
export function WireframeGate() {
  const session = useSession();
  const { skin, setSkin } = useTheme();
  const verdict = superAdminTab(session);
  useEffect(() => {
    if (verdict === 'denied' && skin === 'wireframe') setSkin('styled');
  }, [verdict, skin, setSkin]);
  return null;
}
