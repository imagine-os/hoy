// Exact fictional single/trial charge lineage; no backend, real transaction or historical backfill.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSyntheticAdmissionCustomer} from './synthetic-admission-contact.mjs';
const scratch=await mkdtemp(join(tmpdir(),'hoy-direct-payment-')),memory=new Map(),checks=[];
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
try {
  const file=join(scratch,'adapter.mjs');
  await build({stdin:{resolveDir:process.cwd(),contents:"export{MockProvider}from'./src/data/MockProvider';export{tableNames}from'./src/data/schema';export{bookingPaymentStatus}from'./src/modules/customer/bookingPaymentStatus';export{recordPayment}from'./src/modules/customer/payments';export{rescheduleBooking}from'./src/modules/customer/rescheduleCommand';export{addDays,atStudioTime}from'./src/i18n/format';"},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
  const {MockProvider,tableNames,bookingPaymentStatus:status,recordPayment,rescheduleBooking,addDays,atStudioTime}=await import(pathToFileURL(file));
  const setup=async()=>{
    memory.clear();const data=new MockProvider();
    await createSyntheticAdmissionCustomer(data,'qa_paid_single');await createSyntheticAdmissionCustomer(data,'qa_paid_other');
    const base=data.peek('class_sessions').find(s=>s.status==='scheduled'),start=atStudioTime(addDays(new Date(),2),12,0).getTime();
    const session=await data.insert('class_sessions',{...base,id:'qa_paid_from',template_id:null,starts_at:new Date(start).toISOString(),ends_at:new Date(start+50*60000).toISOString(),capacity:8,booked_count:0,status:'scheduled'});
    const target=await data.insert('class_sessions',{...session,id:'qa_paid_to',starts_at:new Date(start+2*3600000).toISOString(),ends_at:new Date(start+2*3600000+50*60000).toISOString()});
    const input={user_id:'qa_paid_single',session_id:session.id,status:'booked',paid_with:'single',ledger_id:null,checked_in_at:null,cancelled_at:null,rated:false};
    const snapshot=()=>JSON.stringify(Object.fromEntries(tableNames.map(t=>[t,data.peek(t)])));
    return{data,session,target,input,snapshot};
  };
  for(const kind of ['single','trial']){
    const {data,session,target,input}=await setup();
    const payment=await recordPayment(data,{userId:input.user_id,planId:`plan_${kind}`,amount:10000,method:'card',result:{status:'approved',ref:`FICTIONAL_${kind}`},ivaRate:0});
    const finance=JSON.stringify({payments:data.peek('payments'),ledger:data.peek('class_ledger'),invoices:data.peek('invoices')});
    const booking=await data.insert('bookings',{...input,paid_with:kind,payment_id:payment.id});
    assert.equal(booking.payment_id,payment.id);assert.equal(booking.ledger_id,null);
    assert.equal(status(booking,[],data.peek('payments')),'confirmed');
    assert.equal(JSON.stringify({payments:data.peek('payments'),ledger:data.peek('class_ledger'),invoices:data.peek('invoices')}),finance);
    const moved=await data.atomic(tx=>rescheduleBooking(tx,{userId:input.user_id,role:'customer',bookingId:booking.id,fromSessionId:session.id,toSessionId:target.id}));
    assert.equal(moved.payment_id,payment.id);assert.equal(moved.ledger_id,null);assert.equal(status(moved,[],data.peek('payments')),'confirmed');
    assert.equal(data.peek('bookings').find(b=>b.id===booking.id).status,'cancelled');
    assert.equal(JSON.stringify({payments:data.peek('payments'),ledger:data.peek('class_ledger'),invoices:data.peek('invoices')}),finance);
    const restored=new MockProvider(),saved=restored.peek('bookings').find(b=>b.id===moved.id);
    assert.equal(saved.payment_id,payment.id);assert.equal(status(saved,[],restored.peek('payments')),'confirmed');
    checks.push(`${kind}: exact approved payment survives same-day reschedule/reload without a new charge, package grant, debit, receipt rewrite or invoice`);
  }
  for(const fault of ['missing','pending','declined','released','foreign-owner','foreign-tenant','duplicate-id','empty']){
    const {data,input,snapshot}=await setup();
    const p=await data.insert('payments',{id:'qa_direct_payment',tenant_id:fault==='foreign-tenant'?'qa_foreign_tenant':data.peek('tenants')[0].id,user_id:fault==='foreign-owner'?'qa_paid_other':input.user_id,status:['pending','declined','released'].includes(fault)?fault:'approved',amount:10000});
    if(fault==='duplicate-id')await data.insert('payments',{...p,user_id:'qa_paid_other'});
    const before=snapshot();await assert.rejects(data.insert('bookings',{...input,payment_id:fault==='missing'?'qa_absent':fault==='empty'?'':p.id}),/booking_payment_invalid/);assert.equal(snapshot(),before);
    checks.push(`${fault}: final adapter rejects unconfirmed/unowned/ambiguous direct reference without any write`);
  }
  {
    const {data,input,snapshot}=await setup(),p=await data.insert('payments',{user_id:input.user_id,status:'approved',amount:10000});
    const booking=await data.insert('bookings',{...input,payment_id:p.id}),before=snapshot();
    for(const patch of [{payment_id:null},{payment_id:'qa_other_payment'},{user_id:'qa_paid_other'},{tenant_id:'qa_foreign_tenant'}]){
      await assert.rejects(data.update('bookings',booking.id,patch),/booking_payment_immutable/);assert.equal(snapshot(),before);
    }
    await data.update('bookings',booking.id,{status:'cancelled'});assert.equal(status({...booking,status:'cancelled'},[],[p]),'confirmed');
    checks.push('saved direct reference is immutable; cancellation does not invent a refund or release');
  }
  {
    const b={id:'b',tenant_id:'t',user_id:'u',ledger_id:null,payment_id:'p'},p={id:'p',tenant_id:'t',user_id:'u',status:'approved'},debit={id:'d',tenant_id:'t',user_id:'u',delta:-1,payment_id:'p'};
    for(const [raw,result] of [['approved','confirmed'],['pending','pending'],['released','released'],['declined','unknown'],['refunded','unknown']])assert.equal(status(b,[],[{...p,status:raw}]),result);
    for(const payments of [[],[{...p,user_id:'other'}],[{...p,tenant_id:'other'}],[p,p]])assert.equal(status(b,[],payments),'unknown');
    assert.equal(status({...b,ledger_id:'d'},[debit],[p]),'confirmed');
    for(const ledger of [[],[debit,debit],[debit,{...debit,user_id:'other'}],[{...debit,payment_id:'other'}]])assert.equal(status({...b,ledger_id:'d'},ledger,[p]),'unknown');
    assert.equal(status({...b,payment_id:undefined},[{...debit,id:null}],[p]),'unknown','null ledger reference never matches malformed rows');
    assert.equal(status({...b,ledger_id:''},[],[p]),'unknown','malformed declared debit fails closed');
    assert.equal(status({...b,payment_id:undefined},[],[p]),'unknown','legacy single is never matched by date/amount');
    assert.equal(status({...b,payment_id:undefined,ledger_id:'d'},[debit],[p]),'confirmed','existing package debit lineage remains valid');
    checks.push('projection preserves direct/package status, rejects conflicts/ambiguity, and leaves unlinked legacy history unknown');
  }
  console.log(`PASS single/trial payment linkage: ${checks.length} groups`);
  if(process.env.QA_OUTPUT){await mkdir(process.env.QA_OUTPUT,{recursive:true});await writeFile(join(process.env.QA_OUTPUT,'results.json'),JSON.stringify({checks,errors:[]},null,2));}
}finally{await rm(scratch,{recursive:true,force:true});}
