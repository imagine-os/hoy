import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { PRODUCTION_BUILD } from '../../config/launch';
import { lazyPages } from '../../app/lazyPage';
import { hubProductionSpec, hubSpec, noAccessSpec } from './specs';
export { strings } from './strings';

// Production (Hoy test-fixes, lane Y3): Justin's Hub (HubPage), for the super admin only, on its own full page like the
// review build's (`surface: 'public'`, `layout: 'auto'`: no staff shell). Its people are real (view-as samples), its
// previews are read-only frames and its report is a `problem_report` form; the demo users stay in the review build
// (`PRODUCTION_BUILD` folds in HubPage). `/no-access` is the identity module's in production.
const productionPage = lazyPages(() => import('./productionPages'));
const reviewPages = () => import('./reviewPages');
const page = PRODUCTION_BUILD ? (null as unknown as ReturnType<typeof lazyPages<Awaited<ReturnType<typeof reviewPages>>>>) : lazyPages(reviewPages);

export const routes: RouteDef[] = PRODUCTION_BUILD ? [
  { path: '/hub', element: productionPage('HubPage'), spec: hubProductionSpec, roles: ['super_admin'], surface: 'public', layout: 'auto' },
] : [
  { path: '/hub', element: page('HubPage'), spec: hubSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
  { path: '/no-access', element: page('NoAccessPage'), spec: noAccessSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
];
