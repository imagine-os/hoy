import {useRecipientPreview} from '../voucher-gifts/useRecipientPreview';
import {VoucherRecipientPreview} from '../../components/organism/VoucherRecipientPreview/VoucherRecipientPreview';
import {reviewGiftTransfer} from '../voucher-gifts/transfer';
import {ReviewGiftTerms,emptyGiftTerms} from '../../components/organism/GiftTermsReview/GiftTermsReview';
import type {DataProvider} from '../../data/types';
import { LaunchPaymentReceipt } from '../../components/organism/LaunchPaymentReceipt/LaunchPaymentReceipt';
import {useTrialAssessment} from '../customer/useTrialAssessment';
import {trialErrorKey} from '../../data/trialEligibility';
import {useEffect,useState,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useData} from '../../data/DataContext';
import type {PaymentRow,TransferReceiptRow} from '../../data/schema';
import {useSession} from '../../auth/SessionProvider';
import {useI18n} from '../../i18n/I18nProvider';
import {useLayout} from '../../layout/useLayout';
import {Button} from '../../components/atom/Button/Button';
import {Input,Select} from '../../components/atom/Input/Input';
import {Badge} from '../../components/atom/Badge/Badge';
import {Card} from '../../components/molecule/Card/Card';
import {Notice} from '../../components/molecule/Notice/Notice';
import {Drawer} from '../../components/organism/Drawer/Drawer';
import {formatCOP,formatDateTime} from '../../i18n/format';
import {transferSpec} from './specs';
import {reviewTransfer} from './receipts';
import {tenant} from '../../tenant/tenant';
import {emptyQueue,readQueue,projectQueue,entryMatches,queueTables,validAmount,type QueueEntry} from './pendingQueue';
import {DeskPaymentSettlement} from '../../components/organism/DeskPaymentSettlement/DeskPaymentSettlement';
export function TransferQueuePage(){
 const data=useData(),{user,role}=useSession(),{t,bi,lang}=useI18n(),{sections,isVisible}=useLayout(transferSpec);const [params,setParams]=useSearchParams();
 const [snapshot,setSnapshot]=useState(emptyQueue),[loading,setLoading]=useState(true),[readError,setReadError]=useState(false),[revision,setRevision]=useState(0);
 const {receipts:rows,payments}=snapshot;
 const [filter,setFilter]=useState('pending'),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[compared,setCompared]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const [settled,setSettled]=useState<{payment:PaymentRow;actor:string;customer:string|null;provider:DataProvider;context:string}|null>(null);
 const [giftTerms,setGiftTerms]=useState(emptyGiftTerms);const giftRequest=useRef(crypto.randomUUID());const recipientPreview=useRecipientPreview();
 const giftLive=useRef({mounted:true,data,context:`${user.id}:${role}:${params.toString()}`});giftLive.current={...giftLive.current,data,context:`${user.id}:${role}:${params.toString()}`};
 useEffect(()=>{giftLive.current.mounted=true;return()=>{giftLive.current.mounted=false;};},[]);
 const settlementContext=`${user.id}:${role}`;
 useEffect(()=>setSettled(null),[data,user.id,role]);
 useEffect(()=>{setBusy(false);setError(null);setGiftTerms(emptyGiftTerms);giftRequest.current=crypto.randomUUID();},[data,user.id,role,params.toString()]);
 useEffect(()=>{let active=true;setLoading(true);setReadError(false);readQueue(data,tenant.id).then(value=>{if(active)setSnapshot(value);}).catch(()=>{if(active)setReadError(true);}).finally(()=>{if(active)setLoading(false);});const unsub=queueTables.map(table=>data.subscribe(table,()=>setRevision(n=>n+1)));return()=>{active=false;unsub.forEach(stop=>stop());};},[data,revision]);
 const entries=projectQueue(snapshot,tenant.id),ready=!loading&&!readError;
 const selected=ready?rows.find(r=>r.id===params.get('receipt')):undefined,payment=payments.find(p=>p.id===selected?.payment_id&&p.user_id===selected?.user_id);
 const trial=useTrialAssessment(selected?.product_id==='plan_trial'?selected.user_id:null);
 const detail=ready?entries.find(e=>e.payment?.id===params.get('payment')):undefined;
 function money(pay:PaymentRow|null){const value=validAmount(pay);return value===null?t('transfers.unknownAmount'):pay?.currency==='COP'?formatCOP(value,lang):`${value.toLocaleString(lang)} ${pay?.currency?.trim()||t('transfers.unknownCurrency')}`;}
 function date(value:string|undefined){return value&&Number.isFinite(Date.parse(value))?formatDateTime(value,lang):t('transfers.unknownDate');}
 function product(entry:QueueEntry){return entry.receipts[0]?.product_name?bi(entry.receipts[0].product_name):entry.quote?bi(entry.quote.name):entry.plan?`${lang==='es'?entry.plan.name_es:entry.plan.name_en} · ${t('transfers.catalogFallback')}`:`${t('transfers.unknownProduct')} · ${t('transfers.termsUnverified')}`;}
 function method(pay:PaymentRow|null){const known=['cash','transfer','card','pse','qr','gift_card'];return pay&&known.includes(pay.method)?t(`transfers.payMethod.${pay.method}`):t('transfers.unknownMethod');}
 function provider(pay:PaymentRow|null){return pay?.provider==='manual'?t('transfers.manualProvider'):pay?.provider==='wompi'?'Wompi':t('transfers.unknownProvider');}
 function facts(entry:QueueEntry){return <div className="stack-sm" style={{overflowWrap:'anywhere'}}><strong>{entry.customer??t('transfers.unknownCustomer')}</strong><p>{product(entry)} · {money(entry.payment)}</p>{entry.quote?.kind==='class'&&!entry.receipts[0]?.product_name&&<p className="small">{t('transfers.quoteSummary',{date:entry.quote.purchaseDate,revision:entry.quote.catalogRevision,classes:entry.quote.classes,quantity:entry.quote.quantity,validity:entry.quote.validityDays??entry.quote.fallbackValidityDays??t('transfers.quoteUndefined'),expiry:entry.quote.entitlementExpiresAt??t('transfers.quoteUndefined')})}</p>}<p>{t('transfers.paymentMethod')}: {method(entry.payment)} · {provider(entry.payment)}</p><p>{t('transfers.when')} · {date(entry.payment?.created_at??entry.receipts[0]?.created_at)}</p><p>{t(entry.gift?.image?.dataUrl?.startsWith('data:image/')||entry.receipts.some(r=>r.image_data_url?.startsWith('data:image/'))?'transfers.receiptAvailable':'transfers.receiptMissing')}</p></div>;}
 function open(r:TransferReceiptRow){setParams({receipt:r.id});setAmount('');setReason('');setCompared(false);setError(null);}
 async function decide(decision:'approved'|'rejected'){
  if(!selected||!ready||busy)return;
  const provider=data,context=giftLive.current.context,current=()=>giftLive.current.mounted&&giftLive.current.data===provider&&giftLive.current.context===context;
  setBusy(true);setError(null);
  try{await reviewTransfer(provider,{id:selected.id,actorId:user.id,role,decision,amount:amount.trim()===''?NaN:Number(amount),reason,compared},current);if(current()){setParams({});setRevision(n=>n+1);}}
  catch(e){if(current())setError(e instanceof Error&&e.message==='booking_contact_required'?'customer.book.contactRequired':trialErrorKey(e)??'transfers.reviewError');}
  finally{if(current())setBusy(false);}
 }
 async function decideGift(decision:'approved'|'rejected'){
  if(!detail?.gift||!ready||busy)return;const provider=data,context=giftLive.current.context,current=()=>giftLive.current.mounted&&giftLive.current.data===provider&&giftLive.current.context===context;
  setBusy(true);setError(null);try{
   const previewRequestId=giftRequest.current;const draft=giftTerms,expiresAt=draft.expiryMode==='none'?null:draft.expiry?new Date(`${draft.expiry}T23:59:59-05:00`).toISOString():null;
   const result=await reviewGiftTransfer(provider,{purchaseId:detail.gift.id,requestId:previewRequestId,actorId:user.id,role,decision,amount:amount.trim()===''?NaN:Number(amount),reason,compared,termsReviewed:draft.reviewed&&!!draft.expiryMode&&(draft.expiryMode==='none'||!!draft.expiry)&&!!draft.scope&&!!draft.unit&&!!draft.cancel&&!!draft.name.trim(),terms:{title:detail.quote?bi(detail.quote.name):'DEMO',benefitKind:'classes',benefitTotal:detail.gift.quote.classes,participantCap:Number(draft.cap),capScope:draft.scope as 'per_booking'|'lifetime',creditUnit:draft.unit as 'per_person'|'per_booking',expiresAt,cancellationPolicy:draft.cancel as 'restore'|'forfeit',recipientName:draft.name.trim(),recipientContact:detail.gift.recipientEmail,message:''}},current);
   if(current()){if(decision==='approved')recipientPreview.begin(result,previewRequestId);setRevision(n=>n+1);setParams({});}
  }catch{if(current()){setError('giftFlow.commandError');setRevision(n=>n+1);}}finally{if(current())setBusy(false);}
 }
 const boundary=<div className="stack-sm"><Notice tone="warn">{t('transfers.boundary')}</Notice><Notice>{t('transfers.queueTiming')}</Notice></div>;
 const content=<section className="stack">{settled&&settled.provider===data&&settled.context===settlementContext&&<><Notice tone="success">{t(settled.payment.frontend_desk_intent?'transfers.desk.savedBooking':'transfers.desk.saved',{id:settled.payment.id,amount:formatCOP(settled.payment.amount,lang),name:settled.actor})}</Notice><LaunchPaymentReceipt payment={settled.payment} customer={settled.customer??t('transfers.unknownCustomer')} /></>}<label className="stack-sm"><span>{t('transfers.filter')}</span><Select value={filter} onChange={e=>setFilter(e.target.value)}>{['pending','approved','rejected','all'].map(s=><option key={s} value={s}>{t(`transfers.${s}`)}</option>)}</Select></label>
  {loading?<p role="status">{t('core.common.loading')}</p>:readError?<Notice tone="danger" action={<Button onClick={()=>setRevision(n=>n+1)}>{t('transfers.retry')}</Button>}>{t('transfers.readError')}</Notice>:<>
  {entries.filter(e=>entryMatches(e,filter)).length===0&&<p>{t('transfers.empty')}</p>}
  {(params.has('receipt')&&!selected||params.has('payment')&&!detail)&&<Notice tone="warn" action={<Button onClick={()=>setParams({})}>{t('transfers.close')}</Button>}>{t('transfers.unavailable')}</Notice>}
  {entries.filter(e=>entryMatches(e,filter)).map(entry=>{const receipt=entry.receipts.find(r=>filter==='all'||r.status===filter)??entry.receipts[0];const status=entry.payment?.status==='pending'?'pending':receipt?.status??(entry.gift||entry.deskIntent?(entry.payment?.status==='approved'?'approved':'rejected'):undefined);return <Card key={entry.id}><div className="stack-sm">{facts(entry)}<Badge tone={status==='approved'?'success':status==='rejected'?'danger':'warn'}>{t(`transfers.${status}`)}</Badge><p className="xs muted">{t('transfers.queueTiming')}</p>{receipt?<Button variant="secondary" onClick={()=>open(receipt)}>{t('transfers.open')}</Button>:<Button variant="secondary" onClick={()=>{setParams({payment:entry.payment!.id});setGiftTerms(emptyGiftTerms);setAmount('');setReason('');setCompared(false);setError(null);giftRequest.current=crypto.randomUUID();}}>{t('transfers.paymentDetail')}</Button>}</div></Card>;})}</>}

 </section>;
 const review=<Drawer open={!!selected} onClose={()=>{if(!busy)setParams({});}} title={t('transfers.open')} side="right">{selected&&<div className="stack"><Notice tone="warn">{t('transfers.boundary')}</Notice>{selected.image_data_url?.startsWith('data:image/')?<img src={selected.image_data_url} alt={t('transfers.preview')} style={{width:'100%',height:'auto'}}/>:<Notice>{t('transfers.receiptMissing')}</Notice>}<p>{bi(selected.product_name)} · {money(payment??null)}</p><Notice>{t('transfers.bank')} · {money(payment??null)}</Notice>
 {selected.status==='pending'?<>{selected.product_id==='plan_trial'&&trial.status!=='eligible'&&<Notice tone="warn" action={trial.status==='trial_check_failed'?<Button onClick={trial.retry}>{t('core.common.retry')}</Button>:undefined}>{t(`customer.trialGuard.${trial.status}`)}</Notice>}<label className="stack-sm"><span>{t('transfers.amount')}</span><Input type="number" min="0" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="stack-sm"><span>{t('transfers.reason')}</span><Input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><label className="row"><input type="checkbox" checked={compared} onChange={e=>setCompared(e.target.checked)}/><span>{t('transfers.compared')}</span></label>{error&&<Notice tone="danger">{t(error)}</Notice>}<div className="stack-sm"><Button disabled={(selected.product_id==='plan_trial'&&trial.status!=='eligible')||busy||!payment||validAmount(payment)===null||!compared||!reason.trim()||amount.trim()===''||Number(amount)!==payment?.amount} loading={busy} onClick={()=>void decide('approved')}>{t('transfers.approve')}</Button><Button variant="secondary" disabled={busy||!payment||validAmount(payment)===null||!compared||!reason.trim()||amount.trim()===''||Number(amount)<0} onClick={()=>void decide('rejected')}>{t('transfers.reject')}</Button><Button variant="ghost" disabled={busy} onClick={()=>setParams({})}>{t('transfers.cancel')}</Button></div></>:<><Badge>{t(`transfers.${selected.status}`)}</Badge><p>{selected.review_reason}</p><p>{selected.amount_received===null?t('transfers.unknownAmount'):formatCOP(selected.amount_received,lang)}</p></>}
 </div>}</Drawer>;
 const paymentDetail=<Drawer open={!!detail} onClose={()=>setParams({})} title={t('transfers.paymentDetail')} side="right">{detail&&<div className="stack">{facts(detail)}{detail.gift?<><Notice tone="warn">{t('giftFlow.boundary')}</Notice><img src={detail.gift.image.dataUrl} alt={t('transfers.preview')} style={{width:'100%',height:'auto'}}/>{detail.payment?.status==='pending'?['admin','super_admin'].includes(role)?<>
 <ReviewGiftTerms disabled={busy} value={giftTerms} onChange={setGiftTerms}/><label className="stack-sm">{t('transfers.amount')}<Input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="stack-sm">{t('transfers.reason')}<Input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><label className="row"><input type="checkbox" checked={compared} onChange={e=>setCompared(e.target.checked)}/>{t('transfers.compared')}</label>{error&&<Notice tone="danger">{t(error)}</Notice>}<Button disabled={busy||!compared||!giftTerms.reviewed||!reason.trim()||Number(amount)!==detail.payment.amount} loading={busy} onClick={()=>void decideGift('approved')}>{t('transfers.approve')}</Button><Button variant="secondary" disabled={busy||!compared||!reason.trim()} onClick={()=>void decideGift('rejected')}>{t('transfers.reject')}</Button>
 </>:<Notice>{t('giftFlow.adminRequired')}</Notice>:<Notice>{t(detail.payment?.status==='approved'?'giftFlow.approved':'giftFlow.rejected')}</Notice>}</>:detail.deskIntent&&detail.payment?.status==='approved'?<LaunchPaymentReceipt payment={detail.payment} customer={detail.customer??t('transfers.unknownCustomer')}/>:detail.receipts.length===0&&detail.payment?.provider==='manual'&&(detail.payment.method==='cash'||!!detail.deskIntent)?<DeskPaymentSettlement key={`${settlementContext}:${detail.payment.id}`} payment={detail.payment} onSettled={payment=>{setSettled({payment,actor:user.name,customer:detail.customer,provider:data,context:settlementContext});setParams({});setRevision(n=>n+1);}}/>:<Notice>{t('transfers.readOnly')}</Notice>}<Notice>{t('transfers.queueTiming')}</Notice><Button onClick={()=>setParams({})}>{t('transfers.close')}</Button></div>}</Drawer>;
 const parts:Record<string,React.ReactNode>={Boundary:boundary,Queue:content,Review:<>{recipientPreview.result&&<VoucherRecipientPreview result={recipientPreview.result} onRetry={recipientPreview.retry}/>}{review}{paymentDetail}</>};
 return <div className="stack"><div className="page-head"><h1>{t('transfers.title')}</h1></div>{sections.filter(isVisible).map(name=><div key={name}>{parts[name]}</div>)}</div>;
}
