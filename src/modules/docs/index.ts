import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { StringTable } from '../../i18n/types';
import { EVERYONE } from '../../auth/roles';
import { DocsBrowser } from './DocsBrowser';
import { docsSpec } from './specs';

export const strings: StringTable = { 'docs.title': { es: 'Documentación', en: 'Documentation' } };
const el = () => h(DocsBrowser, { prefix: '', routeBase: '/docs', defaultDoc: 'docs/README.md', title: 'Docs' });

export const routes: RouteDef[] = [
  { path: '/docs', element: el(), spec: docsSpec, roles: EVERYONE, surface: 'docs', layout: 'desktop', nav: { labelKey: 'core.nav.docs', icon: '❡', order: 1 } },
  { path: '/docs/*', element: el(), spec: docsSpec, roles: EVERYONE, surface: 'docs', layout: 'desktop' },
];
