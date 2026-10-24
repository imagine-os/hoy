import {useEffect,useState} from 'react';
import {useI18n} from '../../../i18n/I18nProvider';
import type {Lang} from '../../../i18n/types';
import {strings} from '../../../modules/admin/strings';
import type {PaymentInstructionsView} from '../../../modules/admin/paymentInstructions';
import {usePaymentInstructions} from '../../../modules/admin/usePaymentInstructions';
import {Button} from '../../atom/Button/Button';
import {Notice} from '../../molecule/Notice/Notice';
import './PaymentInstructions.css';
export interface PaymentInstructionsProps{view?:PaymentInstructionsView;status:'loading'|'ready'|'error';onRetry?:()=>void;locale?:Lang}
export function PaymentInstructions({view,status,onRetry,locale}:PaymentInstructionsProps){
 const[failedImage,setFailedImage]=useState<string|null>(null);useEffect(()=>setFailedImage(null),[status,view?.values.qrImageUrl]);
 const{lang}=useI18n(),language=locale??lang,text=(key:string)=>{const entry=strings[`admin.paymentInstructions.${key}`];return(language==='en'?entry.en:entry.es)??entry.es;};
 return <section className="payment-instructions stack-sm" aria-label={text('title')} data-payment-instructions={status}>
  <h3 className="small">{text('title')}</h3><p className="xs muted">{text('boundary')}</p>
  {status==='loading'?<div className="stack-sm"><p role="status" aria-busy="true">{text('loading')}</p>{onRetry&&<Button variant="secondary" onClick={onRetry}>{text('retry')}</Button>}</div>:status==='error'||!view?<Notice tone="warn" action={onRetry&&<Button variant="secondary" onClick={onRetry}>{text('retry')}</Button>}>{text('error')}</Notice>:<>
   {view.status!=='configured'&&<p role="status" className="small">{text(view.status)}</p>}
   <dl className="payment-instructions-fields">{(['bankName','accountType','accountNumber','accountHolder','breBKey']as const).map(field=><div key={field}><dt className="xs muted">{text(field)}</dt><dd className="small">{view.values[field]?(field==='accountType'?text(view.values[field]!):view.values[field]):text('missing')}</dd></div>)}</dl>
   <div className="stack-sm"><span className="xs muted">{text('qrImageUrl')}</span>{view.values.qrImageUrl&&failedImage!==view.values.qrImageUrl?<img className="payment-instructions-qr" src={/^(data:|https?:|\/)/.test(view.values.qrImageUrl)?view.values.qrImageUrl:`${import.meta.env.BASE_URL}${view.values.qrImageUrl.replace(/^\.\//,'')}`} alt={text('qrAlt')} onError={()=>setFailedImage(view.values.qrImageUrl)}/>:<span className="small">{text('missing')}</span>}{failedImage===view.values.qrImageUrl&&failedImage&&<p role="status" className="small">{text('imageError')}</p>}</div>
  </>}
 </section>;
}
export function SavedPaymentInstructions({locale}:{locale?:Lang}){const read=usePaymentInstructions();return <PaymentInstructions {...read} onRetry={read.retry} locale={locale}/>;}
