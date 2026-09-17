import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { siteSpecs } from './specs';
export { strings } from './strings';
// Public site pages (W-xx, P-01, A-06): one chunk for visitors.
const page = lazyPages(() => import('./pages'));

const pub = { roles: EVERYONE, surface: 'public' as const, layout: 'auto' as const };

export const routes: RouteDef[] = [
  { ...pub, path: '/site', element: page('HomePage'), spec: siteSpecs.home },
  { ...pub, path: '/site/about', element: page('AboutPage'), spec: siteSpecs.about },
  { ...pub, path: '/site/classes', element: page('ClassesPage'), spec: siteSpecs.classes },
  { ...pub, path: '/site/classes/:slug', element: page('ClassDetailPage'), spec: siteSpecs.classDetail },
  { ...pub, path: '/site/modalities', element: page('ModalitiesPage'), spec: siteSpecs.modalities },
  { ...pub, path: '/site/schedule', element: page('SchedulePage'), spec: siteSpecs.schedule },
  { ...pub, path: '/site/teachers', element: page('TeachersPage'), spec: siteSpecs.teachers },
  { ...pub, path: '/site/plans', element: page('PlansPage'), spec: siteSpecs.plans },
  { ...pub, path: '/site/contact', element: page('ContactPage'), spec: siteSpecs.contact },
  { ...pub, path: '/site/delete-account', element: page('DeleteAccountPage'), spec: siteSpecs.deleteAccount },
  { ...pub, path: '/site/legal/terms', element: page('LegalPage', { kind: 'terms' }), spec: canvasSpecs['A-06'] },
  { ...pub, path: '/site/legal/privacy', element: page('LegalPage', { kind: 'privacy' }), spec: canvasSpecs['A-06'] },
];
