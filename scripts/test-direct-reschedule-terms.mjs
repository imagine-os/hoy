// RS-09: use exact finite recorded terms, never today's catalog or invented legacy expiry.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {createSyntheticAdmissionCustomer} from './synthetic-admission-contact.mjs';
const scratch=await mkdtemp(join(tmpdir(),'hoy-direct-reschedule-')),memory=new Map(),checks=[];let denyStorage=false;
const withList=(data,list)=>new Proxy({},{get:(_target,key)=>{if(key==='list')return list;const value=Reflect.get(data,key,data);return typeof value==='function'?value.bind(data):value;}});
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>{if(denyStorage)throw Error('quota');memory.set(k,v);}};
try{
 const file=join(scratch,'adapter.mjs');await build({stdin:{resolveDir:process.cwd(),contents:"export{MockProvider}from'./src/data/MockProvider';export{tableNames}from'./src/data/schema';export{recordPayment}from'./src/modules/customer/payments';export{rescheduleBooking,rescheduleEntitlement}from'./src/modules/customer/rescheduleCommand';export{resolveOperationalQuote,freezeSaleQuote}from'./src/data/operationalQuotes';export{addDays,atStudioTime}from'./src/i18n/format';export{bookingPaymentStatus}from'./src/modules/customer/bookingPaymentStatus';"},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
 const {MockProvider,tableNames,recordPayment,rescheduleBooking,rescheduleEntitlement,resolveOperationalQuote,freezeSaleQuote,addDays,atStudioTime,bookingPaymentStatus}=await import(pathToFileURL(file));
 const setup=async(kind='single',fallback=7)=>{
  memory.clear();denyStorage=false;const data=new MockProvider();await createSyntheticAdmissionCustomer(data,'qa_direct_move');
  const base=data.peek('class_sessions').find(s=>s.status==='scheduled');
  const make=(id,days)=>{const start=atStudioTime(addDays(new Date(),days),12,0).getTime();return data.insert('class_sessions',{...base,id,template_id:null,starts_at:new Date(start).toISOString(),ends_at:new Date(start+50*60000).toISOString(),capacity:8,booked_count:0,status:'scheduled'});};
  const original=await make('qa_direct_original',2),target=await make('qa_direct_target',3);
  const quote=freezeSaleQuote(resolveOperationalQuote(data.peek('plans'),kind),1,fallback);
  const payment=await recordPayment(data,{userId:'qa_direct_move',planId:quote.planId,amount:quote.chargedAmount,method:'card',result:{status:'approved',ref:'FICTIONAL_MOVE'},ivaRate:0,quote});
  const booking=await data.insert('bookings',{user_id:'qa_direct_move',session_id:original.id,status:'booked',paid_with:kind,ledger_id:null,payment_id:payment.id});
  const input={userId:booking.user_id,role:'customer',bookingId:booking.id,fromSessionId:original.id,toSessionId:target.id};
  const snapshot=()=>JSON.stringify(Object.fromEntries(tableNames.map(t=>[t,data.peek(t)])));
  const finance=()=>JSON.stringify({payments:data.peek('payments'),ledger:data.peek('class_ledger'),invoices:data.peek('invoices'),messages:data.peek('message_log')});
  return{data,original,target,quote,payment,booking,input,snapshot,finance};
 };
 for(const kind of ['single','trial']){
  const {data,quote,payment,booking,input,snapshot,finance}=await setup(kind),before=snapshot(),money=finance();
  assert.deepEqual(rescheduleEntitlement([],data.peek('payments'),booking),{expires_at:quote.entitlementExpiresAt,frozen_from:null,frozen_until:null});
  for(const failAfterWrites of [1,2,3]){await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input),{failAfterWrites}),/mock_injected/);assert.equal(snapshot(),before);}
  denyStorage=true;try{await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input)),/quota/);}finally{denyStorage=false;}assert.equal(snapshot(),before);
  let current=true;
  await assert.rejects(data.atomic(tx=>rescheduleBooking(withList(tx,async(table,query)=>{const rows=await tx.list(table,query);if(table==='payments')current=false;return rows;}),{...input,control:{isCurrent:()=>current}})),/admission_context_changed/);assert.equal(snapshot(),before);
  const next=await data.atomic(tx=>rescheduleBooking(withList(tx,async(table,query)=>{assert.notEqual(table,'plans','no current-price lookup');return tx.list(table,query);}),input),{idempotencyKey:`qa_move_${kind}`});
  const after=snapshot();await data.atomic(tx=>rescheduleBooking(tx,input),{idempotencyKey:`qa_move_${kind}`});assert.equal(snapshot(),after);
  assert.equal(next.payment_id,payment.id);assert.equal(next.ledger_id,null);assert.equal(bookingPaymentStatus(next,[],data.peek('payments')),'confirmed');assert.equal(finance(),money);
  const restored=new MockProvider();assert.equal(bookingPaymentStatus(restored.peek('bookings').find(b=>b.id===next.id),[],restored.peek('payments')),'confirmed');
  checks.push(`${kind}: cross-day saved finite terms, all staged-write/quota/context faults roll back, replay once, same charge/receipt and no credit or outbox change`);
 }
 for(const kind of ['single','trial']){
  const {data,quote,input,target,snapshot}=await setup(kind);const at=Date.parse(quote.entitlementExpiresAt+'T17:00:00Z');
  await data.update('class_sessions',target.id,{starts_at:new Date(at+86400000).toISOString(),ends_at:new Date(at+86400000+50*60000).toISOString()});
  const before=snapshot();await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input)),/package_expired/);assert.equal(snapshot(),before);
  await data.update('class_sessions',target.id,{starts_at:new Date(at).toISOString(),ends_at:new Date(at+50*60000).toISOString()});
  await data.atomic(tx=>rescheduleBooking(tx,input));checks.push(`${kind}: recorded expiry is inclusive; next day rejected without writes`);
 }
 {
  const {data,booking,input,snapshot}=await setup('single',null),before=snapshot();
  assert.equal(rescheduleEntitlement([],data.peek('payments'),booking),null,'null expiry is never unlimited permission');
  await assert.rejects(data.atomic(tx=>rescheduleBooking(tx,input)),/reschedule_entitlement_unresolved/);assert.equal(snapshot(),before);checks.push('null recorded expiry retains unresolved cross-day fallback');
 }
 for(const fault of ['missing','foreign-owner','foreign-tenant','duplicate','pending','missing-receipt','changed-quote','wrong-kind']){
  const {data,input,snapshot}=await setup(),before=snapshot();
  await assert.rejects(data.atomic(tx=>rescheduleBooking(withList(tx,async(table,query)=>{
   const rows=await tx.list(table,query);if(table!=='payments')return rows;
   return rows.flatMap(row=>{if(row.user_id!==input.userId)return[row];if(fault==='missing')return[];if(fault==='duplicate')return[row,structuredClone(row)];const r=structuredClone(row);if(fault==='foreign-owner')r.user_id='qa_other';if(fault==='foreign-tenant')r.tenant_id='qa_other';if(fault==='pending')r.status='pending';if(fault==='missing-receipt')delete r.frontend_receipt;if(fault==='changed-quote')r.frontend_quote.entitlementExpiresAt='2099-01-01';if(fault==='wrong-kind')r.frontend_quote.itemId='pack12';return[r];});
  }),input)),/reschedule_entitlement_unresolved/);assert.equal(snapshot(),before);checks.push(`${fault}: untrusted charge/terms read cannot move a booking or mutate history`);
 }
 {
  const b={id:'b',tenant_id:'ten_hoy',user_id:'u',paid_with:'package',ledger_id:'d',payment_id:'other'},rows=[{id:'g',tenant_id:'ten_hoy',user_id:'u',delta:1,reason:'purchase',payment_id:'p',expires_at:'2030-01-01'},{id:'d',tenant_id:'ten_hoy',user_id:'u',delta:-1,reason:'booking',purchase_ledger_id:'g',payment_id:'p'}],payments=[{id:'p',tenant_id:'ten_hoy',user_id:'u',status:'approved'},{id:'other',tenant_id:'ten_hoy',user_id:'u',status:'approved'}];
  assert.throws(()=>rescheduleEntitlement(rows,payments,b),/reschedule_entitlement_unresolved/);checks.push('package path rejects contradictory declared direct reference');
 }
 console.log(`PASS recorded single/trial reschedule terms: ${checks.length} groups`);
 if(process.env.QA_OUTPUT){await mkdir(process.env.QA_OUTPUT,{recursive:true});await writeFile(join(process.env.QA_OUTPUT,'results.json'),JSON.stringify({checks,errors:[]},null,2));}
}finally{denyStorage=false;await rm(scratch,{recursive:true,force:true});}
