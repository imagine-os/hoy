import { useLayout } from '../../layout/useLayout';
import { ComingSoonLanding } from '../../components/template/ComingSoonLanding/ComingSoonLanding';
import { comingSoonSpec } from './specs';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { tenant } from '../../tenant/tenant';
import { publicSiteLaunched } from './launch';
export function ComingSoonPage() {
  const { sections, isVisible } = useLayout(comingSoonSpec);
  const [launched, setLaunched] = useState(() => publicSiteLaunched(new Date(), tenant.timezone));
  useEffect(() => {
    const refresh = () => setLaunched(publicSiteLaunched(new Date(), tenant.timezone));
    // Recheck an already-open tab as well as a resumed background tab.
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  // Replace prevents Back from trapping visitors on the expired launch page.
  // Pre-launch dialog and edition query state must not leak into the live site.
  if (launched) return <Navigate to="/site" replace />;
  return <>{sections.map(section => section === 'Landing' && isVisible(section) ? <ComingSoonLanding key={section} /> : null)}</>;
}
