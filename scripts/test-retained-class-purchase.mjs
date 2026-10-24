// Isolated fictional one-browser storage; no provider, credentials or external charge.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-retained-class-')),storage=new Map(),checks=[];
let faultRead=false,faultMarker=false,faultDatabase=false,faultRemove=false;
globalThis.localStorage={getItem:k=>{if(faultRead)throw Error('fictional storage read');return storage.get(k)??null;},setItem:(k,v)=>{if(faultMarker&&k.startsWith('hoyos.retained-class')||faultDatabase&&k==='hoyos.db.v1')throw Error('fictional quota');storage.set(k,v);},removeItem:k=>{if(faultRemove)throw Error('fictional remove');storage.delete(k);}};
let clock='2026-10-24T15:00:00Z';const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[clock]));}static now(){return new RealDate(clock).getTime();}};
try{
 const file=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/data/operationalQuotes';export * from './src/data/retainedClassPurchase';export {freezePatch,resumePatch} from './src/data/packages';export {bookWithPackage} from './src/data/deskBooking';export {readCustomerCancellation,cancelOwnBooking} from './src/modules/customer/customerCancellation';export {readStudioImpact,cancelStudioClass} from './src/modules/classSchedule/studioCancellation';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file});
 const {MockProvider,resolveOperationalQuote,freezeSaleQuote,readRetainedClassPurchase:read,retainClassPurchase:retain,recoverRetainedClassPurchase:recover,executeRetainedClassPurchase:execute,acknowledgeRetainedClassPurchase:ack,discardRetainedClassPurchase:discard,RetainedClassPurchaseError,freezePatch,resumePatch,bookWithPackage,readCustomerCancellation,cancelOwnBooking,readStudioImpact,cancelStudioClass}=await import(pathToFileURL(file));
 const control={isCurrent:()=>true,ivaRate:.19},key=()=>[...storage.keys()].find(k=>k.startsWith('hoyos.retained-class'));
 async function setup(item='pack12'){
  clock='2026-10-24T15:00:00Z';faultRead=faultMarker=faultDatabase=faultRemove=false;storage.clear();const data=new MockProvider(),id='qa_retained_owner';
  await data.insert('users',{id,email:'retained@example.test',phone:'+573000000099',status:'active'});await data.insert('profiles',{user_id:id,full_name:'FICTIONAL Retained Owner',initials:'QA',marketing_optin:false});
  const quote=freezeSaleQuote(resolveOperationalQuote(data.peek('plans'),item),1,90),attempt=retain(id,quote);
  const snapshot=()=>JSON.stringify(JSON.parse(storage.get('hoyos.db.v1')).db),own=()=>({payments:data.peek('payments').filter(r=>r.user_id===id),grants:data.peek('class_ledger').filter(r=>r.user_id===id),bookings:data.peek('bookings').filter(r=>r.user_id===id)});
  return{data,id,quote,attempt,snapshot,own};
 }
 function mutate(change){const db=JSON.parse(storage.get('hoyos.db.v1'));change(db.db);storage.set('hoyos.db.v1',JSON.stringify(db));return new MockProvider();}
 {
  const f=await setup(),old=read(f.id);assert.deepEqual(retain(f.id,{...f.quote,chargedAmount:1}),old,'unacknowledged marker never replaced, even by new choice');
  const [a,b]=await Promise.all([execute(f.data,f.attempt,control),execute(f.data,f.attempt,control)]);assert.equal(a.payment.id,b.payment.id);assert.equal(f.own().payments.length,1);assert.equal(f.own().grants.length,1);assert.equal(f.own().bookings.length,0);assert(read(f.id));
  await ack(f.data,f.attempt,a,control);assert.equal(read(f.id),null);const next=retain(f.id,f.quote);assert.notEqual(next.id,f.attempt.id);const second=await execute(f.data,next,control);assert.notEqual(second.payment.id,a.payment.id);assert.equal(f.own().payments.length,2,'explicit acknowledged new purchase remains allowed');
  checks.push('concurrent click => one payment/grant; explicit verified acknowledgement permits intentional new purchase');
 }
 {
  const f=await setup(),normal=f.data.atomic.bind(f.data);f.data.atomic=async(...args)=>{await normal(...args);throw Error('fictional lost acknowledgement');};
  await assert.rejects(execute(f.data,f.attempt,control),/lost acknowledgement/);assert.equal(f.own().payments.length,1);assert.equal(f.own().grants.length,1);const marker=read(f.id);assert(marker.paymentId&&marker.grantId);
  const fresh=new MockProvider(),before=storage.get('hoyos.db.v1');await fresh.update('plans','plan_pack12',{active:false});const changed=storage.get('hoyos.db.v1');
  const recovered=await recover(fresh,marker,control),retry=await execute(fresh,marker,control);assert.equal(recovered.payment.id,marker.paymentId);assert.deepEqual(retry,recovered);assert.equal(storage.get('hoyos.db.v1'),changed,'recovery does not reprice or rewrite after withdrawal');assert.notEqual(before,changed);
  await ack(fresh,marker,recovered,control);assert.equal(read(f.id),null);checks.push('postcommit lost ack => new provider/read marker/recover/retry/ack exact one payment+grant, even withdrawn current catalog');
 }
 let stagedWrites=0;
 {
  const f=await setup(),normal=f.data.atomic.bind(f.data);f.data.atomic=(action,options)=>normal(async tx=>{return action(new Proxy({}, {get(_t,k){const v=tx[k];if(['insert','update','remove'].includes(k))return async(...args)=>{const r=await v.apply(tx,args);stagedWrites++;return r;};return typeof v==='function'?v.bind(tx):v;}}));},options);await execute(f.data,f.attempt,control);assert(stagedWrites>=4);checks.push(`instrumented actual transaction has ${stagedWrites} staged writes`);
 }
 for(let n=1;n<=stagedWrites;n++){
  const f=await setup(),before=f.snapshot(),normal=f.data.atomic.bind(f.data);f.data.atomic=(action,options)=>normal(action,{...options,failAfterWrites:n});
  await assert.rejects(execute(f.data,f.attempt,control),/mock_injected/);assert.equal(f.snapshot(),before);assert.equal(read(f.id).id,f.attempt.id);f.data.atomic=normal;await execute(f.data,f.attempt,control);assert.equal(f.own().payments.length,1);assert.equal(f.own().grants.length,1);
 }
 checks.push('every staged write fault rolls back full DB; retry retains exact attempt and creates one outcome');
 for(const which of ['database','marker']){
  const f=await setup(),before=f.snapshot();if(which==='database')faultDatabase=true;else faultMarker=true;
  await assert.rejects(execute(f.data,f.attempt,control),which==='database'?/persist|quota/:/retained_purchase_storage/);faultDatabase=faultMarker=false;assert.equal(f.snapshot(),before);assert.equal(read(f.id).id,f.attempt.id);assert.equal(await recover(f.data,f.attempt,control),null);await execute(f.data,f.attempt,control);assert.equal(f.own().payments.length,1);assert.equal(f.own().grants.length,1);
 }
 checks.push('database quota and candidate marker quota abort financial transaction, preserve attempt, allow same-key safe retry');
 {
  const f=await setup(),before=f.snapshot();faultRead=true;assert.throws(()=>retain(f.id,f.quote),/storage/);await assert.rejects(execute(f.data,f.attempt,control),/storage/);faultRead=false;assert.equal(f.snapshot(),before);storage.set(key(),'{bad');assert.throws(()=>read(f.id),/invalid/);assert.throws(()=>retain(f.id,f.quote),/invalid/);assert.equal(storage.get(key()),'{bad');
  storage.delete(key());faultMarker=true;assert.throws(()=>retain(f.id,f.quote),/storage/);faultMarker=false;assert.equal(f.snapshot(),before);checks.push('unreadable/corrupt marker never overwritten; initial storage failure produces no financial writes');
 }
 for(const changeAt of ['before','read','checkout','write','postcommit']){
  const f=await setup(),before=f.snapshot(),normal=f.data.atomic.bind(f.data);let current=changeAt!=='before';const c={isCurrent:()=>current,ivaRate:.19};
  if(changeAt==='read'){const list=f.data.list.bind(f.data);f.data.list=async(...a)=>{const r=await list(...a);current=false;return r;};}
  if(changeAt==='checkout')setTimeout(()=>{current=false;},100);
  if(changeAt==='write')f.data.atomic=(action,options)=>normal(async tx=>{return action(new Proxy({}, {get(_t,k){const v=tx[k];if(k==='insert')return async(...args)=>{const r=await v.apply(tx,args);current=false;return r;};return typeof v==='function'?v.bind(tx):v;}}));},options);
  if(changeAt==='postcommit')f.data.atomic=async(...a)=>{const r=await normal(...a);current=false;return r;};
  await assert.rejects(execute(f.data,f.attempt,c),/context/);assert(read(f.id));if(changeAt!=='postcommit')assert.equal(f.snapshot(),before);else{assert.equal(f.own().payments.length,1);const fresh=new MockProvider();assert((await recover(fresh,read(f.id),control)).payment.id);}
 }
 checks.push('context loss before action, after read, during checkout, after staged write rolls back; postcommit context loss retains exact recoverable outcome');
 for(const fault of ['missing-receipt','foreign-receipt','corrupt-cache','missing-payment','foreign-payment','changed-amount','changed-quote','missing-grant','foreign-grant','changed-grant','duplicate-grant','duplicate-payment-id','owner-inactive']){
  const f=await setup(),result=await execute(f.data,f.attempt,control),marker=read(f.id);
  const fresh=mutate(db=>{
   const receipt=db.audit_log.find(r=>r.id===`mock_transaction_class-purchase:${marker.tenantId}:${marker.userId}:${marker.id}`),p=db.payments.find(r=>r.id===result.payment.id),g=db.class_ledger.find(r=>r.id===result.grant.id);
   if(fault==='missing-receipt')db.audit_log=db.audit_log.filter(r=>r!==receipt);
   if(fault==='foreign-receipt')receipt.tenant_id='foreign';
   if(fault==='corrupt-cache')receipt.diff.result.attemptId='other';
   if(fault==='missing-payment')db.payments=db.payments.filter(r=>r!==p);
   if(fault==='foreign-payment')p.user_id='someone_else';
   if(fault==='changed-amount')p.amount++;
   if(fault==='changed-quote')p.frontend_quote.classes++;
   if(fault==='missing-grant')db.class_ledger=db.class_ledger.filter(r=>r!==g);
   if(fault==='foreign-grant')g.tenant_id='foreign';
   if(fault==='changed-grant')g.delta++;
   if(fault==='duplicate-grant')db.class_ledger.push({...g,id:'qa_duplicate_grant'});
   if(fault==='duplicate-payment-id')db.payments.push({...p,tenant_id:'foreign'});
   if(fault==='owner-inactive')db.users.find(r=>r.id===f.id).status='inactive';
  });const before=storage.get('hoyos.db.v1'),saved=storage.get(key());await assert.rejects(recover(fresh,marker,control),/proof|owner/);await assert.rejects(execute(fresh,marker,control),/proof|owner/);await assert.rejects(ack(fresh,marker,result,control),/proof|owner/);assert.equal(storage.get('hoyos.db.v1'),before);assert.equal(storage.get(key()),saved);
 }
 checks.push('13 corrupt/missing/foreign/ambiguous durable proof cases fail closed without writes, regrant or marker removal');
 {
  const f=await setup(),before=f.snapshot();await assert.rejects(execute(f.data,{...f.attempt,tenantId:'foreign'},control),/invalid/);await assert.rejects(execute(f.data,{...f.attempt,userId:'other'},control),/marker/);await assert.rejects(execute(f.data,{...f.attempt,quote:{...f.quote,classes:999}},control),/marker/);assert.equal(f.snapshot(),before);
  await f.data.update('plans','plan_pack12',{active:false});const withdrawn=f.snapshot();await assert.rejects(execute(f.data,f.attempt,control),/quote_changed/);assert.equal(f.snapshot(),withdrawn);assert.equal(read(f.id).id,f.attempt.id);
  checks.push('changed tenant/owner/quote rejected and new uncommitted withdrawn quote remains same retained attempt');
 }
 {
  const f=await setup(),result=await execute(f.data,f.attempt,control),before=f.snapshot();await assert.rejects(ack(f.data,f.attempt,{...result,attemptId:'other'},control),/proof/);faultRemove=true;await assert.rejects(ack(f.data,f.attempt,result,control),/storage/);faultRemove=false;assert(read(f.id));await assert.rejects(ack(f.data,f.attempt,result,{isCurrent:()=>false}),/context/);assert.equal(f.snapshot(),before);await ack(f.data,f.attempt,result,control);const second=retain(f.id,f.quote);await assert.rejects(ack(f.data,f.attempt,result,control),/marker/);assert.equal(read(f.id).id,second.id);checks.push('ack requires exact durable result/current context/removal success and cannot clear a newer marker');
 }
 {
  const f=await setup(),before=f.snapshot();await discard(f.data,f.attempt,control);assert.equal(read(f.id),null);assert.equal(f.snapshot(),before);const next=retain(f.id,f.quote);assert.notEqual(next.id,f.attempt.id);
  const r=await execute(f.data,next,control),saved=storage.get(key());await assert.rejects(discard(f.data,next,control),/committed/);assert.equal(storage.get(key()),saved);await ack(f.data,next,r,control);
  checks.push('explicit discard removes only proven uncommitted exact marker; committed attempt requires acknowledgement');
 }
 {
  const f=await setup(),normal=f.data.atomic.bind(f.data),before=f.snapshot();faultDatabase=true;await assert.rejects(execute(f.data,f.attempt,control));faultDatabase=false;
  const reloaded=read(f.id);assert(reloaded.paymentId&&reloaded.grantId);assert.equal(f.snapshot(),before);const fresh=new MockProvider();await execute(fresh,reloaded,control);assert.equal(fresh.peek('payments').filter(r=>r.user_id===f.id).length,1);
  checks.push('reload after database rollback uses same retained id with absent candidate rows and commits once');
 }
 {
  const f=await setup(),raw=storage.get(key()),original=JSON.parse(raw);for(const patch of [{version:2},{tenantId:'foreign'},{userId:'other'},{paymentId:''},{grantId:'orphan'},{createdAt:'bad'},{privateContact:'forbidden'}]){storage.set(key(),JSON.stringify({...original,...patch}));assert.throws(()=>read(f.id),e=>e instanceof RetainedClassPurchaseError&&e.code==='invalid');assert.throws(()=>retain(f.id,f.quote),/invalid/);}storage.set(key(),raw);
  const quote={...f.quote,taxTotals:undefined};await discard(f.data,f.attempt,control);const withUndefined=retain(f.id,quote);const r=await execute(f.data,withUndefined,control);assert.equal(r.payment.amount,f.quote.chargedAmount);
  checks.push('typed malformed/foreign/private marker failures remain retained; optional undefined quote metadata survives JSON roundtrip');
 }
 {
  const f=await setup(),visible=await execute(f.data,f.attempt,control),cached=structuredClone(f.data.peek('audit_log').find(r=>r.id.startsWith('mock_transaction_class-purchase:')));
  await f.data.update('class_ledger',visible.grant.id,freezePatch(visible.grant,7,'2026-10-24'));const frozen=await recover(f.data,read(f.id),control);assert.equal(frozen.grant.expires_at,'2027-01-29');assert.equal(frozen.grant.frozen_until,'2026-10-30');
  clock='2026-10-26T15:00:00Z';await f.data.update('class_ledger',visible.grant.id,resumePatch(frozen.grant,'2026-10-26'));await f.data.update('payments',visible.payment.id,{note:'FICTIONAL supported staff note'});
  const resumed=await recover(f.data,read(f.id),control);assert.equal(resumed.grant.frozen_until,'2026-10-25');assert.equal(resumed.grant.expires_at,'2027-01-24');assert.equal(resumed.payment.note,'FICTIONAL supported staff note');const unchanged=f.snapshot();
  await ack(f.data,f.attempt,visible,control);assert.equal(read(f.id),null);assert.equal(f.snapshot(),unchanged);assert.deepEqual(f.data.peek('audit_log').find(r=>r.id===cached.id),cached,'recovery/ack never rewrites cached original result');
  checks.push('real freezePatch + early resumePatch and later note/updated_at preserve recovery; ack of earlier visible outcome accepts exact immutable identity');
 }
 {
  const f=await setup(),visible=await execute(f.data,f.attempt,control);await f.data.update('class_ledger',visible.grant.id,freezePatch(visible.grant,3,'2026-10-24'));const frozen=await recover(f.data,read(f.id),control);await f.data.update('class_ledger',visible.grant.id,resumePatch(frozen.grant,'2026-10-24'));assert.equal((await recover(f.data,read(f.id),control)).grant.expires_at,visible.grant.expires_at);await ack(f.data,f.attempt,visible,control);checks.push('same-day early resume (zero used days) preserves original expiry and valid acknowledgement');
 }
 for(const patch of [{expires_at:'2027-12-31'},{frozen_from:'2026-10-24',frozen_until:'2026-10-30',expires_at:'2027-01-22'},{frozen_from:'2026-02-30',frozen_until:'2026-03-01'},{frozen_from:'2026-10-25',frozen_until:'2026-10-26'},{frozen_from:'',frozen_until:''},{purchase_ledger_id:'other-grant'},{delta:999}]){
  const f=await setup(),r=await execute(f.data,f.attempt,control);await f.data.update('class_ledger',r.grant.id,patch);const before=f.snapshot();await assert.rejects(recover(f.data,read(f.id),control),/proof/);await assert.rejects(ack(f.data,f.attempt,r,control),/proof/);assert.equal(f.snapshot(),before);assert(read(f.id));
 }
 checks.push('invalid expiry/date/future-start/empty freeze/lineage/quantity mutations remain fail-closed without rewriting or clearing marker');
 async function purchasedBooking(){
  const f=await setup(),visible=await execute(f.data,f.attempt,control),original=f.data.peek('class_sessions').find(r=>r.status==='scheduled'),start=Date.now()+2*86400000;
  const session=await f.data.insert('class_sessions',{...original,id:'qa_retained_booking_session',template_id:null,title:'FICTIONAL Retained Cancellation',starts_at:new Date(start).toISOString(),ends_at:new Date(start+3000000).toISOString(),capacity:8,booked_count:0,status:'scheduled',cancel_reason:null});
  const booking=await f.data.atomic(tx=>bookWithPackage(tx,{userId:f.id,sessionId:session.id,status:'booked',paymentId:visible.payment.id,paidWith:'package',control:{isCurrent:()=>true}}));
  return {...f,visible,booking,session};
 }
 for(const kind of ['customer','studio']){
  const f=await purchasedBooking(),purchaseSnapshot=structuredClone(f.visible),paymentBefore=JSON.stringify(f.data.peek('payments'));
  assert.equal((await recover(f.data,read(f.id),control)).grant.id,f.visible.grant.id,'real linked booking consumption never becomes another origin');
  if(kind==='customer'){
   const who={actorId:f.id,role:'customer'},r=await readCustomerCancellation(f.data,who,f.booking.id,f.session.id,{now:Date.now});assert(r.verifiable&&!r.late&&r.returnsClass);const outcome=await cancelOwnBooking(f.data,{...who,bookingId:r.bookingId,sessionId:r.sessionId,requestId:'qa_retained_real_cancel',expected:r.expected,late:r.late,returnsClass:r.returnsClass,waitlistBookable:r.waitlistBookable},{now:Date.now});assert(outcome.returned);
  }else{
   const who={actorId:'usr_admin',role:'admin'},r=await readStudioImpact(f.data,who,f.session.id,{now:Date.now});assert.deepEqual(r.issues,[]);const outcome=await cancelStudioClass(f.data,{...who,sessionId:f.session.id,requestId:'qa_retained_real_studio_cancel',expected:r.expected,bookingIds:r.attendees.map(a=>a.booking.id),reason:'FICTIONAL class cancellation'},{now:Date.now});
   // PR91 extends studio receipts with direct_paid items; retained package purchases still require the exact ledger proof.
   assert.equal(outcome.items.length,1);const item=outcome.items[0];assert.notEqual(item.kind,'direct_paid');assert.equal(item.bookingId,f.booking.id);assert.equal(item.userId,f.id);assert.equal(item.debitId,f.booking.ledger_id);assert.equal(item.grantId,f.visible.grant.id);for(const digest of ['bookingDigest','debitDigest','grantDigest','returnDigest'])assert.match(item[digest],/^[a-f0-9]{64}$/);
  }
  const returned=f.data.peek('class_ledger').find(r=>r.purchase_ledger_id===f.visible.grant.id&&r.delta===1);assert(returned);assert.equal(returned.reason,kind==='customer'?'cancel_return':'refund');assert.equal(JSON.stringify(f.data.peek('payments')),paymentBefore);
  await f.data.update('class_ledger',f.visible.grant.id,freezePatch(f.visible.grant,7,'2026-10-24'));const before=f.snapshot(),recovered=await recover(f.data,read(f.id),control);assert.equal(recovered.grant.id,f.visible.grant.id);assert.equal(recovered.grant.delta,12);await ack(f.data,f.attempt,purchaseSnapshot,control);assert.equal(f.snapshot(),before,'canonical return history and later freeze are readonly during purchase ack');assert.equal(read(f.id),null);
  checks.push(`actual purchase -> bookWithPackage -> ${kind} cancellation -> later freeze -> recover/ack keeps exactly one origin and unchanged financial history`);
 }
 for(const defect of ['unknown-positive','unlinked-positive','foreign-positive','fake-canonical-return','extra-purchase']){
  const f=await setup(),r=await execute(f.data,f.attempt,control);await f.data.insert('class_ledger',{...r.grant,id:'qa_retained_extra',delta:1,reason:defect==='extra-purchase'?'purchase':defect==='fake-canonical-return'?'cancel_return':'refund',purchase_ledger_id:defect==='unlinked-positive'?null:r.grant.id,tenant_id:defect==='foreign-positive'?'foreign':r.grant.tenant_id});const before=f.snapshot();await assert.rejects(recover(f.data,read(f.id),control),/proof/);await assert.rejects(ack(f.data,f.attempt,r,control),/proof/);assert.equal(f.snapshot(),before);assert(read(f.id));
 }
 checks.push('unknown/unlinked/foreign/forged cancellation positives and extra origin purchases remain fail-closed');
 {
  const f=await purchasedBooking(),who={actorId:f.id,role:'customer'},r=await readCustomerCancellation(f.data,who,f.booking.id,f.session.id,{now:Date.now});await cancelOwnBooking(f.data,{...who,bookingId:r.bookingId,sessionId:r.sessionId,requestId:'qa_retained_corrupt_return',expected:r.expected,late:r.late,returnsClass:r.returnsClass,waitlistBookable:r.waitlistBookable},{now:Date.now});
  const returned=f.data.peek('class_ledger').find(row=>row.reason==='cancel_return'&&row.user_id===f.id);await f.data.update('class_ledger',returned.id,{delta:2});const before=f.snapshot();await assert.rejects(recover(f.data,read(f.id),control),/proof/);assert.equal(f.snapshot(),before);assert(read(f.id));checks.push('corrupt previously canonical return quantity is not ignored as legitimate history');
 }
 for(const item of ['single','trial','pack12_smtc']){const f=await setup(item),r=await execute(f.data,f.attempt,control);assert.equal(r.grant.delta,f.quote.classes);assert.equal(r.grant.expires_at,f.quote.entitlementExpiresAt);assert.deepEqual(r.payment.frontend_quote,f.quote);assert.equal(r.payment.frontend_receipt.recordedTax.total,f.quote.chargedAmount);checks.push(`${item}: original quote/classes/expiry/receipt totals retained`);}
 // 0191: actual retained purchases, late persisted owner loss, and unchanged financial history.
 for(const action of ['recover','acknowledge']){
  const f=await setup(),result=await execute(f.data,f.attempt,control),list=f.data.list.bind(f.data),financial=structuredClone(f.own()),marker=localStorage.getItem(key());let late=false;
  f.data.list=async(table,query)=>{const rows=await list(table,query);if(!late&&table==='class_ledger'&&query?.where?.id===result.grant.id){late=true;await f.data.update('users',f.id,{status:'inactive'});}return rows;};
  await assert.rejects(action==='recover'?recover(f.data,read(f.id),control):ack(f.data,f.attempt,result,control),/retained_purchase_owner/);
  assert(late);assert.equal(control.isCurrent(),true);assert.deepEqual(f.own(),financial);assert.equal(localStorage.getItem(key()),marker);
  checks.push(`late inactive owner during exact grant read: ${action} denied, original marker and financial rows unchanged`);
 }
 {
  const f=await setup(),list=f.data.list.bind(f.data),financial=structuredClone(f.own()),marker=localStorage.getItem(key());let late=false;
  f.data.list=async(table,query)=>{const rows=await list(table,query);if(!late&&table==='audit_log'){late=true;await f.data.update('users',f.id,{status:'inactive'});}return rows;};
  await assert.rejects(discard(f.data,f.attempt,control),/retained_purchase_owner/);assert(late);assert.deepEqual(f.own(),financial);assert.equal(localStorage.getItem(key()),marker);
  checks.push('late inactive owner during no-result proof cannot discard uncommitted marker');
 }
 for(const fault of ['missing-peek','unavailable','throws','missing','duplicate','foreign','inactive']){
  const f=await setup(),result=await execute(f.data,f.attempt,control),peek=f.data.peek.bind(f.data),before=f.snapshot(),marker=localStorage.getItem(key());
  // Keep honest async reads available; inject only the final synchronous snapshot boundary.
  f.data.list=async(table,query)=>peek(table,query);
  if(fault==='missing-peek')f.data.peek=undefined;
  else f.data.peek=(table,query)=>{const rows=peek(table,query);if(table!=='users')return rows;if(fault==='unavailable')return undefined;if(fault==='throws')throw Error('fictional owner snapshot unavailable');if(fault==='missing')return [];if(fault==='duplicate')return [...rows,...rows];if(fault==='foreign')return rows.map(r=>({...r,tenant_id:'foreign'}));if(fault==='inactive')return rows.map(r=>({...r,status:'inactive'}));return rows;};
  await assert.rejects(recover(f.data,read(f.id),control),/retained_purchase_(owner|context)|fictional owner snapshot/);await assert.rejects(ack(f.data,f.attempt,result,control),/retained_purchase_(owner|context)|fictional owner snapshot/);assert.equal(f.snapshot(),before);assert.equal(localStorage.getItem(key()),marker);
  checks.push(`${fault}: final synchronous owner proof fails closed without result, marker removal or financial writes`);
 }
 {
  const f=await setup(),normal=f.data.atomic.bind(f.data),financial=structuredClone(f.own()),marker=localStorage.getItem(key());let entered,release,writes=0;const reached=new Promise(r=>{entered=r;}),gate=new Promise(r=>{release=r;});
  f.data.atomic=async(action,options)=>{entered();await gate;return normal(tx=>action(new Proxy({}, {get(_t,k){const v=tx[k];if(['insert','update','remove'].includes(k))return async(...args)=>{writes++;return v.apply(tx,args);};return typeof v==='function'?v.bind(tx):v;}})),options);};
  const pending=execute(f.data,f.attempt,control);await reached;await f.data.update('users',f.id,{status:'inactive'});release();await assert.rejects(pending,/retained_purchase_owner/);assert.equal(writes,0);assert.deepEqual(f.own(),financial);assert.equal(localStorage.getItem(key()),marker);
  checks.push('queued purchase sees newly inactive owner before any staged financial write');
 }
 {
  const f=await setup(),normal=f.data.atomic.bind(f.data),financial=structuredClone(f.own()),marker=localStorage.getItem(key());let late=false,writes=0;
  f.data.atomic=(action,options)=>normal(tx=>action(new Proxy({}, {get(_t,k){const v=tx[k];if(k==='list')return async(table,query)=>{const rows=await v.call(tx,table,query);if(!late&&table==='plans'){late=true;await f.data.update('users',f.id,{status:'inactive'});}return rows;};if(['insert','update','remove'].includes(k))return async(...args)=>{writes++;return v.apply(tx,args);};return typeof v==='function'?v.bind(tx):v;}})),options);
  await assert.rejects(execute(f.data,f.attempt,control),/retained_purchase_owner/);assert(late);assert.equal(writes,0);assert.deepEqual(f.own(),financial);assert.equal(localStorage.getItem(key()),marker);
  checks.push('owner lost after quote read is rechecked after checkout before any payment write');
 }
 {
  const f=await setup(),result=await execute(f.data,f.attempt,{isCurrent:()=>true,ivaRate:.19}),before=f.snapshot();assert.deepEqual(await recover(f.data,read(f.id),{isCurrent:()=>true}),result);await assert.rejects(ack(f.data,f.attempt,result,{isCurrent:()=>false}),/retained_purchase_context/);assert(read(f.id));await ack(f.data,f.attempt,result,{isCurrent:()=>true});assert.equal(read(f.id),null);assert.equal(f.snapshot(),before);
  const next=retain(f.id,f.quote),uncommitted=f.snapshot();await discard(f.data,next,{isCurrent:()=>true});assert.equal(read(f.id),null);assert.equal(f.snapshot(),uncommitted);
  checks.push('active owner retains exact recovery, explicit acknowledgement and uncommitted discard; false callback still denies');
 }
 console.log(JSON.stringify({feature:'PG-09',checks,scope:'MockProvider one-browser dataset. No backend/payment calls. Root native UI verification is separate.'},null,2));
}finally{globalThis.Date=RealDate;await rm(dir,{recursive:true,force:true});}
