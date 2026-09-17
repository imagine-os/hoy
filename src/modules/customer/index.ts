import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { PageStub } from '../../components/template/PageStub/PageStub';
import { CustomerHomePage } from './HomePage';
export { strings } from './strings';

const roles: Role[] = ['customer', 'teacher'];
const base = { roles, surface: 'customer' as const, layout: 'mobile' as const };
const stub = (path: string, code: string, nav?: RouteDef['nav']): RouteDef => ({ ...base, path, spec: canvasSpecs[code], element: h(PageStub, { spec: canvasSpecs[code] }), nav });

export const routes: RouteDef[] = [
  { ...base, path: '/app', element: h(CustomerHomePage), spec: canvasSpecs['C-01'], nav: { labelKey: 'core.nav.home', icon: '⌂', order: 1 } },
  stub('/app/schedule', 'C-02', { labelKey: 'core.nav.schedule', icon: '▦', order: 2 }),
  stub('/app/class/:id', 'C-03'),
  stub('/app/checkout/:id', 'C-04'),
  stub('/app/payment-methods', 'C-05'),
  stub('/app/plans', 'C-06', { labelKey: 'core.nav.plans', icon: '◇', order: 3 }),
  stub('/app/passes', 'C-07'),
  stub('/app/credits', 'C-07b'),
  stub('/app/booking/:id', 'C-08'),
  stub('/app/rate/:id', 'C-10'),
  stub('/app/history', 'C-11'),
  stub('/app/rules', 'C-13'),
  stub('/app/faq', 'C-14 / C-15'),
  stub('/app/invite', 'C-16'),
  stub('/app/gift', 'C-17'),
  stub('/app/teachers', 'C-18'),
  stub('/app/profile', 'C-19', { labelKey: 'core.nav.profile', icon: '◯', order: 4 }),
  stub('/app/waitlist/:id', 'C-20'),
  stub('/app/membership', 'C-22'),
  stub('/app/events/:id', 'C-23'),
  stub('/app/notifications', 'C-24'),
  stub('/app/more', 'C-25', { labelKey: 'core.nav.more', icon: '⋯', order: 5 }),
  stub('/app/intention', 'A-05'),
];
