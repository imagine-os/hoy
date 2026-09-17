import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { TablesPage } from './TablesPage';
import { DashboardPage } from './DashboardPage';
import { ContentPage } from './ContentPage';
import { EmailsPage } from './EmailsPage';
import { WhatsAppPage } from './WhatsAppPage';
import { CrmPage } from './CrmPage';
import { MemberPage } from './MemberPage';
import { ActivityPage } from './ActivityPage';
import { SettingsPage } from './SettingsPage';
import { FinancePage } from './FinancePage';
import { ArticlesPage } from './ArticlesPage';
import { FaqAdminPage } from './FaqAdminPage';
import { EventsAdminPage } from './EventsAdminPage';
import { MediaPage } from './MediaPage';
import { PayoutRunPage, PayoutsPage } from './PayoutsPage';
import { ExpensesPage } from './ExpensesPage';
import { M01, M02, M02a, M02b, M02c, M02d, M04, M05, M06, M07, M08a, M08b, M08c, M08d, M08e, M09, M09a, M09b, M09c } from './specs';
export { strings } from './strings';

const G = 'core.nav.group.admin';
const base = { surface: 'admin' as const, layout: 'desktop' as const };
const admins: Role[] = ['super_admin', 'admin'];
const crm: Role[] = [...admins, 'coordinator', 'front_desk', 'finance'];

export const routes: RouteDef[] = [
  { ...base, path: '/admin', roles: [...admins, 'coordinator', 'finance'], element: h(DashboardPage), spec: M01, nav: { labelKey: 'core.nav.dashboard', icon: '◫', order: 10, group: G } },
  { ...base, path: '/admin/content', roles: [...admins, 'coordinator'], element: h(ContentPage), spec: M02, nav: { labelKey: 'core.nav.content', icon: '✎', order: 11, group: G } },
  { ...base, path: '/admin/content/articles', roles: [...admins, 'coordinator'], element: h(ArticlesPage), spec: M02a },
  { ...base, path: '/admin/content/faq', roles: [...admins, 'coordinator'], element: h(FaqAdminPage), spec: M02b },
  { ...base, path: '/admin/content/events', roles: [...admins, 'coordinator'], element: h(EventsAdminPage), spec: M02c },
  { ...base, path: '/admin/content/media', roles: [...admins, 'coordinator'], element: h(MediaPage), spec: M02d },
  { ...base, path: '/admin/tables', roles: ['super_admin', 'finance'], element: h(TablesPage), spec: canvasSpecs['M-03'], nav: { labelKey: 'core.nav.tables', icon: '▤', order: 12, group: G } },
  { ...base, path: '/admin/tables/:table', roles: ['super_admin', 'finance'], element: h(TablesPage), spec: canvasSpecs['M-03'] },
  { ...base, path: '/admin/emails', roles: [...admins, 'coordinator'], element: h(EmailsPage), spec: M04, nav: { labelKey: 'core.nav.emails', icon: '✉', order: 13, group: G } },
  { ...base, path: '/admin/whatsapp', roles: [...admins, 'coordinator', 'front_desk'], element: h(WhatsAppPage), spec: M05, nav: { labelKey: 'core.nav.whatsapp', icon: '☏', order: 14, group: G } },
  { ...base, path: '/admin/crm', roles: crm, element: h(CrmPage), spec: M06, nav: { labelKey: 'core.nav.crm', icon: '☺', order: 15, group: G } },
  { ...base, path: '/admin/crm/:id', roles: crm, element: h(MemberPage), spec: M06 },
  { ...base, path: '/admin/activity', roles: [...admins, 'coordinator', 'finance'], element: h(ActivityPage), spec: M07, nav: { labelKey: 'core.nav.activity', icon: '≡', order: 16, group: G } },
  { ...base, path: '/admin/settings', roles: [...admins, 'coordinator', 'finance'], element: h(SettingsPage, { group: 'general' }), spec: M08a, nav: { labelKey: 'core.nav.settings', icon: '⚙', order: 17, group: G } },
  { ...base, path: '/admin/settings/features', roles: [...admins, 'coordinator', 'finance'], element: h(SettingsPage, { group: 'features' }), spec: M08b },
  { ...base, path: '/admin/settings/payments', roles: [...admins, 'finance'], element: h(SettingsPage, { group: 'payments' }), spec: M08c },
  { ...base, path: '/admin/settings/communications', roles: [...admins, 'coordinator'], element: h(SettingsPage, { group: 'communications' }), spec: M08d },
  { ...base, path: '/admin/settings/branding', roles: admins, element: h(SettingsPage, { group: 'branding' }), spec: M08e },
  { ...base, path: '/admin/finance', roles: [...admins, 'finance'], element: h(FinancePage), spec: M09, nav: { labelKey: 'admin.finance.nav', icon: '◇', order: 18, group: G } },
  { ...base, path: '/admin/finance/payouts', roles: [...admins, 'finance'], element: h(PayoutsPage), spec: M09a, nav: { labelKey: 'admin.payouts.nav', icon: '⊞', order: 19, group: G } },
  { ...base, path: '/admin/finance/payouts/:id', roles: [...admins, 'finance'], element: h(PayoutRunPage), spec: M09b },
  { ...base, path: '/admin/finance/expenses', roles: [...admins, 'finance'], element: h(ExpensesPage), spec: M09c, nav: { labelKey: 'admin.expenses.nav', icon: '⊟', order: 20, group: G } },
];
