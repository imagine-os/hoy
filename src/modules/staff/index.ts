import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import { STAFF_ROLES, type Role } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { PageStub } from '../../components/template/PageStub/PageStub';
import { StaffHomePage } from './HomePage';
export { strings } from './strings';

const roles: Role[] = [...STAFF_ROLES, 'teacher'];
const base = { roles, surface: 'staff' as const, layout: 'desktop' as const };
const G = 'Staff';

export const routes: RouteDef[] = [
  { ...base, path: '/staff', element: h(StaffHomePage), spec: canvasSpecs['S-01'], nav: { labelKey: 'core.nav.home', icon: '⌂', order: 1, group: G } },
  { ...base, roles: ['super_admin', 'admin', 'coordinator', 'front_desk'], path: '/staff/checkin', element: h(PageStub, { spec: canvasSpecs['S-02'] }), spec: canvasSpecs['S-02'], nav: { labelKey: 'core.nav.checkin', icon: '✓', order: 2, group: G } },
  { ...base, roles: ['super_admin', 'admin', 'coordinator', 'front_desk'], path: '/staff/register', element: h(PageStub, { spec: canvasSpecs['S-04'] }), spec: canvasSpecs['S-04'], nav: { labelKey: 'core.nav.register', icon: '$', order: 3, group: G } },
];
