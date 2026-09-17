import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import { STAFF_ROLES, type Role } from '../../auth/roles';
import { StaffHomePage } from './HomePage';
import { CheckinPage } from './CheckinPage';
import { RegisterPage } from './RegisterPage';
import { S01, S02, S04 } from './specs';
export { strings } from './strings';

const roles: Role[] = [...STAFF_ROLES, 'teacher'];
const desk: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk'];
const base = { roles, surface: 'staff' as const, layout: 'desktop' as const };
const G = 'core.nav.group.staff';

export const routes: RouteDef[] = [
  { ...base, path: '/staff', element: h(StaffHomePage), spec: S01, nav: { labelKey: 'core.nav.home', icon: '⌂', order: 1, group: G } },
  { ...base, roles: desk, path: '/staff/checkin', element: h(CheckinPage), spec: S02, nav: { labelKey: 'core.nav.checkin', icon: '✓', order: 2, group: G } },
  { ...base, roles: desk, path: '/staff/register', element: h(RegisterPage), spec: S04, nav: { labelKey: 'core.nav.register', icon: '$', order: 3, group: G } },
];
