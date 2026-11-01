import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { PRODUCTION_BUILD } from '../../config/launch';
import { lazyPages } from '../../app/lazyPage';
import { hubProductionSpec, hubSpec, noAccessSpec } from './specs';
export { strings } from './strings';

// Production (Hoy all-roles, lane D): only the super admin's Hub with view-as, from its own chunk. The review hub
// (demo users, live preview frames, wireframe and dev toggles, persona switcher) and its no-access page are not
// referenced there, so they stay out of the bundle; `/no-access` is the identity module's in production.
const productionPage = lazyPages(() => import('./productionPages'));
const reviewPages = () => import('./reviewPages');
const page = PRODUCTION_BUILD ? (null as unknown as ReturnType<typeof lazyPages<Awaited<ReturnType<typeof reviewPages>>>>) : lazyPages(reviewPages);

export const routes: RouteDef[] = PRODUCTION_BUILD ? [
  { path: '/hub', element: productionPage('ProductionHubPage'), spec: hubProductionSpec, roles: ['super_admin'], surface: 'admin', layout: 'desktop', nav: { labelKey: 'core.nav.hub', icon: 'grid', order: 0, group: 'core.nav.group.system' } },
] : [
  { path: '/hub', element: page('HubPage'), spec: hubSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
  { path: '/no-access', element: page('NoAccessPage'), spec: noAccessSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
];
