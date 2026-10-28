import { Navigate } from 'react-router-dom';
import { useLayout } from '../../layout/useLayout';
import { ComingSoonLanding } from '../../components/template/ComingSoonLanding/ComingSoonLanding';
import { siteIsLive, useLaunchConfig } from '../../config/launch';
import { comingSoonSpec } from './specs';
export function ComingSoonPage() {
  const { sections, isVisible } = useLayout(comingSoonSpec);
  return <>{sections.map(section => section === 'Landing' && isVisible(section) ? <ComingSoonLanding key={section} /> : null)}</>;
}
/** SW-08 — `/` shows Coming Soon until the go-live setting (src/config/launch.ts) flips, then the public website. */
export function RootEntry() {
  const config = useLaunchConfig();
  return siteIsLive(config) ? <Navigate to="/site" replace /> : <ComingSoonPage />;
}
