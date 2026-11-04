import { Navigate } from 'react-router-dom';
import { useLayout } from '../../layout/useLayout';
import { ComingSoonLanding } from '../../components/template/ComingSoonLanding/ComingSoonLanding';
import { PRODUCTION_BUILD, siteIsLive, useLaunchConfig } from '../../config/launch';
import { useSession } from '../../auth/SessionProvider';
import { comingSoonEntry } from './entry';
import { comingSoonSpec } from './specs';
export function ComingSoonPage() {
  const { sections, isVisible } = useLayout(comingSoonSpec);
  const session = useSession();
  const config = useLaunchConfig();
  // Once the site is live this is the Super Admin's preview (W-11, the Hub's card); anyone else goes to the site.
  const entry = comingSoonEntry({ production: PRODUCTION_BUILD, live: siteIsLive(config), session });
  if (entry === 'wait') return null;
  if (entry === 'redirect') return <Navigate to="/site" replace />;
  return <>{sections.map(section => section === 'Landing' && isVisible(section) ? <ComingSoonLanding key={section} /> : null)}</>;
}
/** SW-08 — `/` shows Coming Soon until the go-live setting (src/config/launch.ts) flips, then the public website. */
export function RootEntry() {
  const config = useLaunchConfig();
  return siteIsLive(config) ? <Navigate to="/site" replace /> : <ComingSoonPage />;
}
