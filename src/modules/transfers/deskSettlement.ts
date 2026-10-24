import { requireExistingBookingContact } from '../../data/bookingContact';
import {readPendingDeskIntent,type PendingDeskIntent} from '../../data/pendingDeskIntent';
import {bookWithPackage} from '../../data/deskBooking';
import {requireSessionAdmission} from '../../data/sessionAdmission';
import {chooseMat,usesMats} from '../../data/mats';
import type {VoucherBookingRow} from '../../data/vouchers';
import { captureLaunchReceipt, readLaunchReceipt } from '../../data/launchReceipts';
import type { DataProvider } from '../../data/types';
import type { BaseRow, BookingRow, ClassLedgerRow, PaymentRow, UserRow, ModalityRow, RoomRow } from '../../data/schema';
import { readPaymentQuote } from '../../data/operationalQuotes';
import { assertTrialAvailable } from '../../data/trialEligibility';
import { dateKey } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';

export const DESK_METHODS = ['cash', 'card', 'transfer'] as const;
export type DeskMethod = typeof DESK_METHODS[number];
export interface DeskSettlement { paymentId: string; actorId: string; role: string; method: DeskMethod; amount: number; note: string }
const roles = ['super_admin', 'admin', 'front_desk'];
interface Fulfillment { version: 1; customerId: string; grantId: string; paymentHash: string; grantHash: string; booking?:{version:1;bookingId:string;debitId:string;intentHash:string;bookingHash:string;debitHash:string;receiptHash:string} }
const paymentState = (p: PaymentRow) => [p.id, p.tenant_id, p.user_id, p.plan_id, p.currency, p.amount, p.amount_paid, p.method, p.provider, p.status, p.note, p.taken_by, p.paid_at, readPaymentQuote(p)];
const grantState = (g: ClassLedgerRow) => [g.id, g.tenant_id, g.user_id, g.plan_id, g.payment_id, g.delta, g.reason, g.expires_at, g.frozen_from ?? null, g.frozen_until ?? null, g.frontend_quote];
async function digest(value: unknown) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))].map(n => n.toString(16).padStart(2, '0')).join('');
}

const grantStaticState=(g:ClassLedgerRow)=>[g.id,g.tenant_id,g.user_id,g.plan_id,g.payment_id,g.delta,g.reason,g.frontend_quote];
const bookingStaticState=(b:BookingRow)=>[b.id,b.tenant_id,b.user_id,b.session_id,b.paid_with,b.ledger_id,b.mat_number??null];
function strictIntent(payment:PaymentRow):PendingDeskIntent|null{
 const intent=readPendingDeskIntent(payment);if(intent&&Object.keys(payment.frontend_desk_intent as object).some(k=>!Object.prototype.hasOwnProperty.call(intent,k)))throw Error('desk_intent_invalid');return intent;
}
/** Every asynchronous transaction read/write retains the captured UI actor context. */
function guardedTransaction(data:DataProvider,check:()=>void):DataProvider{return new Proxy({} as DataProvider,{get(_target,property){const value=Reflect.get(data,property);if(['get','list','insert','update','remove'].includes(String(property)))return async(...args:unknown[])=>{check();const result=await value.apply(data,args);check();return result;};return typeof value==='function'?value.bind(data):value;}});}
async function requestedTarget(data:DataProvider,intent:PendingDeskIntent,check:()=>void){
 const session=await requireSessionAdmission(data,intent.sessionId,{isCurrent:()=>{check();return true;}}),modality=await data.get<ModalityRow>('modalities',session.modality_id),room=await data.get<RoomRow>('rooms',session.room_id);check();
 if(!room||room.tenant_id!==tenant.id||!Number.isSafeInteger(room.capacity)||room.capacity<1||!Number.isSafeInteger(session.capacity)||session.capacity<1)throw Error('session_unavailable');
 const mats=usesMats(modality),capacity=Math.min(session.capacity,room.capacity,mats?tenant.studio.mats:Infinity);
 const bookings=(await data.list<BookingRow>('bookings',{where:{tenant_id:tenant.id,session_id:session.id}})).filter(b=>b.tenant_id===tenant.id&&b.session_id===session.id),vouchers=(await data.list<VoucherBookingRow>('voucher_bookings',{where:{tenant_id:tenant.id,sessionId:session.id}})).filter(b=>b.tenant_id===tenant.id&&b.sessionId===session.id&&b.status!=='cancelled');check();
 if(bookings.filter(b=>b.status!=='cancelled'&&b.status!=='late_cancel').length+vouchers.reduce((n,b)=>n+b.participants.length,0)>=capacity)throw Error('session_full');
 if(mats){if(intent.matNumber===null)throw Error('mat_invalid');chooseMat([...bookings,...vouchers.flatMap(v=>v.mats.map(mat_number=>({status:'booked',mat_number} as BookingRow)))],capacity,intent.matNumber);}else if(intent.matNumber!==null)throw Error('mat_invalid');
 return session;
}

