import type { RouteDef } from '../../specs/types';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { lazyPages } from '../../app/lazyPage';
import { layoutEditorSpec, specsIndexSpec } from './specs';
export { strings } from './strings';

// super_admin-only tooling (component library, layout editor with dnd-kit, knowledgebase): one lazy chunk.
const page = lazyPages(() => import('./pages'));
const base = { roles: ['super_admin' as const], surface: 'dev' as const, layout: 'desktop' as const };
/** The design-system group: it shows in the dev sidebar and, for a super admin, in the staff and admin sidebars. */
const G = 'core.nav.group.design';

export const routes: RouteDef[] = [
  { ...base, path: '/dev', element: page('SpecsIndexPage'), spec: specsIndexSpec },
  { ...base, path: '/dev/tokens', element: page('TokensPage'), spec: canvasSpecs['D-01'], nav: { labelKey: 'core.nav.tokens', icon: '◐', order: 1, group: G } },
  { ...base, path: '/dev/components', element: page('ComponentsPage'), spec: canvasSpecs['D-02'], nav: { labelKey: 'core.nav.components', icon: '❖', order: 2, group: G } },
  { ...base, path: '/dev/specs', element: page('SpecsIndexPage'), spec: specsIndexSpec, nav: { labelKey: 'core.nav.specs', icon: '☰', order: 3, group: G } },
  { ...base, path: '/dev/layout', element: page('LayoutEditorPage'), spec: layoutEditorSpec, nav: { labelKey: 'core.nav.layout', icon: '⇅', order: 4, group: G, to: '/dev/layout/C-01' } },
  { ...base, path: '/dev/layout/:pageCode', element: page('LayoutEditorPage'), spec: layoutEditorSpec },
  { ...base, path: '/dev/knowledgebase', element: page('KnowledgebasePage'), spec: canvasSpecs['K-01'], nav: { labelKey: 'core.nav.knowledgebase', icon: '❡', order: 5, group: G } },
];
