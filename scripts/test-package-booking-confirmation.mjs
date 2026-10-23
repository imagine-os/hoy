import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {packageBookingFixture,packageBookingIds as ids,packageBookingNow} from './package-booking-fixture.mjs';
const compiled=await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {bookWithPackage} from './src/data/deskBooking';export {readPackageBookingConfirmation} from './src/modules/customer/packageBookingConfirmation';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {MockProvider,bookWithPackage,readPackageBookingConfirmation:read}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const RealDate=Date,initial=await packageBookingFixture(),last=await packageBookingFixture(process.cwd(),true),storage=new Map();
globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[packageBookingNow]));}static now(){return new RealDate(packageBookingNow).getTime();}};
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const request={userId:ids.user,sessionId:ids.session,checkoutKey:'qa_confirmation'},receiptId=`mock_transaction_checkout:${ids.user}:qa_confirmation`;let checks=0;
const fresh=(fixture=initial)=>{storage.clear();storage.set('hoyos.db.v1',JSON.stringify(fixture));return new MockProvider();};
const snap=()=>storage.get('hoyos.db.v1');
const book=d=>d.atomic(async tx=>({booking:await bookWithPackage(tx,{userId:ids.user,sessionId:ids.session,status:'booked'}),pending:false}),{idempotencyKey:`checkout:${ids.user}:qa_confirmation`});
try{
 {const d=fresh(),before=snap();assert.deepEqual(await read(d,request,()=>true),{kind:'missing'});assert.equal(snap(),before);checks++;}
 for(const fixture of [initial,last]){const d=fresh(fixture),saved=await book(d),before=snap();const result=await read(d,request,()=>true);assert.equal(result.kind,'saved');assert.equal(result.source,'attempt');assert.equal(result.booking.id,saved.booking.id);assert.equal(snap(),before);const existing=await read(d,{userId:ids.user,sessionId:ids.session},()=>true);assert.equal(existing.source,'existing');assert.equal(snap(),before);checks+=2;
  // Confirmation is historical evidence, not a fresh admission or remaining-balance decision.
  await d.update('class_templates',ids.template,{active:false});await d.update('class_sessions',ids.session,{starts_at:'2026-10-22T12:00:00Z',ends_at:'2026-10-22T13:00:00Z'});await d.update('class_ledger',ids.user+'_grant',{expires_at:'2026-10-22',frozen_from:'2026-10-23',frozen_until:'2026-10-24'});assert.equal((await read(d,request,()=>true)).booking.id,saved.booking.id);checks++;
 }
 const edit=(d,table,id,patch)=>Object.assign(d.db[table].find(row=>row.id===id),patch),remove=(d,table,id)=>{d.db[table]=d.db[table].filter(row=>row.id!==id);};
 {const d=fresh();await book(d);remove(d,'audit_log',receiptId);const before=snap();const result=await read(d,request,()=>true);assert.equal(result.kind,'saved');assert.equal(result.source,'existing','missing command receipt never proves this command committed');assert.equal(snap(),before);checks++;}
 const invalid=[
  ['missing persisted booking',async(d,b)=>remove(d,'bookings',b.id)],
  ['foreign booking',async(d,b)=>edit(d,'bookings',b.id,{tenant_id:'foreign'})],
  ['other user booking',async(d,b)=>edit(d,'bookings',b.id,{user_id:ids.waiter})],
  ['other session booking',async(d,b)=>edit(d,'bookings',b.id,{session_id:'wrong'})],
  ['cancelled booking',async(d,b)=>edit(d,'bookings',b.id,{status:'cancelled'})],
  ['missing debit',async(d,b)=>remove(d,'class_ledger',b.ledger_id)],
  ['foreign debit',async(d,b)=>edit(d,'class_ledger',b.ledger_id,{tenant_id:'foreign'})],
  ['other user debit',async(d,b)=>edit(d,'class_ledger',b.ledger_id,{user_id:ids.waiter})],
  ['wrong debit',async(d,b)=>edit(d,'class_ledger',b.ledger_id,{delta:-2})],
  ['missing grant',async d=>remove(d,'class_ledger',ids.user+'_grant')],
  ['foreign grant',async d=>edit(d,'class_ledger',ids.user+'_grant',{tenant_id:'foreign'})],
  ['changed grant linkage',async d=>edit(d,'class_ledger',ids.user+'_grant',{payment_id:'wrong'})],
  ['foreign session',async d=>edit(d,'class_sessions',ids.session,{tenant_id:'foreign'})],
  ['foreign receipt',async d=>edit(d,'audit_log',receiptId,{tenant_id:'foreign'})],
  ['staged-only receipt booking',async d=>{const r=await d.get('audit_log',receiptId);await edit(d,'audit_log',receiptId,{diff:{result:{...r.diff.result,booking:{...r.diff.result.booking,id:'unpersisted'}}}});}],
  ['pending receipt',async d=>{const r=await d.get('audit_log',receiptId);await edit(d,'audit_log',receiptId,{diff:{result:{...r.diff.result,pending:true}}});}],
 ];
 for(const[name,mutate]of invalid){const d=fresh(),{booking}=await book(d);await mutate(d,booking);const before=snap(),facts=JSON.stringify(d.db);await assert.rejects(read(d,request,()=>true),/invalid/,name);assert.equal(snap(),before,name+' remains read-only');assert.equal(JSON.stringify(d.db),facts);checks++;}
 for(const table of ['users','audit_log','bookings','class_sessions','class_ledger']){const d=fresh();await book(d);const get=d.get.bind(d);d.get=(name,id)=>name===table?Promise.reject(Error('fictional_read_failed')):get(name,id);const before=snap();await assert.rejects(read(d,request,()=>true),/read_failed/);assert.equal(snap(),before);checks++;}
 {const d=fresh();await book(d);let current=true;const get=d.get.bind(d);d.get=async(...args)=>{const row=await get(...args);current=false;return row;};const before=snap();await assert.rejects(read(d,request,()=>current),/context_changed/);assert.equal(snap(),before);checks++;}
 console.log(`PASS ${checks} package confirmation groups: exact receipt plus fresh owned booking/debit/grant, existing/last-class/history, absence, foreign/missing/staged-only facts, read failures, context fencing and no writes.`);
}catch(error){console.error('FAIL package confirmation: '+error.message);process.exitCode=1;}finally{globalThis.Date=RealDate;}
