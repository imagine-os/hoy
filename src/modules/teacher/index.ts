import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { PageStub } from '../../components/template/PageStub/PageStub';
import { TeacherHomePage } from './HomePage';
export { strings } from './strings';

const roles: Role[] = ['teacher', 'coordinator', 'admin'];
const base = { roles, surface: 'teacher' as const, layout: 'mobile' as const };

export const routes: RouteDef[] = [
  { ...base, path: '/teach', element: h(TeacherHomePage), spec: canvasSpecs['S-03'], nav: { labelKey: 'core.nav.classes', icon: '▦', order: 1 } },
  { ...base, path: '/teach/class/:id', element: h(PageStub, { spec: canvasSpecs['S-02'] }), spec: canvasSpecs['S-02'] },
  { ...base, path: '/teach/payroll', element: h(PageStub, { spec: canvasSpecs['S-03'] }), spec: canvasSpecs['S-03'], nav: { labelKey: 'core.nav.payroll', icon: '◇', order: 2 } },
  { ...base, path: '/teach/profile', element: h(PageStub, { spec: canvasSpecs['C-19'] }), spec: canvasSpecs['C-19'], nav: { labelKey: 'core.nav.profile', icon: '◯', order: 3 } },
];
