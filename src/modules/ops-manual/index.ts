import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { ManualPage } from './ManualPage';
import { DecisionsPage } from './DecisionsPage';
import { decisionsSpec, manualSpec } from './specs';
export { strings } from './strings';

const base = { roles: EVERYONE, surface: 'docs' as const, layout: 'desktop' as const };

export const routes: RouteDef[] = [
  { ...base, path: '/manual', element: h(ManualPage), spec: manualSpec, nav: { labelKey: 'core.nav.manual', icon: '▤', order: 2 } },
  { ...base, path: '/manual/decisions', element: h(DecisionsPage), spec: decisionsSpec },
  { ...base, path: '/manual/:chapter', element: h(ManualPage), spec: manualSpec },
];
