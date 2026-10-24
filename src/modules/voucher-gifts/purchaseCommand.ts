import { buildReceiptEmailPreview, buildReceiptRecorderSnapshot } from '../../data/receiptEmailPreview';
import type {BaseRow,PaymentRow,UserRow,ProfileRow} from '../../data/schema';
import {readPaymentQuote,type FrozenSaleQuote} from '../../data/operationalQuotes';
import {executeVoucherCommand,type VoucherDb,type VoucherRow,type VoucherTerms} from '../../data/vouchers';
import {readLaunchReceipt,receiptReference,type LaunchReceipt} from '../../data/launchReceipts';
import {validateReceiptBytes,type ReceiptImage} from '../transfers/receipts';
import {tenant} from '../../tenant/tenant';
import {demoEmail} from './model';
import {verifiedPurchasedGift,sameGiftFact as same,type GiftPurchaseIntent,type GiftPurchaseResult,type GiftPurchaseRequest} from './purchaseFacts';
export type {GiftPurchaseResult} from './purchaseFacts';
/** Dedicated mock command only; no bank evidence, secure link, real auth or email delivery. */
export type GiftPurchaseCommand={requestId:string;actorId:string;role:string}&(
 |{type:'purchase';quote:FrozenSaleQuote;recipientEmail:string;image:ReceiptImage}
 |{type:'approve';purchaseId:string;amount:number;reason:string;reviewed:true;terms:VoucherTerms}
 |{type:'reject';purchaseId:string;reason:string}
 |{type:'claim';purchaseId:string}
);
export interface GiftPurchaseContext{tenantId:string;now?:string;id?:()=>string;currentQuote?:FrozenSaleQuote}
function fail(code:string):never{throw Error(code);}
/** Detached copy-on-write. Only a serialized mock provider may persist its returned database. */
export function executeGiftPurchaseCommand(database:VoucherDb,command:GiftPurchaseCommand,context:GiftPurchaseContext):{db:VoucherDb;result:GiftPurchaseResult}{
 let db=structuredClone(database);const c=structuredClone(command),now=context.now??new Date().toISOString(),id=context.id??(()=>crypto.randomUUID());
 if(context.tenantId!==tenant.id||!Number.isFinite(Date.parse(now))||!c.requestId?.trim()||c.requestId.length>160)fail('gift_context');
 const actor=(db.users??[]).find(u=>u.id===c.actorId&&u.tenant_id===context.tenantId) as UserRow|undefined;
 if(!actor||actor.status!=='active')fail('gift_actor');
 if(!(db.user_roles??[]).some(r=>r.tenant_id===context.tenantId&&r.user_id===actor.id&&(r.role===c.role||r.role==='super_admin')))fail('gift_forbidden');
 if(c.type==='purchase'||c.type==='claim'){if(c.role!=='customer')fail('gift_forbidden');}else if(!['admin','super_admin'].includes(c.role))fail('gift_forbidden');
 const base=(rowId=id()):BaseRow=>({id:rowId,tenant_id:context.tenantId,created_at:now,updated_at:now});
 const fingerprint=JSON.stringify(c),requestId=`gift-purchase-request:${c.actorId}:${c.requestId}`,requests=(db.gift_purchase_requests??=[]) as GiftPurchaseRequest[],intents=(db.gift_purchase_intents??=[]) as GiftPurchaseIntent[];
 const prior=requests.find(r=>r.id===requestId);
 if(prior){
  if(prior.tenant_id!==context.tenantId||prior.actorId!==actor.id||prior.type!==c.type||prior.fingerprint!==fingerprint)fail('gift_request_conflict');
  const saved=prior.result,intent=intents.find(r=>r.id===saved.purchaseId&&r.tenant_id===context.tenantId),payment=(db.payments??[]).find(p=>p.id===intent?.paymentId&&p.tenant_id===context.tenantId) as PaymentRow|undefined;
  if(!intent||!payment||payment.id!==saved.payment.id||payment.user_id!==intent.buyerId||!same(readPaymentQuote(payment),intent.quote)||!same(saved.payment.frontend_quote,payment.frontend_quote)||c.type!=='purchase'&&!same(payment,saved.payment))fail('gift_state_conflict');
  const voucher=intent.voucherId?(db.vouchers??[]).find(v=>v.id===intent.voucherId&&v.tenant_id===context.tenantId) as VoucherRow|undefined:null;
  if(payment.status==='approved'){if(!voucher)fail('gift_state_conflict');verifiedPurchasedGift(db,voucher,context.tenantId);}
  if(c.type==='claim'&&(actor.email.trim().toLowerCase()!==intent.recipientEmail||voucher?.claimedBy!==actor.id))fail('gift_recipient');
  return{db,result:{purchaseId:intent.id,payment:structuredClone(payment),voucher:voucher?structuredClone(voucher):null,state:payment.status==='declined'?'rejected':voucher?.claimedBy?'claimed':payment.status==='approved'?'approved':'pending'}};
 }
 let result:GiftPurchaseResult;
 if(c.type==='purchase'){
  if(!demoEmail(c.recipientEmail)||!context.currentQuote||!same(c.quote,context.currentQuote)||c.quote.kind!=='gift'||c.quote.quantity!==1||c.quote.tenantId!==context.tenantId)fail('gift_quote');
  if(!c.image||!c.image.dataUrl.startsWith(`data:${c.image.mimeType};base64,`))fail('gift_image');
  const bytes=Uint8Array.from(atob(c.image.dataUrl.split(',')[1]),ch=>ch.charCodeAt(0));validateReceiptBytes(c.image.fileName,c.image.mimeType,bytes);if(bytes.length!==c.image.bytes)fail('gift_image');
  const payment:PaymentRow={...base(),user_id:actor.id,plan_id:c.quote.planId,amount:c.quote.chargedAmount,amount_paid:null,currency:'COP',method:'transfer',provider:'manual',provider_ref:null,status:'pending',paid_at:null,taken_by:null,note:null,frontend_quote:structuredClone(c.quote)};
  if(!readPaymentQuote(payment))fail('gift_quote');(db.payments??=[]).push(payment);
  const purchaseId=`gift-purchase:${payment.id}`;intents.push({...base(purchaseId),paymentId:payment.id,buyerId:actor.id,recipientEmail:c.recipientEmail.trim().toLowerCase(),quote:structuredClone(c.quote),image:structuredClone(c.image),voucherId:null,terms:null,approvalRequestId:null});
  result={purchaseId,payment,voucher:null,state:'pending'};
 }else{
  const intent=intents.find(r=>r.id===c.purchaseId&&r.tenant_id===context.tenantId);if(!intent)fail('gift_missing');
  const payment=(db.payments??[]).find(p=>p.id===intent.paymentId&&p.tenant_id===context.tenantId) as PaymentRow|undefined;
  if(!payment||payment.user_id!==intent.buyerId||payment.provider!=='manual'||payment.method!=='transfer'||!same(readPaymentQuote(payment),intent.quote))fail('gift_state_conflict');
  if(c.type==='claim'){
   const voucher=(db.vouchers??[]).find(v=>v.id===intent.voucherId&&v.tenant_id===context.tenantId) as VoucherRow|undefined;
   if(payment.status!=='approved')fail('gift_not_approved');if(!voucher)fail('gift_state_conflict');verifiedPurchasedGift(db,voucher,context.tenantId);
   if(actor.email.trim().toLowerCase()!==intent.recipientEmail||!demoEmail(actor.email))fail('gift_recipient');if(voucher.claimedBy)fail('gift_already_claimed');
   const claimed=executeVoucherCommand(db,{type:'claim',voucherId:voucher.id,userId:actor.id,actorId:actor.id,role:'customer',requestId:`gift-claim:${c.requestId}`},{tenantId:context.tenantId,now,id});db=claimed.db;
   result={purchaseId:intent.id,payment,voucher:claimed.result.voucher,state:'claimed'};
  }else{
   if(payment.status!=='pending'||intent.voucherId||payment.frontend_receipt)fail('gift_already_reviewed');if(!c.reason.trim()||c.reason.length>500)fail('gift_review_required');
   if(c.type==='reject'){Object.assign(payment,{status:'declined',note:c.reason.trim(),taken_by:actor.id,updated_at:now});result={purchaseId:intent.id,payment,voucher:null,state:'rejected'};}
   else{
    if(c.reviewed!==true||c.amount!==payment.amount||!Number.isSafeInteger(c.amount))fail('gift_review_required');
    if(c.terms.benefitKind!=='classes'||c.terms.benefitTotal!==intent.quote.classes||c.terms.recipientContact?.trim().toLowerCase()!==intent.recipientEmail)fail('gift_terms');
    const issued=executeVoucherCommand(db,{...c.terms,type:'issue',actorId:actor.id,role:c.role,requestId:`gift-issue:${payment.id}`},{tenantId:context.tenantId,now,id});db=issued.db;
    const voucher=db.vouchers.find(v=>v.id===issued.result.voucher.id) as VoucherRow;voucher.source='purchased_gift';
    const issuedEvent=db.voucher_events.find(e=>e.id===issued.result.event.id);if(issuedEvent)((issuedEvent.payload as{result:{voucher:VoucherRow}}).result.voucher).source='purchased_gift';
    const current=db.payments.find(p=>p.id===payment.id) as PaymentRow;Object.assign(current,{status:'approved',amount_paid:c.amount,note:c.reason.trim(),taken_by:actor.id,paid_at:now,updated_at:now});
    const receipt:LaunchReceipt={version:1,kind:'fictional-payment-receipt',reference:receiptReference(current.id),source:'transfer-review',facts:{paymentId:current.id,tenantId:current.tenant_id,customerId:current.user_id,planId:current.plan_id,amountCharged:current.amount,amountReceived:current.amount_paid,currency:current.currency,method:current.method,provider:current.provider,confirmedAt:current.paid_at,recordedBy:current.taken_by??null,quote:readPaymentQuote(current)},item:structuredClone(intent.quote.name),recordedTax:structuredClone(intent.quote.taxTotals??null),previewChannels:['email'],delivery:'preview-only'};
    receipt.emailPreview=buildReceiptEmailPreview(receipt,(db.users??[]) as UserRow[],(db.profiles??[]) as ProfileRow[]);
    receipt.recordedBySnapshot=buildReceiptRecorderSnapshot(receipt,(db.users??[]) as UserRow[],(db.profiles??[]) as ProfileRow[]);
    current.frontend_receipt=receipt;if(!readLaunchReceipt(current))fail('gift_receipt');
    const retained=db.gift_purchase_intents.find(r=>r.id===intent.id) as GiftPurchaseIntent;Object.assign(retained,{voucherId:voucher.id,terms:structuredClone(c.terms),approvalRequestId:requestId,updated_at:now});
    result={purchaseId:intent.id,payment:current,voucher,state:'approved'};
   }
  }
 }
 (db.gift_purchase_requests??=[]).push({...base(requestId),actorId:actor.id,type:c.type,fingerprint,result:structuredClone(result)});
 (db.audit_log??=[]).push({...base(),actor_id:actor.id,action:`gift.mock.${c.type}`,entity:'payments',entity_id:result.payment.id,ip:null,diff:{request_id:requestId,purchase_id:result.purchaseId,voucher_id:result.voucher?.id??null,simulated:true}});
 return{db,result:structuredClone(result)};
}
