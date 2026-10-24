// Synthetic actual mock commands. No browser, bank refund, email delivery or current-catalog terms.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSyntheticAdmissionCustomer} from './synthetic-admission-contact.mjs';
const temporary=await mkdtemp(join(tmpdir(),'hoy-studio-direct-')),memory=new Map(),checks=[];
const RealDate=Date,fixed='2026-10-24T15:00:00Z';let wall=RealDate.parse(fixed);const now=()=>wall,admin={actorId:'usr_admin',role:'admin'};
globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[wall]));}static now(){return now();}};
let quota=false;globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>{if(quota&&k==='hoyos.db.v1')throw Error('FICTIONAL quota');memory.set(k,v);}};
try{
 const file=join(temporary,'commands.mjs');await build({stdin:{resolveDir:process.cwd(),contents:"export{MockProvider}from'./src/data/MockProvider';export{recordPayment,activatePaidPackage}from'./src/modules/customer/payments';export{resolveOperationalQuote,freezeSaleQuote}from'./src/data/operationalQuotes';export{bookWithPackage}from'./src/data/deskBooking';export{packageState}from'./src/data/packages';export{readStudioImpact,cancelStudioClass,readOwnStudioReturn,studioReturnId}from'./src/modules/classSchedule/studioCancellation';"},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
 const {MockProvider,recordPayment,activatePaidPackage,resolveOperationalQuote,freezeSaleQuote,bookWithPackage,packageState,readStudioImpact:review,cancelStudioClass:cancel,readOwnStudioReturn:own,studioReturnId}=await import(pathToFileURL(file));
 const snapshot=()=>memory.get('hoyos.db.v1');
 async function setup(kinds=['single']){
  memory.clear();quota=false;wall=RealDate.parse(fixed);const data=new MockProvider(),seed=data.peek('class_sessions').find(s=>s.status==='scheduled');
  const session=await data.insert('class_sessions',{...seed,id:'qa_studio_direct',title:'FICTIONAL direct cancellation',template_id:null,starts_at:'2026-10-26T17:00:00Z',ends_at:'2026-10-26T17:50:00Z',capacity:8,booked_count:0,status:'scheduled'}),people=[];
  for(const[k,kind]of kinds.entries()){
   const userId='qa_studio_direct_'+k;await createSyntheticAdmissionCustomer(data,userId);const quote=freezeSaleQuote(resolveOperationalQuote(data.peek('plans'),kind==='package'?'pack12':kind),1,90);
   const {payment,booking}=await data.atomic(async tx=>{const payment=await recordPayment(tx,{userId,planId:quote.planId,amount:quote.chargedAmount,method:'card',result:{status:'approved',ref:'FICTIONAL_DIRECT'},ivaRate:.19,quote});let booking;
    if(kind==='package'){await activatePaidPackage(tx,{paymentId:payment.id,userId,planId:quote.planId,classes:quote.classes,expiresAt:quote.entitlementExpiresAt});booking=await bookWithPackage(tx,{userId,sessionId:session.id,status:'booked',paymentId:payment.id});}
    else booking=await tx.insert('bookings',{user_id:userId,session_id:session.id,status:'booked',paid_with:kind,ledger_id:null,payment_id:payment.id,mat_number:k+1,checked_in_at:null,cancelled_at:null,rated:false});return{payment,booking};});people.push({userId,kind,quote,payment,booking});wall+=1000;
  }
  const prepare=async()=>{const impact=await review(data,admin,session.id,{now});return{impact,command:{...admin,sessionId:session.id,requestId:'qa_studio_direct_nonce',expected:impact.expected,bookingIds:impact.attendees.map(a=>a.booking.id),reason:'FICTIONAL reason'}};};
  return{data,session,people,prepare};
 }
 for(const kinds of[['single'],['trial'],['single','trial','package']]){
  const f=await setup(kinds),{impact,command}=await f.prepare();assert.deepEqual(impact.issues,[]);assert.equal(impact.activeCount,kinds.length);assert.equal(impact.attendees.length,kinds.length);
  const payments=JSON.stringify(f.data.peek('payments')),priorLedger=f.data.peek('class_ledger'),result=await cancel(f.data,command,{now});assert.equal(result.items.length,kinds.length);assert.equal((await f.data.get('class_sessions',f.session.id)).booked_count,0);
  for(const p of f.people){const id=await studioReturnId(f.session.id,p.booking.id),returned=await f.data.get('class_ledger',id);assert.equal(returned.delta,1);assert.equal(returned.expires_at,p.quote.entitlementExpiresAt);assert.equal(returned.payment_id,p.payment.id);assert.equal((await f.data.get('bookings',p.booking.id)).status,'cancelled');if(p.kind!=='package'){assert.equal(returned.purchase_ledger_id,null);assert.deepEqual(returned.frontend_quote,p.quote);assert.equal(result.items.find(x=>x.bookingId===p.booking.id).kind,'direct_paid');}else assert(result.items.find(x=>x.bookingId===p.booking.id).grantId);
   const readback=await own(f.data,{actorId:p.userId,role:'customer'},p.booking.id,{now});assert.equal(readback.status,'verified');assert.equal(readback.balance,p.kind==='package'?12:1);assert.equal(readback.expiresAt,p.quote.entitlementExpiresAt);
  }
  assert.equal(JSON.stringify(f.data.peek('payments')),payments);for(const old of priorLedger)assert.deepEqual(await f.data.get('class_ledger',old.id),old);const before=snapshot();assert.deepEqual(await cancel(f.data,command,{now:()=>Date.parse('2026-10-27T00:00:00Z')}),result);assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');checks.push(`${kinds.join('+')}: every signed-up regular attendee gets exactly one original-term return, no charge/receipt rewrite, own readback and after-start replay`);
 }
 {
  const f=await setup(),{command}=await f.prepare();await cancel(f.data,command,{now});const p=f.people[0],target=await f.data.insert('class_sessions',{...f.session,id:'qa_studio_return_reuse',starts_at:'2026-10-27T17:00:00Z',ends_at:'2026-10-27T17:50:00Z',booked_count:0,status:'scheduled'});
  const booking=await f.data.atomic(tx=>bookWithPackage(tx,{userId:p.userId,sessionId:target.id,status:'booked'}));assert(booking.ledger_id);assert.equal(packageState(f.data.peek('class_ledger').filter(x=>x.user_id===p.userId),'2026-10-24').balance,0);const before=snapshot();await cancel(f.data,command,{now});assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');const ownResult=await own(f.data,{actorId:p.userId,role:'customer'},p.booking.id,{now});assert.equal(ownResult.status,'verified');assert.equal(ownResult.balance,0);checks.push('direct returned class is actually usable by bookWithPackage; later consumption preserves replay/readback without another return');
 }
 for(let n=1;n<=4;n++){
  const f=await setup(),{command}=await f.prepare(),before=snapshot();await assert.rejects(cancel(f.data,command,{now,failAfterWrites:n}),/mock_injected/);assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');await cancel(f.data,command,{now});assert.equal(f.data.peek('class_ledger').filter(x=>x.id.startsWith('studio_return_v1_')).length,1);
 }checks.push('all four direct cancellation staged write faults roll back every table; same command retry creates one return');
 {
  const f=await setup(),{command}=await f.prepare(),before=snapshot();quota=true;await assert.rejects(cancel(f.data,command,{now}),/quota/);quota=false;assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');await cancel(f.data,command,{now});checks.push('database persistence quota rolls back direct cancellation and allows exact same-command retry');
 }
 for(const kind of['missing-payment','foreign-payment','duplicate-payment','unapproved','missing-receipt','null-expiry','wrong-kind','wrong-classes','wrong-quantity','conflicting-debit','duplicate-active-payment','previous-origin']){
  const f=await setup(),p=f.people[0],stored=JSON.parse(snapshot()),payment=stored.db.payments.find(x=>x.id===p.payment.id),booking=stored.db.bookings.find(x=>x.id===p.booking.id);
  if(kind==='missing-payment')stored.db.payments=stored.db.payments.filter(x=>x!==payment);
  if(kind==='foreign-payment')payment.tenant_id='qa_foreign';
  if(kind==='duplicate-payment')stored.db.payments.push({...payment,tenant_id:'qa_foreign'});
  if(kind==='unapproved')payment.status='pending';
  if(kind==='missing-receipt')delete payment.frontend_receipt;
  if(['null-expiry','wrong-kind','wrong-classes','wrong-quantity'].includes(kind)){const q=payment.frontend_quote;if(kind==='null-expiry')q.entitlementExpiresAt=null;if(kind==='wrong-kind')q.itemId='trial';if(kind==='wrong-classes')q.classes=2;if(kind==='wrong-quantity')q.quantity=2;payment.frontend_receipt.facts.quote=structuredClone(q);}
  if(kind==='conflicting-debit')booking.ledger_id='qa_missing_debit';
  if(kind==='duplicate-active-payment')stored.db.bookings.push({...booking,id:'qa_duplicate_active',session_id:'qa_other_session'});
  if(kind==='previous-origin')stored.db.class_ledger.push({id:'qa_old_origin',tenant_id:p.payment.tenant_id,user_id:p.userId,plan_id:p.payment.plan_id,payment_id:p.payment.id,delta:1,reason:'purchase',purchase_ledger_id:null,expires_at:p.quote.entitlementExpiresAt,frozen_from:null,frozen_until:null,created_at:fixed,updated_at:fixed});
  memory.set('hoyos.db.v1',JSON.stringify(stored));const data=new MockProvider(),impact=await review(data,admin,f.session.id,{now}),before=snapshot();assert(impact.issues.includes('lineage'));await assert.rejects(cancel(data,{...admin,sessionId:f.session.id,requestId:'qa_bad',expected:impact.expected,bookingIds:impact.attendees.map(a=>a.booking.id),reason:null},{now}),/cannot_verify/);assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');checks.push(`${kind}: missing/ambiguous/unsupported origin or party fails closed without partial cancellation`);
 }
 for(const defect of['return-quantity','return-expiry','receipt-copy','booking-copy','foreign-return-duplicate','stored-quote-digest']){
  const f=await setup(),{command}=await f.prepare();await cancel(f.data,command,{now});const stored=JSON.parse(snapshot()),p=f.people[0],returned=stored.db.class_ledger.find(x=>x.id.startsWith('studio_return_v1_')),receipt=stored.db.audit_log.find(x=>x.id.startsWith('studio_cancel_v1_'));
  if(defect==='return-quantity')returned.delta=2;if(defect==='return-expiry')returned.expires_at='2099-01-01';if(defect==='receipt-copy')stored.db.payments.find(x=>x.id===p.payment.id).frontend_receipt.item.en='changed';if(defect==='booking-copy')stored.db.bookings.find(x=>x.id===p.booking.id).rated=true;if(defect==='foreign-return-duplicate')stored.db.class_ledger.push({...returned,tenant_id:'qa_foreign'});if(defect==='stored-quote-digest')receipt.diff.result.items[0].quoteDigest='0'.repeat(64);
  memory.set('hoyos.db.v1',JSON.stringify(stored));const data=new MockProvider(),before=snapshot();await assert.rejects(cancel(data,command,{now}),/studio_cancel_/);assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');checks.push(`${defect}: replay rejects corrupt proof without issuing another unit`);
 }
 for(const stage of['before','read','write','after-commit']){
  const f=await setup(),{command}=await f.prepare(),before=snapshot();let live=stage!=='before';const identity=()=>live?admin:{actorId:'usr_public',role:'public'};
  if(stage==='read'){const atomic=f.data.atomic.bind(f.data);f.data.atomic=(fn,opts)=>atomic(tx=>fn(new Proxy({},{get(_t,k){const t=tx,v=Reflect.get(t,k);if(k==='list')return async(...args)=>{const rows=await v.apply(t,args);if(args[0]==='payments'&&args[1]?.where?.id)live=false;return rows;};return typeof v==='function'?v.bind(t):v;}})),opts);}
  if(stage==='write'){const atomic=f.data.atomic.bind(f.data);f.data.atomic=(fn,opts)=>atomic(tx=>fn(new Proxy({},{get(_t,k){const t=tx,v=Reflect.get(t,k);if(k==='insert')return async(...args)=>{const r=await v.apply(t,args);live=false;return r;};return typeof v==='function'?v.bind(t):v;}})),opts);}
  if(stage==='after-commit'){const atomic=f.data.atomic.bind(f.data);f.data.atomic=async(...args)=>{const r=await atomic(...args);live=false;return r;};}
  await assert.rejects(cancel(f.data,command,{now,currentActor:identity}),/context/);if(stage!=='after-commit')assert(snapshot()===before,'rejected/precommit operation must preserve entire stored database');else{const data=new MockProvider(),committed=snapshot();await cancel(data,command,{now});assert(snapshot()===committed,'replay must preserve entire stored database');}checks.push(`${stage}: actor context fence withholds stale result; precommit rollback or honest postcommit read-only retry`);
 }

 for(const defect of['forged-admin','forged-super-admin','missing-role','duplicate-role','foreign-only-role','malformed-role']){
  const f=await setup(),{command}=await f.prepare();let who=admin;
  if(defect.startsWith('forged'))who={actorId:f.people[0].userId,role:defect==='forged-admin'?'admin':'super_admin'};
  else{const roles=f.data.peek('user_roles').filter(r=>r.user_id===admin.actorId);for(const r of roles)await f.data.remove('user_roles',r.id);if(defect==='duplicate-role')for(const id of['qa_role_a','qa_role_b'])await f.data.insert('user_roles',{id,user_id:admin.actorId,role:'admin'});if(defect==='foreign-only-role')await f.data.insert('user_roles',{id:'qa_foreign_role',tenant_id:'qa_foreign',user_id:admin.actorId,role:'admin'});if(defect==='malformed-role')await f.data.insert('user_roles',{id:'qa_bad_role',user_id:admin.actorId,role:'qa_invalid'});}
  const before=snapshot();await assert.rejects(review(f.data,who,f.session.id,{now,currentActor:()=>who}),/denied/);await assert.rejects(cancel(f.data,{...command,...who},{now,currentActor:()=>who}),/denied/);assert(snapshot()===before,'forged/missing/ambiguous persisted studio privilege cannot mutate any stored row');checks.push(`${defect}: persisted role required before privileged review and new cancellation`);
 }
 for(const mode of['admin','super_admin','super_admin_view_admin']){
  const f=await setup(),role=mode==='super_admin'?'super_admin':'admin',actorId=mode==='admin'?admin.actorId:f.data.peek('user_roles').find(r=>r.role==='super_admin').user_id,who={actorId,role};const impact=await review(f.data,who,f.session.id,{now,currentActor:()=>who}),command={...who,sessionId:f.session.id,requestId:'qa_role_valid',expected:impact.expected,bookingIds:impact.attendees.map(a=>a.booking.id),reason:null};await cancel(f.data,command,{now,currentActor:()=>who});const before=snapshot();await cancel(f.data,command,{now,currentActor:()=>who});assert(snapshot()===before,'authorized persisted staff replay remains read only');checks.push(`${mode}: valid persisted studio privilege and legitimate view-as preserve cancellation/replay`);
 }
 {
  const f=await setup(),{command}=await f.prepare();await cancel(f.data,command,{now});for(const r of f.data.peek('user_roles').filter(r=>r.user_id===admin.actorId))await f.data.remove('user_roles',r.id);const before=snapshot();await assert.rejects(cancel(f.data,command,{now,currentActor:()=>admin}),/denied/);assert(snapshot()===before);checks.push('persisted role loss rejects cached committed cancellation replay before returning privileged acknowledgement');
 }
 {
  const f=await setup(),{command}=await f.prepare(),before=snapshot(),atomic=f.data.atomic.bind(f.data);let removed=false,cancellationWrites=0;
  f.data.atomic=(fn,options)=>atomic(tx=>fn(new Proxy({},{get(_t,k){const v=Reflect.get(tx,k);if(k==='get')return async(...args)=>{const result=await v.apply(tx,args);if(!removed&&args[0]==='class_ledger'&&args[1].startsWith('studio_return_v1_')){removed=true;for(const r of tx.peek('user_roles').filter(r=>r.user_id===admin.actorId))await tx.remove('user_roles',r.id);}return result;};if(k==='update')return async(...args)=>{if(args[0]==='class_sessions'||args[0]==='bookings')cancellationWrites++;return v.apply(tx,args);};return typeof v==='function'?v.bind(tx):v;}})),options);
  await assert.rejects(cancel(f.data,command,{now,currentActor:()=>admin}),/denied/);assert(removed);assert.equal(cancellationWrites,0);assert(snapshot()===before);checks.push('persisted role loss during final prewrite read is freshly rejected before first class/booking mutation, full transaction rolled back');
 }
 const out=process.env.QA_OUTPUT;if(out){await mkdir(out,{recursive:true});await writeFile(join(out,'results.json'),JSON.stringify({checks,scope:'Actual model commands with synthetic localStorage only; no browser, external payments or email.'},null,2));}console.log(JSON.stringify({feature:'AD-02',checks,groups:checks.length},null,2));
}finally{quota=false;globalThis.Date=RealDate;await rm(temporary,{recursive:true,force:true});}
