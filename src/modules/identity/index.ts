import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { PRODUCTION_BUILD } from '../../config/launch';
import { lazyPages } from '../../app/lazyPage';
import { accessSpec, callbackSpec, noAccessSpec } from './specs';
export { strings } from './strings';

/**
 * H-2: pages that exist only in the production build (Clerk). The import sits inside the production branch so the
 * review build carries neither these pages nor Clerk. The production A-02/A-03 screens are swapped in by the customer
 * module's SignInPage/SignUpPage.
 */
function productionRoutes(): RouteDef[] {
  const page = lazyPages(() => import('./pages'));
  return [
    { path: '/auth/callback', element: page('AuthCallbackPage'), spec: callbackSpec, roles: EVERYONE, surface: 'public', layout: 'mobile' },
    { path: '/app/access', element: page('AccessPage'), spec: accessSpec, roles: ['customer'], surface: 'customer', layout: 'mobile' },
    { path: '/no-access', element: page('CosNoAccessPage'), spec: noAccessSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
  ];
}

export const routes: RouteDef[] = PRODUCTION_BUILD ? productionRoutes() : [];
