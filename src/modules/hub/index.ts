import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { HubPage } from './HubPage';
import { NoAccessPage } from './NoAccessPage';
import { hubSpec, noAccessSpec } from './specs';
export { strings } from './strings';

export const routes: RouteDef[] = [
  { path: '/', element: h(HubPage), spec: hubSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
  { path: '/no-access', element: h(NoAccessPage), spec: noAccessSpec, roles: EVERYONE, surface: 'public', layout: 'auto' },
];
