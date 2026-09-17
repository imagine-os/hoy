import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { TokensPage } from './TokensPage';
import { ComponentsPage } from './ComponentsPage';
import { SpecsIndexPage } from './SpecsIndexPage';
import { LayoutEditorPage } from './LayoutEditorPage';
import { KnowledgebasePage } from './KnowledgebasePage';
import { layoutEditorSpec, specsIndexSpec } from './specs';
export { strings } from './strings';

const base = { roles: ['super_admin' as const], surface: 'dev' as const, layout: 'desktop' as const };
/** The design-system group: it shows in the dev sidebar and, for a super admin, in the staff and admin sidebars. */
const G = 'core.nav.group.design';

export const routes: RouteDef[] = [
  { ...base, path: '/dev', element: h(SpecsIndexPage), spec: specsIndexSpec },
  { ...base, path: '/dev/tokens', element: h(TokensPage), spec: canvasSpecs['D-01'], nav: { labelKey: 'core.nav.tokens', icon: '◐', order: 1, group: G } },
  { ...base, path: '/dev/components', element: h(ComponentsPage), spec: canvasSpecs['D-02'], nav: { labelKey: 'core.nav.components', icon: '❖', order: 2, group: G } },
  { ...base, path: '/dev/specs', element: h(SpecsIndexPage), spec: specsIndexSpec, nav: { labelKey: 'core.nav.specs', icon: '☰', order: 3, group: G } },
  { ...base, path: '/dev/layout', element: h(LayoutEditorPage), spec: layoutEditorSpec, nav: { labelKey: 'core.nav.layout', icon: '⇅', order: 4, group: G, to: '/dev/layout/C-01' } },
  { ...base, path: '/dev/layout/:pageCode', element: h(LayoutEditorPage), spec: layoutEditorSpec },
  { ...base, path: '/dev/knowledgebase', element: h(KnowledgebasePage), spec: canvasSpecs['K-01'], nav: { labelKey: 'core.nav.knowledgebase', icon: '❡', order: 5, group: G } },
];
