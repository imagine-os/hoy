import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { StringTable } from '../../i18n/types';
import { EVERYONE } from '../../auth/roles';
import { DocsBrowser } from '../docs/DocsBrowser';
import { manualSpec } from '../docs/specs';

export const strings: StringTable = { 'manual.title': { es: 'Manual de operaciones', en: 'Operations manual' } };
const el = () => h(DocsBrowser, { prefix: 'ops-manual/', routeBase: '/manual', defaultDoc: 'docs/ops-manual/README.md', title: 'Manual' });

export const routes: RouteDef[] = [
  { path: '/manual', element: el(), spec: manualSpec, roles: EVERYONE, surface: 'docs', layout: 'desktop', nav: { labelKey: 'core.nav.manual', icon: '▤', order: 2 } },
  { path: '/manual/*', element: el(), spec: manualSpec, roles: EVERYONE, surface: 'docs', layout: 'desktop' },
];
