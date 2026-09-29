import type { RouteDef } from '../../specs/types';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { lazyPages } from '../../app/lazyPage';
import { DEV_MODE_ROLES as DEV_ROLES } from '../../auth/roles';
import { apiKeysSpec, canvasSpec, layoutEditorSpec, simulatorSpec, specsIndexSpec } from './specs';
export { strings } from './strings';

// super_admin + developer tooling (0031) (component library, layout editor with dnd-kit, knowledgebase): one lazy chunk.
const page = lazyPages(() => import('./pages'));
const base = { roles: DEV_ROLES, surface: 'dev' as const, layout: 'desktop' as const };
/** The design-system group: it shows in the dev sidebar and, for a super admin, in the staff and admin sidebars. */
const G = 'core.nav.group.design';

export const routes: RouteDef[] = [
  { ...base, path: '/dev', element: page('SpecsIndexPage'), spec: specsIndexSpec },
  { ...base, path: '/dev/tokens', element: page('TokensPage'), spec: canvasSpecs['D-01'], nav: { labelKey: 'core.nav.tokens', icon: 'tokens', order: 1, group: G } },
  { ...base, path: '/dev/components', element: page('ComponentsPage'), spec: canvasSpecs['D-02'], nav: { labelKey: 'core.nav.components', icon: 'components', order: 2, group: G } },
  { ...base, path: '/dev/specs', element: page('SpecsIndexPage'), spec: specsIndexSpec, nav: { labelKey: 'core.nav.specs', icon: 'specs', order: 3, group: G } },
  { ...base, path: '/dev/layout', element: page('LayoutEditorPage'), spec: layoutEditorSpec, nav: { labelKey: 'core.nav.layout', icon: 'layout', order: 4, group: G, to: '/dev/layout/C-01' } },
  { ...base, path: '/dev/layout/:pageCode', element: page('LayoutEditorPage'), spec: layoutEditorSpec },
  { ...base, path: '/dev/knowledgebase', element: page('KnowledgebasePage'), spec: canvasSpecs['K-01'], nav: { labelKey: 'core.nav.knowledgebase', icon: 'knowledgebase', order: 5, group: G } },
  { ...base, path: '/dev/canvas', element: page('CanvasPage'), spec: canvasSpec, nav: { labelKey: 'core.nav.canvas', icon: 'canvas', order: 6, group: G } },
  // 0039: developer keys — admin reads them (api_keys.read), super_admin and developer issue them.
  { ...base, roles: [...DEV_ROLES, 'admin'], path: '/dev/api-keys', element: page('ApiKeysPage'), spec: apiKeysSpec, nav: { labelKey: 'dev.apiKeys.nav', icon: 'key-round', order: 8, group: G } },
  { ...base, path: '/dev/simulator', element: page('SimulatorPage'), spec: simulatorSpec, nav: { labelKey: 'core.nav.simulator', icon: 'simulator', order: 7, group: G } },
];
