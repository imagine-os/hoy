import { useLayout } from '../../layout/useLayout';
import { ComingSoonLanding } from '../../components/template/ComingSoonLanding/ComingSoonLanding';
import { comingSoonSpec } from './specs';
export function ComingSoonPage() {
  const { sections, isVisible } = useLayout(comingSoonSpec);
  return <>{sections.map(section => section === 'Landing' && isVisible(section) ? <ComingSoonLanding key={section} /> : null)}</>;
}
