import type {RouteDef} from '../../specs/types';
import {lazyPages} from '../../app/lazyPage';
import {PRODUCTION_BUILD} from '../../config/launch';
import {transferSpec} from './specs';
import {pendingPaymentsSpec,transferPaySpec,paymentsReportSpec} from './launch/specs';
import {payLaunchStrings} from './launch/strings';
import {strings as reviewStrings} from './strings';
export const strings={...reviewStrings,...payLaunchStrings};
// The production build talks to Company OS (H-5 launch screens); the review build keeps the local demo queue.
const review=lazyPages(()=>import('./reviewPages')),launch=lazyPages(()=>import('./launch/pages'));
export const routes:RouteDef[]=PRODUCTION_BUILD?[
 {path:'/staff/transfers',element:launch('PendingPaymentsPage'),spec:pendingPaymentsSpec,roles:pendingPaymentsSpec.roles,surface:'staff',layout:'desktop',nav:{labelKey:'payLaunch.queue.title',icon:'bank',order:3.5,group:'core.nav.group.staff'}},
 {path:'/app/pay/:what/:id',element:launch('TransferPayPage'),spec:transferPaySpec,roles:transferPaySpec.roles,surface:'customer',layout:'mobile'},
 {path:'/admin/payments/report',element:launch('PaymentsReportPage'),spec:paymentsReportSpec,roles:paymentsReportSpec.roles,surface:'admin',layout:'desktop',nav:{labelKey:'payLaunch.report.title',icon:'finance',order:18.2,group:'core.nav.group.finance'}},
]:[{path:'/staff/transfers',element:review('TransferQueuePage'),spec:transferSpec,roles:['super_admin','admin','front_desk'],surface:'staff',layout:'desktop',nav:{labelKey:'transfers.title',icon:'bank',order:3.5,group:'core.nav.group.staff'}}];
