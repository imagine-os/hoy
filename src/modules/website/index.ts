import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { siteSpecs } from './specs';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ClassesPage } from './pages/ClassesPage';
import { ClassDetailPage } from './pages/ClassDetailPage';
import { ModalitiesPage } from './pages/ModalitiesPage';
import { SchedulePage } from './pages/SchedulePage';
import { TeachersPage } from './pages/TeachersPage';
import { PlansPage } from './pages/PlansPage';
import { ContactPage } from './pages/ContactPage';
import { LegalPage } from './pages/LegalPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
export { strings } from './strings';

const pub = { roles: EVERYONE, surface: 'public' as const, layout: 'auto' as const };

export const routes: RouteDef[] = [
  { ...pub, path: '/site', element: h(HomePage), spec: siteSpecs.home },
  { ...pub, path: '/site/about', element: h(AboutPage), spec: siteSpecs.about },
  { ...pub, path: '/site/classes', element: h(ClassesPage), spec: siteSpecs.classes },
  { ...pub, path: '/site/classes/:slug', element: h(ClassDetailPage), spec: siteSpecs.classDetail },
  { ...pub, path: '/site/modalities', element: h(ModalitiesPage), spec: siteSpecs.modalities },
  { ...pub, path: '/site/schedule', element: h(SchedulePage), spec: siteSpecs.schedule },
  { ...pub, path: '/site/teachers', element: h(TeachersPage), spec: siteSpecs.teachers },
  { ...pub, path: '/site/plans', element: h(PlansPage), spec: siteSpecs.plans },
  { ...pub, path: '/site/contact', element: h(ContactPage), spec: siteSpecs.contact },
  { ...pub, path: '/site/delete-account', element: h(DeleteAccountPage), spec: siteSpecs.deleteAccount },
  { ...pub, path: '/site/legal/terms', element: h(LegalPage, { kind: 'terms' }), spec: canvasSpecs['A-06'] },
  { ...pub, path: '/site/legal/privacy', element: h(LegalPage, { kind: 'privacy' }), spec: canvasSpecs['A-06'] },
];
