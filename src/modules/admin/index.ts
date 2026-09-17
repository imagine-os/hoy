import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { M01, M02, M02a, M02b, M02c, M02d, M04, M05, M06, M07, M08a, M08b, M08c, M08d, M08e, M08f, M09, M09a, M09b, M09c, M10, M11 } from './specs';
export { strings } from './strings';
// Admin pages (M-xx): one chunk for staff who open /admin.
const page = lazyPages(() => import('./pages'));

const G = 'core.nav.group.admin';
const base = { surface: 'admin' as const, layout: 'desktop' as const };
const admins: Role[] = ['super_admin', 'admin'];
const crm: Role[] = [...admins, 'coordinator', 'front_desk', 'finance'];

export const routes: RouteDef[] = [
  { ...base, path: '/admin', roles: [...admins, 'coordinator', 'finance'], element: page('DashboardPage'), spec: M01, nav: { labelKey: 'core.nav.dashboard', icon: '◫', order: 10, group: G } },
  { ...base, path: '/admin/content', roles: [...admins, 'coordinator'], element: page('ContentPage'), spec: M02, nav: { labelKey: 'core.nav.content', icon: '✎', order: 11, group: G } },
  { ...base, path: '/admin/content/articles', roles: [...admins, 'coordinator'], element: page('ArticlesPage'), spec: M02a },
  { ...base, path: '/admin/content/faq', roles: [...admins, 'coordinator'], element: page('FaqAdminPage'), spec: M02b },
  { ...base, path: '/admin/content/events', roles: [...admins, 'coordinator'], element: page('EventsAdminPage'), spec: M02c },
  { ...base, path: '/admin/content/media', roles: [...admins, 'coordinator'], element: page('MediaPage'), spec: M02d },
  { ...base, path: '/admin/tables', roles: ['super_admin', 'finance'], element: page('TablesPage'), spec: canvasSpecs['M-03'], nav: { labelKey: 'core.nav.tables', icon: '▤', order: 12, group: G } },
  { ...base, path: '/admin/tables/:table', roles: ['super_admin', 'finance'], element: page('TablesPage'), spec: canvasSpecs['M-03'] },
  { ...base, path: '/admin/emails', roles: [...admins, 'coordinator'], element: page('EmailsPage'), spec: M04, nav: { labelKey: 'core.nav.emails', icon: '✉', order: 13, group: G } },
  { ...base, path: '/admin/whatsapp', roles: [...admins, 'coordinator', 'front_desk'], element: page('WhatsAppPage'), spec: M05, nav: { labelKey: 'core.nav.whatsapp', icon: '☏', order: 14, group: G } },
  { ...base, path: '/admin/crm', roles: crm, element: page('CrmPage'), spec: M06, nav: { labelKey: 'core.nav.crm', icon: '☺', order: 15, group: G } },
  // Static segment outranks the :id param in React Router v6, so /admin/crm/deletions never reaches MemberPage.
  { ...base, path: '/admin/crm/deletions', roles: admins, element: page('DeletionsPage'), spec: M11, nav: { labelKey: 'admin.deletions.nav', icon: '⌫', order: 15.5, group: G } },
  { ...base, path: '/admin/crm/:id', roles: crm, element: page('MemberPage'), spec: M06 },
  { ...base, path: '/admin/activity', roles: [...admins, 'coordinator', 'finance'], element: page('ActivityPage'), spec: M07, nav: { labelKey: 'core.nav.activity', icon: '≡', order: 16, group: G } },
  { ...base, path: '/admin/settings', roles: [...admins, 'coordinator', 'finance'], element: page('SettingsPage', { group: 'general' }), spec: M08a, nav: { labelKey: 'core.nav.settings', icon: '⚙', order: 17, group: G } },
  { ...base, path: '/admin/settings/features', roles: [...admins, 'coordinator', 'finance'], element: page('SettingsPage', { group: 'features' }), spec: M08b },
  { ...base, path: '/admin/settings/payments', roles: [...admins, 'finance'], element: page('SettingsPage', { group: 'payments' }), spec: M08c },
  { ...base, path: '/admin/settings/communications', roles: [...admins, 'coordinator'], element: page('SettingsPage', { group: 'communications' }), spec: M08d },
  { ...base, path: '/admin/settings/branding', roles: admins, element: page('SettingsPage', { group: 'branding' }), spec: M08e },
  { ...base, path: '/admin/settings/content', roles: [...admins, 'coordinator'], element: page('SettingsPage', { group: 'content' }), spec: M08f },
  { ...base, path: '/admin/integrations', roles: admins, element: page('IntegrationsPage'), spec: M10, nav: { labelKey: 'core.nav.integrations', icon: '⇄', order: 21, group: G } },
  { ...base, path: '/admin/finance', roles: [...admins, 'finance'], element: page('FinancePage'), spec: M09, nav: { labelKey: 'admin.finance.nav', icon: '◇', order: 18, group: G } },
  { ...base, path: '/admin/finance/payouts', roles: [...admins, 'finance'], element: page('PayoutsPage'), spec: M09a, nav: { labelKey: 'admin.payouts.nav', icon: '⊞', order: 19, group: G } },
  { ...base, path: '/admin/finance/payouts/:id', roles: [...admins, 'finance'], element: page('PayoutRunPage'), spec: M09b },
  { ...base, path: '/admin/finance/expenses', roles: [...admins, 'finance'], element: page('ExpensesPage'), spec: M09c, nav: { labelKey: 'admin.expenses.nav', icon: '⊟', order: 20, group: G } },
];
