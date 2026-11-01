import type { RouteDef } from '../../specs/types';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { lazyPages } from '../../app/lazyPage';
import { DEV_MODE_ROLES as DEV_ROLES } from '../../auth/roles';
import { apiKeysSpec, canvasSpec, layoutEditorSpec, simulatorSpec, specsIndexSpec } from './specs';
import { PRODUCTION_BUILD } from '../../config/launch';
import { createElement } from 'react';
import { PrivateDocsReady } from '../docs/PrivateDocsReady';
export { strings } from './strings';

// super_admin + developer tooling (0031) (component library, layout editor with dnd-kit, knowledgebase): one lazy chunk.
// Production (Hoy all-roles, lane C): only the developer's home `/dev` (the specs index) ships, from its own chunk;
// the other dev pages (API keys, simulator with demo personas, layout editor…) wait for R-08 and are not in the bundle.
const specsPage = lazyPages(() => import('./specsPage'));
// The kanban and knowledgebase (K-01) ships for the super admin since lane Y3 (the Hub's Construction & testing band).
const knowledgebasePage = lazyPages(() => import('./kanbanChunk'));
const reviewPages = () => import('./pages');
const page = PRODUCTION_BUILD ? (specsPage as unknown as ReturnType<typeof lazyPages<Awaited<ReturnType<typeof reviewPages>>>>) : lazyPages(reviewPages);
const base = { roles: DEV_ROLES, surface: 'dev' as const, layout: 'desktop' as const };
/** The design-system group: it shows in the dev sidebar and, for a super admin, in the staff and admin sidebars. */
const G = 'core.nav.group.design';

// Production builds only the home (with the menu entry the specs page has in review), so the other pages' specs and
// chunks are not referenced at all and stay out of the bundle.
export const routes: RouteDef[] = PRODUCTION_BUILD ? [
  { ...base, path: '/dev', element: specsPage('SpecsIndexPage'), spec: specsIndexSpec, nav: { labelKey: 'core.nav.specs', icon: 'specs', order: 3, group: G } },
  { ...base, roles: ['super_admin'], path: '/dev/knowledgebase', element: createElement(PrivateDocsReady, null, knowledgebasePage('KnowledgebasePage')), spec: canvasSpecs['K-01'], nav: { labelKey: 'core.nav.knowledgebase', icon: 'knowledgebase', order: 5, group: G } },
] : [
  { ...base, path: '/dev', element: page('SpecsIndexPage'), spec: specsIndexSpec },
  { ...base, path: '/dev/tokens', element: page('TokensPage'), spec: canvasSpecs['D-01'], nav: { labelKey: 'core.nav.tokens', icon: 'tokens', order: 1, group: G } },
  { ...base, path: '/dev/components', element: page('ComponentsPage'), spec: canvasSpecs['D-02'], nav: { labelKey: 'core.nav.components', icon: 'components', order: 2, group: G } },
  { ...base, path: '/dev/specs', element: page('SpecsIndexPage'), spec: specsIndexSpec, nav: { labelKey: 'core.nav.specs', icon: 'specs', order: 3, group: G } },
  { ...base, path: '/dev/layout', element: page('LayoutEditorPage'), spec: layoutEditorSpec, nav: { labelKey: 'core.nav.layout', icon: 'layout', order: 4, group: G, to: '/dev/layout/C-01' } },
  { ...base, path: '/dev/layout/:pageCode', element: page('LayoutEditorPage'), spec: layoutEditorSpec },
  { ...base, path: '/dev/knowledgebase', element: page('KnowledgebasePage'), spec: canvasSpecs['K-01'], nav: { labelKey: 'core.nav.knowledgebase', icon: 'knowledgebase', order: 5, group: G } },
  { ...base, path: '/dev/canvas', element: page('CanvasPage'), spec: canvasSpec, nav: { labelKey: 'core.nav.canvas', icon: 'canvas', order: 6, group: G } },
  // 0041: developer keys — admin reads them (api_keys.read), super_admin and developer issue them.
  { ...base, roles: [...DEV_ROLES, 'admin'], path: '/dev/api-keys', element: page('ApiKeysPage'), spec: apiKeysSpec, nav: { labelKey: 'dev.apiKeys.nav', icon: 'key-round', order: 8, group: G } },
  { ...base, path: '/dev/simulator', element: page('SimulatorPage'), spec: simulatorSpec, nav: { labelKey: 'core.nav.simulator', icon: 'simulator', order: 7, group: G } },
];
