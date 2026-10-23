import { requireSessionAdmission, assertAdmissionContext, type AdmissionControl } from '../../data/sessionAdmission';
/** New offers follow current admission availability; order and claim-window policy stay unchanged. */
import type {DataProvider} from '../../data/types';
import type {WaitlistRow} from './hooks';
import {tenant} from '../../tenant/tenant';
import {MS} from '../../i18n/format';
import {policy} from './policy';
export async function guardStudioWaitlist(data:DataProvider,sessionId:string,control:AdmissionControl={}){
 await requireSessionAdmission(data,sessionId,control);
}
export async function promoteStudioWaitlist(data:DataProvider,sessionId:string,control:AdmissionControl={},withinTransaction=false){
 const run=async(tx:DataProvider)=>{
  try { await guardStudioWaitlist(tx,sessionId,control); } catch(error) { if(withinTransaction && error instanceof Error && error.message==='session_unavailable') return; throw error; }
  const waiting=await tx.list<WaitlistRow>('waitlist',{where:{tenant_id:tenant.id,session_id:sessionId,status:'waiting'},orderBy:{column:'position'}});
  if(waiting.some(w=>w.tenant_id!==tenant.id||w.session_id!==sessionId||w.status!=='waiting'))throw Error('studio_cancel_waitlist_unavailable');
  const first=waiting[0];if(!first)return;
  await guardStudioWaitlist(tx,sessionId,control);const now=Date.now();
  assertAdmissionContext(control);
  await tx.update('waitlist',first.id,{status:'offered',offered_at:new Date(now).toISOString(),claim_until:new Date(now+policy.claimWindowMinutes*MS.min).toISOString()});
  assertAdmissionContext(control);
 };
 return data.atomic&&!withinTransaction?data.atomic(run):run(data);
}
