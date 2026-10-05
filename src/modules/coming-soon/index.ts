import { lazyPages } from '../../app/lazyPage';
import { EVERYONE } from '../../auth/roles';
import type { RouteDef } from '../../specs/types';
import { comingSoonSpec } from './specs';
export { strings } from './strings';
const page = lazyPages(() => import('./pages'));
export const routes: RouteDef[] = [
  { path: '/coming-soon', roles: EVERYONE, surface: 'public', layout: 'auto', element: page('ComingSoonPage'), spec: comingSoonSpec },
];