/** Only receipt-free pending desk requests with retained, supported terms can be fulfilled here. */
export function canSettleAtDesk(payment: PaymentRow | null): boolean {
  const quote = payment && readPaymentQuote(payment);
  try{if(payment)strictIntent(payment);}catch{return false;}
  return !!payment && payment.tenant_id === tenant.id && payment.status === 'pending' && payment.provider === 'manual'
    && payment.method === 'cash' && !!payment.user_id && !!quote && quote.kind === 'class' && quote.quantity === 1 && quote.entitlementExpiresAt !== null;
}

/** Browser-only collection. A retained booking intent is fulfilled atomically; legacy requests remain product-only. */
export async function settleAtDesk(data: DataProvider, command: DeskSettlement, cancelled: () => boolean = () => false): Promise<PaymentRow> {
  const input = { ...command, note: command.note.trim() };
  const check = () => { if (cancelled()) throw Error('cancelled'); };
  check();
  if (data.name !== 'mock' || !data.atomic) throw Error('disconnected');
  if (!roles.includes(input.role) || !input.actorId) throw Error('forbidden');
  if (!DESK_METHODS.includes(input.method) || !Number.isSafeInteger(input.amount) || input.amount < 1 || !input.note || input.note.length > 500) throw Error('invalid');
  const fingerprint = JSON.stringify([input.paymentId, input.actorId, input.role, input.method, input.amount, input.note]), auditId = `desk-settlement:${input.paymentId}`;
  return data.atomic(async staged => {
    const tx=guardedTransaction(staged,check),hash=async(value:unknown)=>{check();const result=await digest(value);check();return result;};
    check();
    const [payment, actor] = await Promise.all([
      tx.get<PaymentRow>('payments', input.paymentId), tx.get<UserRow>('users', input.actorId),
    ]);
    check();
    if (!actor || actor.tenant_id !== tenant.id || actor.status !== 'active') throw Error('actor_scope');
    if (!payment || payment.tenant_id !== tenant.id) throw Error('payment_scope');
    const actorRoles=await tx.list('user_roles',{where:{tenant_id:tenant.id,user_id:input.actorId}});check();
    if(!actorRoles.some(r=>r.tenant_id===tenant.id&&r.user_id===input.actorId&&(r.role===input.role||r.role==='super_admin')))throw Error('forbidden');
    const intent=strictIntent(payment);
    const previous = await tx.get<BaseRow>('audit_log', auditId); check();
    // Reconcile a committed but unacknowledged operation before assessing current eligibility or dates.
    if (previous) {
      const diff = previous.diff as { fingerprint?: string; fulfillment?: Fulfillment } | null;
      if (previous.tenant_id !== tenant.id || previous.entity !== 'payments' || previous.entity_id !== payment.id || previous.actor_id !== input.actorId
        || previous.action !== 'payment.desk.approved' || diff?.fingerprint !== fingerprint || payment.status !== 'approved' || payment.provider !== 'manual'
        || payment.taken_by !== input.actorId || payment.amount !== input.amount || payment.amount_paid !== input.amount || payment.method !== input.method || payment.note !== input.note) throw Error('settlement_conflict');
      const recorded = diff.fulfillment;
      if (recorded?.version !== 1 || payment.user_id !== recorded.customerId || !recorded.grantId) throw Error('settlement_conflict');
      const [customer, grants, receipts] = await Promise.all([
        tx.get<UserRow>('users', recorded.customerId),
        tx.list<ClassLedgerRow>('class_ledger', { where: { tenant_id: tenant.id, payment_id: payment.id } }),
        tx.list('transfer_receipts', { where: { tenant_id: tenant.id, payment_id: payment.id } }),
      ]); check();
      if (!customer || customer.id !== recorded.customerId || customer.tenant_id !== tenant.id || customer.status !== 'active'
        || receipts.length || grants.filter(g=>g.reason==='purchase').length !== 1 || grants.filter(g=>g.reason==='purchase')[0].id !== recorded.grantId || grants.filter(g=>g.reason==='purchase')[0].user_id !== recorded.customerId
        || grants.filter(g=>g.reason==='purchase')[0].tenant_id !== tenant.id || grants.filter(g=>g.reason==='purchase')[0].payment_id !== payment.id
        || await hash(paymentState(payment)) !== recorded.paymentHash || await hash(recorded.booking?grantStaticState(grants.filter(g=>g.reason==='purchase')[0]):grantState(grants[0])) !== recorded.grantHash) throw Error('settlement_conflict');
      if(recorded.booking&&(!readLaunchReceipt(payment)||await hash(readLaunchReceipt(payment))!==recorded.booking.receiptHash))throw Error('settlement_conflict');
      if(!!intent!==!!recorded.booking)throw Error('settlement_conflict');
      if(recorded.booking){
        const bookingAudit=await tx.get<BaseRow>('audit_log',`desk-booking:${payment.id}`);check();
        if(!bookingAudit||bookingAudit.tenant_id!==tenant.id||bookingAudit.actor_id!==input.actorId||bookingAudit.action!=='booking.create'||bookingAudit.entity!=='bookings'||bookingAudit.entity_id!==recorded.booking.bookingId)throw Error('settlement_conflict');
        const proof=recorded.booking,booking=await tx.get<BookingRow>('bookings',proof.bookingId),debits=grants.filter(g=>g.id===proof.debitId);check();
        const debit=debits[0],grant=grants.find(g=>g.id===recorded.grantId);
        if(proof.version!==1||!intent||!booking||booking.tenant_id!==tenant.id||booking.user_id!==recorded.customerId||booking.session_id!==intent.sessionId||booking.ledger_id!==proof.debitId||(booking.mat_number??null)!==intent.matNumber||!['booked','checked_in','no_show','cancelled','late_cancel'].includes(booking.status)||debits.length!==1||!debit||debit.tenant_id!==tenant.id||debit.user_id!==recorded.customerId||debit.plan_id!==payment.plan_id||debit.payment_id!==payment.id||debit.delta!==-1||debit.reason!=='booking'||debit.purchase_ledger_id!==grant?.id||await hash(intent)!==proof.intentHash||await hash(bookingStaticState(booking))!==proof.bookingHash||await hash(grantState(debit))!==proof.debitHash)throw Error('settlement_conflict');
      }
      if (payment.frontend_receipt && !readLaunchReceipt(payment)) throw Error('settlement_conflict');
      check();
      return payment;
    }
    if (!canSettleAtDesk(payment) || input.amount !== payment.amount) throw Error('payment_state');
    const quote = readPaymentQuote(payment)!;
    // Preserve purchased validity; do not revive expired packages or infer new terms from today's catalog.
    if (quote.entitlementExpiresAt && quote.entitlementExpiresAt < dateKey(new Date())) throw Error('terms_expired');
    const [customer, receipts, grants] = await Promise.all([
      tx.get<UserRow>('users', payment.user_id!),
      tx.list('transfer_receipts', { where: { tenant_id: tenant.id, payment_id: payment.id } }),
      tx.list<ClassLedgerRow>('class_ledger', { where: { tenant_id: tenant.id, payment_id: payment.id } }),
    ]); check();
    if (!customer || customer.tenant_id !== tenant.id || customer.status !== 'active' || receipts.length || grants.length) throw Error('fulfillment_scope');
    if(intent){await requestedTarget(tx,intent,check);await requireExistingBookingContact(tx,payment.user_id!,tenant.id,{isCurrent:()=>{check();return true;}});}
    if (quote.itemId === 'trial') { await assertTrialAvailable(tx, payment.user_id!, payment.id); check(); }
    let approved = await tx.update<PaymentRow>('payments', payment.id, {
      status: 'approved', amount_paid: input.amount, method: input.method, taken_by: input.actorId,
      note: input.note, paid_at: new Date().toISOString(),
    }); check();
    const grant = await tx.insert<ClassLedgerRow>('class_ledger', {
      user_id: payment.user_id!, plan_id: payment.plan_id, payment_id: payment.id, frontend_quote: structuredClone(quote),
      delta: quote.classes, reason: 'purchase', expires_at: quote.entitlementExpiresAt, frozen_from: null, frozen_until: null,
    }); check();
    let booking:BookingRow|null=null,debit:ClassLedgerRow|null=null;
    if(intent){
      booking=await bookWithPackage(tx,{userId:payment.user_id!,sessionId:intent.sessionId,status:'booked',paymentId:payment.id,paidWith:quote.itemId==='trial'?'trial':quote.classes===1?'single':'package',control:{isCurrent:()=>{check();return true;}}});check();
      if((booking.mat_number??null)!==intent.matNumber)booking=await tx.update<BookingRow>('bookings',booking.id,{mat_number:intent.matNumber});check();
      if((booking.mat_number??null)!==intent.matNumber)throw Error('mat_invalid');
      await requireSessionAdmission(tx,intent.sessionId,{isCurrent:()=>{check();return true;}});check();
      debit=booking.ledger_id?await tx.get<ClassLedgerRow>('class_ledger',booking.ledger_id):null;check();if(!debit||debit.purchase_ledger_id!==grant.id||debit.payment_id!==payment.id||debit.delta!==-1)throw Error('fulfillment_scope');
    }
    approved = await captureLaunchReceipt(tx, approved, { source: 'desk-settlement' }); check();
    if(booking)await tx.insert('audit_log',{id:`desk-booking:${payment.id}`,actor_id:input.actorId,action:'booking.create',entity:'bookings',entity_id:booking.id,ip:null,diff:{role:input.role,source:'fictional-desk-settlement',payment_id:payment.id,session_id:booking.session_id,mat_number:booking.mat_number??null}});check();
    const fulfillment: Fulfillment = { version: 1, customerId: payment.user_id!, grantId: grant.id, paymentHash: await hash(paymentState(approved)), grantHash: await hash(intent?grantStaticState(grant):grantState(grant)), ...(intent&&booking&&debit?{booking:{version:1 as const,bookingId:booking.id,debitId:debit.id,intentHash:await hash(intent),bookingHash:await hash(bookingStaticState(booking)),debitHash:await hash(grantState(debit)),receiptHash:await hash(readLaunchReceipt(approved))}}:{}) };
    check();
    await tx.insert('audit_log', {
      id: auditId, actor_id: input.actorId, action: 'payment.desk.approved', entity: 'payments', entity_id: payment.id, ip: null,
      diff: { source: 'fictional-desk-settlement', role: input.role, fingerprint, fulfillment, receiptDelivery: 'disconnected', booking: booking?'retained-intent-booked':'no-retained-booking-intent' },
    }); check();
    return approved;
  });
}

