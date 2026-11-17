import { useEffect, useRef, useState } from 'react';
import { useData } from '../../../data/DataContext';
import { useSession } from '../../../auth/SessionProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../components/atom/Button/Button';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { readCustomer } from '../../admin/customers/customerDetail';
import { createCustomerRouteReader, type CustomerIdentityProvider } from '../../admin/customers/customerRoute';
import { cosRequest } from './wire';
import { createEmailReader, emailFingerprint, emailKey, validEmail, type EmailMatch, type EmailCheck } from './emailDuplicateAlert';

/** No write method is used here. Reuse only selects the normal desk flow; separate-record creation stays explicit. */
export function DuplicateEmailNotice({email,disabled=false,review=null,onContinue,onUseExisting}:{email:string;disabled?:boolean;review?:EmailCheck|null;onContinue:(check:EmailCheck)=>void;onUseExisting:(person:EmailMatch)=>boolean}){
 const data=useData(),request=cosRequest(data),session=useSession(),{t}=useI18n();
 const allowed=session.signedIn&&session.status==='ready'&&!!request&&!session.viewAs&&session.can('members.read')&&session.can('payments.write')&&!disabled;
 const key=JSON.stringify([emailKey(email),session.user.id,session.role,session.viewAs,allowed]);
 const [state,setState]=useState<{request:typeof request;key:string;result:EmailCheck}|null>(null),[retry,setRetry]=useState(0),[dismissed,setDismissed]=useState<string|null>(null),[choosing,setChoosing]=useState(false),[error,setError]=useState(false);
 const reader=useRef(createEmailReader()),alive=useRef(true),busy=useRef(false),current=useRef({key,request,allowed,onUseExisting});current.current={key,request,allowed,onUseExisting};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;reader.current.cancel();};},[]);
 useEffect(()=>{
  const pending=reader.current;let mounted=true;setError(false);setChoosing(false);busy.current=false;
  if(!request||!allowed||!validEmail(emailKey(email)))return()=>pending.cancel();
  setState(null);
  const timer=setTimeout(()=>{pending.read(request,email,{allowed,isCurrent:()=>current.current.key===key&&current.current.request===request&&current.current.allowed}).then(result=>{if(mounted&&result)setState({request,key,result});});},350);
  return()=>{mounted=false;clearTimeout(timer);pending.cancel();};
 },[request,key,retry,email,allowed]);
 if(!allowed||!validEmail(emailKey(email)))return null;
 const result=review??(state?.key===key&&state.request===request?state.result:null);
 if(result&&dismissed===key+emailFingerprint(result))return null;
 if(!result)return <Notice tone="info">{t('desk.email.checking')}</Notice>;
 const matches=result.kind==='checked'?result.matches:[];
 const choose=async(match:EmailMatch)=>{
  if(!request||busy.current)return;busy.current=true;setChoosing(true);setError(false);
  const stillCurrent=()=>alive.current&&current.current.key===key&&current.current.request===request&&current.current.allowed;
  try{
   const [detail,identity]=await Promise.all([readCustomer(request,match.id),createCustomerRouteReader().read(data as typeof data & CustomerIdentityProvider,match.id,session.user.id)]);
   if(!stillCurrent())return;
   if(!identity||emailKey(detail.person.data.email)!==emailKey(email)||typeof detail.person.data.name!=='string')throw Error('changed');
   const selected={id:identity.displayId,personId:detail.person.id,name:detail.person.data.name,email:String(detail.person.data.email),phone:typeof detail.person.data.phone==='string'?detail.person.data.phone:null};
   if(!current.current.onUseExisting(selected))throw Error('changed');
  }catch{if(stillCurrent())setError(true);}finally{if(stillCurrent()){busy.current=false;setChoosing(false);}}
 };
 if(result.kind==='unavailable')return <Notice tone="warn" action={<Button type="button" size="sm" variant="ghost" onClick={()=>setRetry(n=>n+1)}>{t('core.common.retry')}</Button>}>{t('desk.email.unavailable')}<Button type="button" size="sm" variant="ghost" onClick={()=>{onContinue(result);setDismissed(key+emailFingerprint(result));}}>{t('desk.email.continue')}</Button></Notice>;
 if(result.kind==='skipped')return null;
 if(!matches.length&&!result.limited)return <p className="xs muted">{t('desk.email.none')}</p>;
 return <Notice tone="warn">
  {matches.length>0&&<><strong>{t('desk.email.found')}</strong><p className="small">{t('desk.email.shared')}</p><div className="stack-sm">{matches.slice(0,5).map(match=><div className="row-between wrap" key={match.id}><span>{match.name||match.email}</span><Button type="button" size="sm" variant="secondary" disabled={choosing} onClick={()=>void choose(match)}>{t('desk.email.use')}</Button></div>)}</div></>}
  {matches.length>5&&<p className="xs">{t('desk.email.more')}</p>}
  {result.limited&&<p className="small">{t('desk.email.incomplete')}</p>}
  {error&&<p role="alert">{t('desk.email.changed')}</p>}
  <Button type="button" size="sm" variant="ghost" disabled={choosing} onClick={()=>{onContinue(result);setDismissed(key+emailFingerprint(result));}}>{t('desk.email.continue')}</Button>
 </Notice>;
}
