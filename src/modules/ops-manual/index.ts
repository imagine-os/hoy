import type { RouteDef } from '../../specs/types';
import { ALL_SIGNED_IN, EVERYONE } from '../../auth/roles';
import { createElement as h } from 'react';
import { lazyPages } from '../../app/lazyPage';
import { PrivateDocument } from '../../auth/PrivateDocument';
import { decisionsSpec, manualSpec, sourcesSpec } from './specs';
export { strings } from './strings';

const base = { roles: EVERYONE, surface: 'docs' as const, layout: 'desktop' as const };
// The manual pages, the markdown viewer and the chapter index load on first visit; chapter bodies on demand.
const lazyPage = lazyPages(() => import('./pages'));
// SW-06: the manual is internal; a visitor signs in first unless the owner made the path public (src/config/launch.ts).
const page: typeof lazyPage = (name, props) => h(PrivateDocument, null, lazyPage(name, props));

export const routes: RouteDef[] = [
  { ...base, path: '/manual', element: page('ManualHome'), spec: manualSpec, nav: { labelKey: 'core.nav.manual', icon: 'manual', order: 2 } },
  { ...base, path: '/manual/decisions', element: page('DecisionsPage'), spec: decisionsSpec },
  { ...base, path: '/manual/:chapter', element: page('ManualPage'), spec: manualSpec },
  // K-05 (0031): the owner's source documents. A static path, so it outranks the docs browser's /docs/*.
  { ...base, roles: ALL_SIGNED_IN, path: '/docs/source', element: page('SourcesPage'), spec: sourcesSpec, nav: { labelKey: 'manual.sources.nav', icon: 'files', order: 3 } },
];
