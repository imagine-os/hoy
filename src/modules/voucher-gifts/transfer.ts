import type {DataProvider} from '../../data/types';
import type {FrozenSaleQuote} from '../../data/operationalQuotes';
import type {VoucherTerms} from '../../data/vouchers';
import type {ReceiptImage} from '../transfers/receipts';
export async function submitGiftTransfer(data:DataProvider,input:{requestId:string;actorId:string;role:string;quote:FrozenSaleQuote;recipientEmail:string;image:ReceiptImage},isCurrent:()=>boolean){
 if(data.name!=='mock'||!data.purchasedGift)throw Error('gift_disconnected');
 return data.purchasedGift({...input,type:'purchase'},isCurrent);
}
export async function reviewGiftTransfer(data:DataProvider,input:{purchaseId:string;requestId:string;actorId:string;role:string;decision:'approved'|'rejected';amount:number;reason:string;compared:boolean;terms?:VoucherTerms;termsReviewed:boolean},isCurrent:()=>boolean){
 if(data.name!=='mock'||!data.purchasedGift)throw Error('gift_disconnected');
 if(!input.compared)throw Error('gift_review_required');
 if(input.decision==='rejected')return data.purchasedGift({type:'reject',purchaseId:input.purchaseId,requestId:input.requestId,actorId:input.actorId,role:input.role,reason:input.reason},isCurrent);
 if(!input.termsReviewed||!input.terms)throw Error('gift_terms');
 return data.purchasedGift({type:'approve',purchaseId:input.purchaseId,requestId:input.requestId,actorId:input.actorId,role:input.role,amount:input.amount,reason:input.reason,reviewed:true,terms:input.terms},isCurrent);
}
