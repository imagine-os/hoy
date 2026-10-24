// Host-side actual MockProvider commands only; this file is never imported by the browser/application.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSyntheticAdmissionCustomer} from './synthetic-admission-contact.mjs';
export const studioDirectNativeNow='2026-12-02T17:00:10Z';
let services;
async function commands(){
 if(!services)services=(async()=>{const dir=await mkdtemp(join(tmpdir(),'hoy-studio-native-fixture-'));try{const file=join(dir,'commands.mjs');await build({stdin:{resolveDir:process.cwd(),contents:"export{MockProvider}from'./src/data/MockProvider';export{recordPayment,activatePaidPackage}from'./src/modules/customer/payments';export{bookWithPackage}from'./src/data/deskBooking';export{resolveOperationalQuote,freezeSaleQuote}from'./src/data/operationalQuotes';export{studioReturnId}from'./src/modules/classSchedule/studioCancellation';"},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});return await import(pathToFileURL(file));}finally{await rm(dir,{recursive:true,force:true});}})();
 return services;
}
/** Rehearses the native checkout's recorded topology, not native Checkout UI or a fabricated receipt. */
export async function studioDirectPaidNativeFixture(kinds=['single'],{lang='en',missingTerms=false}={}){
 const D=Date,oldStorage=globalThis.localStorage,memory=new Map();let wall=D.parse(studioDirectNativeNow)-10_000;
 globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[wall]));}static now(){return wall;}};
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 try{
  const{MockProvider,recordPayment,activatePaidPackage,bookWithPackage,resolveOperationalQuote,freezeSaleQuote,studioReturnId}=await commands(),data=new MockProvider();
  const seed=data.peek('class_sessions').find(s=>s.status==='scheduled'),session=await data.insert('class_sessions',{...seed,id:'qa_studio_direct_native',template_id:null,title:'FICTIONAL DIRECT PAID CANCELLATION',starts_at:'2026-12-04T17:00:00Z',ends_at:'2026-12-04T17:50:00Z',capacity:8,booked_count:0,status:'scheduled',cancel_reason:null});
  const target=await data.insert('class_sessions',{...session,id:'qa_studio_direct_reuse',title:'FICTIONAL RETURNED CLASS',starts_at:'2026-12-05T17:00:00Z',ends_at:'2026-12-05T17:50:00Z',booked_count:0}),people=[];
  for(const[index,kind]of kinds.entries()){
   const userId='qa_studio_native_'+index;await createSyntheticAdmissionCustomer(data,userId,{name:'FICTIONAL Direct Paid '+index,locale:lang});await data.insert('user_roles',{id:userId+'_role',user_id:userId,role:'customer',granted_by:'usr_admin'});
   const quote=freezeSaleQuote(resolveOperationalQuote(data.peek('plans'),kind==='package'?'pack12':kind),1,90);
   const{payment,booking}=await data.atomic(async tx=>{const payment=await recordPayment(tx,{userId,planId:quote.planId,amount:quote.chargedAmount,method:'card',result:{status:'approved',ref:'FICTIONAL_STUDIO_NATIVE'},ivaRate:.19,...(!missingTerms?{quote}:{})});let booking;
    if(kind==='package'){await activatePaidPackage(tx,{paymentId:payment.id,userId,planId:quote.planId,classes:quote.classes,expiresAt:quote.entitlementExpiresAt});booking=await bookWithPackage(tx,{userId,sessionId:session.id,status:'booked',paymentId:payment.id});}
    else booking=await tx.insert('bookings',{user_id:userId,session_id:session.id,status:'booked',paid_with:kind,ledger_id:null,payment_id:payment.id,mat_number:index+1,checked_in_at:null,cancelled_at:null,rated:false});return{payment,booking};});
   assert.equal(payment.status,'approved');assert.equal(payment.frontend_receipt.facts.paymentId,payment.id);assert.equal(payment.frontend_receipt.facts.customerId,userId);assert.equal(payment.frontend_receipt.facts.quote?.entitlementExpiresAt??null,missingTerms?null:quote.entitlementExpiresAt);
   people.push({userId,kind,quote,paymentId:payment.id,bookingId:booking.id,ledgerId:booking.ledger_id,returnId:await studioReturnId(session.id,booking.id),expectedBalance:kind==='package'?quote.classes:1});wall+=1000;
  }
  const stored=JSON.parse(memory.get('hoyos.db.v1'));assert(people.every(p=>Date.parse(stored.db.payments.find(r=>r.id===p.paymentId).paid_at)<D.parse(studioDirectNativeNow)),'purchase and booking precede cancellation clock');assert.equal(stored.db.class_sessions.find(s=>s.id===session.id).booked_count,kinds.length);
  return{stored,people,sessionId:session.id,targetId:target.id,missingTerms,now:studioDirectNativeNow,scope:'Host-side actual recordPayment/receipt + direct booking or actual package fulfillment; not native Checkout coverage'};
 }finally{globalThis.Date=D;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
}