export type DeskBookingConfirmation={kind:'pending';payment:PaymentRow}|{kind:'saved';payment:PaymentRow;booking:BookingRow}|{kind:'unavailable'};
/** Read-only proof for the current customer's retained desk request. No staff command permission,
 * status-only promotion, quote repricing, new admission or writes. Real backend authorization is separate. */
export async function readDeskBookingConfirmation(data:DataProvider,input:{paymentId:string;customerId:string},isCurrent:()=>boolean=()=>true):Promise<DeskBookingConfirmation>{
 const check=()=>{if(!isCurrent())throw Error('desk_confirmation_context');};check();if(data.name!=='mock')throw Error('desk_confirmation_disconnected');
 const tx=guardedTransaction(data,check),hash=async(value:unknown)=>{check();const result=await digest(value);check();return result;};
 const customer=await tx.get<UserRow>('users',input.customerId);if(!customer||customer.tenant_id!==tenant.id||customer.status!=='active')throw Error('desk_confirmation_scope');
 const payment=await tx.get<PaymentRow>('payments',input.paymentId);if(!payment)return{kind:'unavailable'};
 if(payment.tenant_id!==tenant.id||payment.user_id!==input.customerId)throw Error('desk_confirmation_scope');
 const intent=strictIntent(payment);if(!intent)return{kind:'unavailable'};
 if(payment.status==='pending'){if(!canSettleAtDesk(payment))throw Error('desk_confirmation_unverified');return{kind:'pending',payment};}
 if(payment.status!=='approved')return{kind:'unavailable'};
 const receipt=readLaunchReceipt(payment),audit=await tx.get<BaseRow>('audit_log',`desk-settlement:${payment.id}`),diff=audit?.diff as {source?:string;fulfillment?:Fulfillment}|undefined,recorded=diff?.fulfillment;
 if(!receipt||receipt.source!=='desk-settlement'||payment.provider!=='manual'||!DESK_METHODS.includes(payment.method as DeskMethod)||!audit||audit.tenant_id!==tenant.id||audit.action!=='payment.desk.approved'||audit.entity!=='payments'||audit.entity_id!==payment.id||audit.actor_id!==payment.taken_by||diff?.source!=='fictional-desk-settlement'||recorded?.version!==1||recorded.customerId!==input.customerId||!recorded.booking)throw Error('desk_confirmation_unverified');
 const proof=recorded.booking,booking=await tx.get<BookingRow>('bookings',proof.bookingId),ledger=await tx.list<ClassLedgerRow>('class_ledger',{where:{tenant_id:tenant.id,payment_id:payment.id}}),receipts=await tx.list('transfer_receipts',{where:{tenant_id:tenant.id,payment_id:payment.id}}),bookingAudit=await tx.get<BaseRow>('audit_log',`desk-booking:${payment.id}`);check();
 const grants=ledger.filter(g=>g.tenant_id===tenant.id&&g.payment_id===payment.id&&g.reason==='purchase'),debits=ledger.filter(g=>g.tenant_id===tenant.id&&g.payment_id===payment.id&&g.id===proof.debitId),grant=grants[0],debit=debits[0];
 if(proof.version!==1||await hash(receipt)!==proof.receiptHash||receipts.length||grants.length!==1||!grant||grant.id!==recorded.grantId||grant.user_id!==input.customerId||grant.plan_id!==payment.plan_id||grant.delta!==readPaymentQuote(payment)?.classes||debits.length!==1||!debit||debit.user_id!==input.customerId||debit.plan_id!==payment.plan_id||debit.purchase_ledger_id!==grant.id||debit.reason!=='booking'||debit.delta!==-1||!booking||booking.tenant_id!==tenant.id||booking.user_id!==input.customerId||booking.session_id!==intent.sessionId||booking.ledger_id!==debit.id||(booking.mat_number??null)!==intent.matNumber||!['booked','checked_in','no_show','cancelled','late_cancel'].includes(booking.status)||!bookingAudit||bookingAudit.tenant_id!==tenant.id||bookingAudit.actor_id!==payment.taken_by||bookingAudit.action!=='booking.create'||bookingAudit.entity!=='bookings'||bookingAudit.entity_id!==booking.id||await hash(paymentState(payment))!==recorded.paymentHash||await hash(grantStaticState(grant))!==recorded.grantHash||await hash(intent)!==proof.intentHash||await hash(bookingStaticState(booking))!==proof.bookingHash||await hash(grantState(debit))!==proof.debitHash)throw Error('desk_confirmation_unverified');
 check();return{kind:'saved',payment,booking};
}
