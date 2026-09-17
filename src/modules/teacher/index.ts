import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { TeacherHomePage } from './HomePage';
import { TeacherClassPage } from './ClassPage';
import { TeacherPayrollPage } from './PayrollPage';
import { TeacherProfilePage } from './ProfilePage';
import { S03, S03Class, S03Payroll, S03Profile } from './specs';
export { strings } from './strings';

const roles: Role[] = ['teacher', 'coordinator', 'admin'];
const base = { roles, surface: 'teacher' as const, layout: 'mobile' as const };

export const routes: RouteDef[] = [
  { ...base, path: '/teach', element: h(TeacherHomePage), spec: S03, nav: { labelKey: 'core.nav.classes', icon: '▦', order: 1 } },
  { ...base, path: '/teach/class/:id', element: h(TeacherClassPage), spec: S03Class },
  { ...base, roles: [...roles, 'finance'], path: '/teach/payroll', element: h(TeacherPayrollPage), spec: S03Payroll, nav: { labelKey: 'core.nav.payroll', icon: '◇', order: 2 } },
  { ...base, path: '/teach/profile', element: h(TeacherProfilePage), spec: S03Profile, nav: { labelKey: 'core.nav.profile', icon: '◯', order: 3 } },
];
