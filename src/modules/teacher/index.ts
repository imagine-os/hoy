import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { S03, S03Class, S03Payroll, S03Profile } from './specs';
export { strings } from './strings';
// Teacher pages (S-03 family) load as one chunk on first visit.
const page = lazyPages(() => import('./pages'));

const roles: Role[] = ['teacher', 'coordinator', 'admin'];
const base = { roles, surface: 'teacher' as const, layout: 'mobile' as const };

export const routes: RouteDef[] = [
  { ...base, path: '/teach', element: page('TeacherHomePage'), spec: S03, nav: { labelKey: 'core.nav.classes', icon: '▦', order: 1 } },
  { ...base, path: '/teach/class/:id', element: page('TeacherClassPage'), spec: S03Class },
  { ...base, roles: [...roles, 'finance'], path: '/teach/payroll', element: page('TeacherPayrollPage'), spec: S03Payroll, nav: { labelKey: 'core.nav.payroll', icon: '◇', order: 2 } },
  { ...base, path: '/teach/profile', element: page('TeacherProfilePage'), spec: S03Profile, nav: { labelKey: 'core.nav.profile', icon: '◯', order: 3 } },
];
