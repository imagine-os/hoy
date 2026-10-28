import { lazyPages } from '../../app/lazyPage';
import { PRODUCTION_BUILD } from '../../config/launch';
import type { RouteDef } from '../../specs/types';
import { adminSpec, claimSpec, deskSpec } from './specs';
import * as cos from './production/specs';
import { strings as reviewStrings } from './strings';
import { productionStrings } from './production/strings';
export const strings = { ...reviewStrings, ...productionStrings };
/** Review build: the demo vouchers and their extras. Production (H-6): Company OS credits vouchers only. */
// The lazy imports sit inside each list, so the build that does not use a list ships none of its pages.
const reviewRoutes = (): RouteDef[] => { const page = lazyPages(() => import('./pages')), desk = lazyPages(() => import('./DeskPage')); return [
 { path: '/staff/vouchers', element: desk('VoucherDeskPage'), spec: deskSpec, roles: deskSpec.roles, surface:'staff', layout:'desktop', nav:{labelKey:'desk.title',icon:'gift',order:4.5,group:'core.nav.group.staff'} },
 { path: '/admin/vouchers', element: page('VoucherAdminPage'), spec: adminSpec, roles: adminSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'vouchers.title', icon: 'gift', order: 15.7, group: 'core.nav.group.community' } },
 { path: '/app/vouchers', element: page('VoucherClaimPage'), spec: claimSpec, roles: claimSpec.roles, surface: 'customer', layout: 'mobile' },
 { path: '/app/vouchers/:id', element: page('VoucherClaimPage'), spec: claimSpec, roles: claimSpec.roles, surface: 'customer', layout: 'mobile' },
]; };
const productionRoutes = (): RouteDef[] => { const prod = lazyPages(() => import('./production/pages')); return [
 { path: '/staff/vouchers', element: prod('VoucherDeskPage'), spec: cos.deskSpec, roles: cos.deskSpec.roles, surface: 'staff', layout: 'desktop', nav: { labelKey: 'vouchers.cos.desk.page', icon: 'gift', order: 4.5, group: 'core.nav.group.staff' } },
 { path: '/admin/vouchers', element: prod('VoucherStudioPage'), spec: cos.studioSpec, roles: cos.studioSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'vouchers.title', icon: 'gift', order: 15.7, group: 'core.nav.group.community' } },
 { path: '/app/vouchers', element: prod('VoucherRedeemPage'), spec: cos.redeemSpec, roles: cos.redeemSpec.roles, surface: 'customer', layout: 'mobile' },
 { path: '/app/vouchers/:code', element: prod('VoucherRedeemPage'), spec: cos.redeemSpec, roles: cos.redeemSpec.roles, surface: 'customer', layout: 'mobile' },
 { path: '/app/gift-voucher', element: prod('GiftVoucherPage'), spec: cos.giftSpec, roles: cos.giftSpec.roles, surface: 'customer', layout: 'mobile' },
]; };
export const routes: RouteDef[] = PRODUCTION_BUILD ? productionRoutes() : reviewRoutes();
