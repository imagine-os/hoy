import { lazyPages } from '../../app/lazyPage';
import { PRODUCTION_BUILD } from '../../config/launch';
import type { RouteDef } from '../../specs/types';
import { productSpec, productPreviewSpec, productMasterSpec } from './spec';
export { strings } from './strings';
const page = lazyPages(() => import('./pages'));
const launch = lazyPages(() => import('./launch/pages'));
// Production: the Company OS product master (H-5), editable by admin and read-only for the front desk (role matrix
// `product-master`: front desk `read`; the page hides every edit control for that role).
// Review: the local draft prototype and its preview, unchanged.
export const routes: RouteDef[] = PRODUCTION_BUILD ? [
  { path: '/admin/products', element: launch('ProductMasterPage'), spec: productMasterSpec, roles: productMasterSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'products.title', icon: 'ticket', order: 15.8, group: 'core.nav.group.community' } },
] : [{path:'/admin/products/preview',element:page('ProductPreviewPage'),spec:productPreviewSpec,roles:productPreviewSpec.roles,surface:'admin',layout:'desktop'}, { path:'/admin/products',element:page('ProductsPage'),spec:productSpec,roles:productSpec.roles,surface:'admin',layout:'desktop',nav:{labelKey:'products.title',icon:'ticket',order:15.8,group:'core.nav.group.community'} }];
