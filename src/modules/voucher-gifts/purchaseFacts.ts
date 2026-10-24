import type { BaseRow, PaymentRow } from '../../data/schema';
import {readPaymentQuote,type FrozenSaleQuote} from '../../data/operationalQuotes';
import {readLaunchReceipt} from '../../data/launchReceipts';
import type {VoucherDb,VoucherRow,VoucherTerms} from '../../data/vouchers';
import type {ReceiptImage} from '../transfers/receipts';
export interface GiftPurchaseIntent extends BaseRow {paymentId:string;buyerId:string;recipientEmail:string;quote:FrozenSaleQuote;image:ReceiptImage;voucherId:string|null;terms:VoucherTerms|null;approvalRequestId:string|null}
export interface GiftPurchaseResult {purchaseId:string;payment:PaymentRow;voucher:VoucherRow|null;state:'pending'|'approved'|'rejected'|'claimed'}
export interface GiftPurchaseRequest extends BaseRow {actorId:string;type:string;fingerprint:string;result:GiftPurchaseResult}
export const sameGiftFact=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const termKeys=['title','benefitKind','benefitTotal','participantCap','capScope','creditUnit','expiresAt','cancellationPolicy','recipientName','recipientContact','message'] as const;
/** Protected mock records must agree on the original payment, approval and immutable voucher terms. */
export function verifiedPurchasedGift(db:VoucherDb,voucher:VoucherRow,tenantId:string):GiftPurchaseIntent {
 const candidates=(db.gift_purchase_intents??[]).filter(r=>r.tenant_id===tenantId&&r.voucherId===voucher.id) as GiftPurchaseIntent[];
 if(candidates.length!==1)throw Error('gift_state_conflict');
 const intent=candidates[0],payment=(db.payments??[]).find(p=>p.id===intent.paymentId&&p.tenant_id===tenantId) as PaymentRow|undefined;
 const approved=(db.gift_purchase_requests??[]).find(r=>r.id===intent.approvalRequestId&&r.tenant_id===tenantId) as GiftPurchaseRequest|undefined;
 const purchased=(db.gift_purchase_requests??[]).find(r=>r.tenant_id===tenantId&&r.type==='purchase'&&(r as GiftPurchaseRequest).result?.purchaseId===intent.id) as GiftPurchaseRequest|undefined;
 let purchaseCommand:{type?:string;actorId?:string;recipientEmail?:string;quote?:unknown;image?:unknown}|null=null,approvalCommand:{type?:string;purchaseId?:string;actorId?:string;terms?:unknown;amount?:number}|null=null;
 try{purchaseCommand=JSON.parse(purchased?.fingerprint??'null');approvalCommand=JSON.parse(approved?.fingerprint??'null');}catch{throw Error('gift_state_conflict');}
 const original=approved?.result.voucher;
 if(!purchaseCommand||purchaseCommand.type!=='purchase'||purchaseCommand.actorId!==intent.buyerId||purchaseCommand.recipientEmail?.trim().toLowerCase()!==intent.recipientEmail||!sameGiftFact(purchaseCommand.quote,intent.quote)||!sameGiftFact(purchaseCommand.image,intent.image)||!approvalCommand||approvalCommand.type!=='approve'||approvalCommand.purchaseId!==intent.id||approvalCommand.actorId!==payment?.taken_by||approvalCommand.amount!==payment?.amount_paid||!sameGiftFact(approvalCommand.terms,intent.terms)||!payment||payment.status!=='approved'||!readLaunchReceipt(payment)||payment.user_id!==intent.buyerId||!sameGiftFact(readPaymentQuote(payment),intent.quote)||!intent.terms||voucher.source!=='purchased_gift'||!approved||approved.type!=='approve'||approved.result.purchaseId!==intent.id||approved.result.payment.id!==payment.id||!sameGiftFact(approved.result.payment,payment)||!original||original.id!==voucher.id||original.tenant_id!==tenantId||!purchased||purchased.result.payment.id!==payment.id||purchased.result.payment.user_id!==intent.buyerId||!sameGiftFact(readPaymentQuote(purchased.result.payment),intent.quote)||termKeys.some(key=>!sameGiftFact(voucher[key],original[key])||!sameGiftFact(voucher[key],intent.terms![key])))throw Error('gift_state_conflict');
 return intent;
}
export function assertPurchasedGiftClaim(db:VoucherDb,voucher:VoucherRow,tenantId:string,actorId:string,role:string){
 const intent=verifiedPurchasedGift(db,voucher,tenantId),account=(db.users??[]).find(u=>u.id===actorId&&u.tenant_id===tenantId);
 if(role!=='customer'||!account||account.status!=='active'||typeof account.email!=='string'||account.email.trim().toLowerCase()!==intent.recipientEmail||!(db.user_roles??[]).some(r=>r.tenant_id===tenantId&&r.user_id===actorId&&(r.role==='customer'||r.role==='super_admin')))throw Error('gift_recipient');
 return intent;
}
