import type{DataProvider}from'../../data/types';import type{PaymentRow,UserRow}from'../../data/schema';import type{VoucherRow,VoucherBookingRow}from'../../data/vouchers';import{tenant}from'../../tenant/tenant';import{verifiedPurchasedGift,type GiftPurchaseIntent}from'./purchaseFacts';
export interface GiftPurchaseView{intent:GiftPurchaseIntent;payment:PaymentRow;voucher:VoucherRow|null;used:boolean}
export async function readGiftPurchases(data:DataProvider,userId:string,role:string,paymentId:string|null,isCurrent:()=>boolean):Promise<GiftPurchaseView[]>{
 const check=()=>{if(!isCurrent())throw Error('gift_context_changed');};check();if(data.name!=='mock'||role!=='customer')throw Error('gift_disconnected');
 const account=await data.get<UserRow>('users',userId);check();if(!account||account.tenant_id!==tenant.id||account.status!=='active')throw Error('gift_actor');
 const intents=paymentId?[await data.get<GiftPurchaseIntent>('gift_purchase_intents',`gift-purchase:${paymentId}`)]:await data.list<GiftPurchaseIntent>('gift_purchase_intents',{where:{tenant_id:tenant.id,buyerId:userId}});check();
 const views:GiftPurchaseView[]=[];
 for(const intent of intents){
  if(!intent||intent.tenant_id!==tenant.id||intent.buyerId!==userId&&intent.recipientEmail!==account.email.trim().toLowerCase())continue;
  const payment=await data.get<PaymentRow>('payments',intent.paymentId);check();if(!payment||payment.tenant_id!==tenant.id||payment.user_id!==intent.buyerId)throw Error('gift_state_conflict');
  const voucher=intent.voucherId?await data.get<VoucherRow>('vouchers',intent.voucherId):null;check();let used=false;
  if(voucher){const requests=await data.list('gift_purchase_requests',{where:{tenant_id:tenant.id}});check();verifiedPurchasedGift({gift_purchase_intents:[intent],gift_purchase_requests:requests,payments:[payment]},voucher,tenant.id);const bookings=await data.list<VoucherBookingRow>('voucher_bookings',{where:{tenant_id:tenant.id,voucherId:voucher.id}});check();used=bookings.some(b=>b.tenant_id===tenant.id&&b.voucherId===voucher.id);}
  views.push({intent,payment,voucher,used});
 }
 return views;
}
