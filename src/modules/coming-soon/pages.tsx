import { Navigate } from 'react-router-dom';
import { useLayout } from '../../layout/useLayout';
import { ComingSoonLanding } from '../../components/template/ComingSoonLanding/ComingSoonLanding';
import { PRODUCTION_BUILD, siteIsLive, useLaunchConfig, useLaunchSettled } from '../../config/launch';
import { useSession } from '../../auth/SessionProvider';
import { comingSoonEntry, rootEntry } from './entry';
import { comingSoonSpec } from './specs';
/** While the launch settings or the session are read: the app's own loading state, not a blank page. */
const Waiting = () => <div className="lazy-fallback" aria-busy="true" data-launch-wait />;
export function ComingSoonPage() {
  const { sections, isVisible } = useLayout(comingSoonSpec);
  const session = useSession();
  const config = useLaunchConfig();
  const settled = useLaunchSettled();
  // Once the site is live this is the Super Admin's preview (W-11, the Hub's card); anyone else goes to the site.
  const entry = comingSoonEntry({ production: PRODUCTION_BUILD, live: siteIsLive(config), settled, session });
  if (entry === 'wait') return <Waiting />;
  if (entry === 'redirect') return <Navigate to="/site" replace />;
  return <>{sections.map(section => section === 'Landing' && isVisible(section) ? <ComingSoonLanding key={section} /> : null)}</>;
}
/** SW-08 — `/` shows Coming Soon until the go-live setting (src/config/launch.ts) flips, then the public website. */
export function RootEntry() {
  const config = useLaunchConfig();
  const settled = useLaunchSettled();
  const entry = rootEntry({ production: PRODUCTION_BUILD, live: siteIsLive(config), settled });
  if (entry === 'wait') return <Waiting />;
  return entry === 'site' ? <Navigate to="/site" replace /> : <ComingSoonPage />;
}
