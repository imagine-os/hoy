import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { PageStub } from '../../components/template/PageStub/PageStub';
import { TablesPage } from './TablesPage';
import { DashboardPage } from './DashboardPage';
export { strings } from './strings';

const G = 'Admin';
const base = { surface: 'admin' as const, layout: 'desktop' as const };
const admins: Role[] = ['super_admin', 'admin'];
const stub = (path: string, code: string, roles: Role[], nav?: RouteDef['nav']): RouteDef => ({ ...base, path, roles, spec: canvasSpecs[code], element: h(PageStub, { spec: canvasSpecs[code] }), nav });

export const routes: RouteDef[] = [
  { ...base, path: '/admin', roles: [...admins, 'coordinator', 'finance'], element: h(DashboardPage), spec: canvasSpecs['M-01'], nav: { labelKey: 'core.nav.dashboard', icon: '◫', order: 10, group: G } },
  stub('/admin/content', 'M-02', [...admins, 'coordinator'], { labelKey: 'core.nav.content', icon: '✎', order: 11, group: G }),
  { ...base, path: '/admin/tables', roles: ['super_admin', 'finance'], element: h(TablesPage), spec: canvasSpecs['M-03'], nav: { labelKey: 'core.nav.tables', icon: '▤', order: 12, group: G } },
  { ...base, path: '/admin/tables/:table', roles: ['super_admin', 'finance'], element: h(TablesPage), spec: canvasSpecs['M-03'] },
  stub('/admin/emails', 'M-04', [...admins, 'coordinator'], { labelKey: 'core.nav.emails', icon: '✉', order: 13, group: G }),
  stub('/admin/whatsapp', 'M-05', [...admins, 'coordinator'], { labelKey: 'core.nav.whatsapp', icon: '☏', order: 14, group: G }),
  stub('/admin/crm', 'M-06', [...admins, 'coordinator', 'front_desk', 'finance'], { labelKey: 'core.nav.crm', icon: '☺', order: 15, group: G }),
  stub('/admin/crm/:id', 'M-06', [...admins, 'coordinator', 'front_desk', 'finance']),
  stub('/admin/activity', 'M-07', [...admins, 'coordinator', 'finance'], { labelKey: 'core.nav.activity', icon: '≡', order: 16, group: G }),
  stub('/admin/settings', 'M-08', [...admins, 'coordinator', 'finance'], { labelKey: 'core.nav.settings', icon: '⚙', order: 17, group: G }),
];
