import {lazyPages} from '../../app/lazyPage';
import {PRODUCTION_BUILD} from '../../config/launch';
import type {RouteDef} from '../../specs/types';
import {giftDemoSpec} from './spec';
export {strings} from './strings';
/** Review build only: gift purchase intents are not launch scope (gap analysis (H)); production sells gifts at /app/gift-voucher (H-6). */
const reviewRoutes=():RouteDef[]=>{const page=lazyPages(()=>import('./page'));return[{path:'/app/voucher-gifts',element:page('VoucherGiftPage'),spec:giftDemoSpec,roles:giftDemoSpec.roles,surface:'customer',layout:'mobile',nav:{labelKey:'giftDemo.title',icon:'gift',order:15}}];};
export const routes:RouteDef[]=PRODUCTION_BUILD?[]:reviewRoutes();
