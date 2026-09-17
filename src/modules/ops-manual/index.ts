import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { lazyPages } from '../../app/lazyPage';
import { decisionsSpec, manualSpec } from './specs';
export { strings } from './strings';

const base = { roles: EVERYONE, surface: 'docs' as const, layout: 'desktop' as const };
// The manual pages, the markdown viewer and the chapter index load on first visit; chapter bodies on demand.
const page = lazyPages(() => import('./pages'));

export const routes: RouteDef[] = [
  { ...base, path: '/manual', element: page('ManualHome'), spec: manualSpec, nav: { labelKey: 'core.nav.manual', icon: '▤', order: 2 } },
  { ...base, path: '/manual/decisions', element: page('DecisionsPage'), spec: decisionsSpec },
  { ...base, path: '/manual/:chapter', element: page('ManualPage'), spec: manualSpec },
];
