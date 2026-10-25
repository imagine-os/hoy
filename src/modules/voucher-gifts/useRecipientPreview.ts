import {useCallback,useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import {tenant} from '../../tenant/tenant';
import type {DataProvider} from '../../data/types';
import type {GiftPurchaseResult} from './purchaseFacts';
import {buildVoucherRecipientPreview,voucherRecipientSource,type VoucherRecipientSource,type VoucherRecipientPreviewResult} from './recipientPreview';

export type RecipientPreviewState=VoucherRecipientPreviewResult|{status:'loading'};
interface Binding {provider:DataProvider;actorId:string;role:string;sourcePath:string;targetPath:string;source:VoucherRecipientSource|null;entered:boolean;valid:boolean}

/** One approval-result preview, never an event inferred from a historical approved row. */
export function useRecipientPreview(){
  const provider=useData(),{user,role}=useSession(),location=useLocation();
  const path=location.pathname+location.search;
  const viewer=useRef({provider,actorId:user.id,role,path,pathname:location.pathname});
  viewer.current={provider,actorId:user.id,role,path,pathname:location.pathname};
  const mounted=useRef(true),binding=useRef<Binding|null>(null);
  const [snapshot,setSnapshot]=useState<{binding:Binding;result:RecipientPreviewState}|null>(null);
  const [revision,setRevision]=useState(0);
  const active=binding.current;
  if(active){
    const same=active.provider===provider&&active.actorId===user.id&&active.role===role&&['admin','super_admin'].includes(role);
    if(same&&path===active.targetPath)active.entered=true;
    else if(!same||active.entered||path!==active.sourcePath){active.valid=false;binding.current=null;}
  }
  const isCurrent=useCallback((selected:Binding)=>{
    const current=viewer.current;
    return mounted.current&&selected.valid&&binding.current===selected&&selected.provider===current.provider&&selected.actorId===current.actorId&&selected.role===current.role&&current.path===selected.targetPath;
  },[]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(binding.current)binding.current.valid=false;binding.current=null;};},[]);
  useEffect(()=>{
    const selected=binding.current;
    if(!selected){setSnapshot(null);return;}
    // The original approval closes its detail drawer. Reads start only at that existing destination.
    if(!selected.entered||path!==selected.targetPath)return;
    let current=true;
    const check=()=>current&&isCurrent(selected);
    setSnapshot({binding:selected,result:{status:'loading'}});
    void buildVoucherRecipientPreview(selected.provider,selected.source,{tenantId:tenant.id,actorId:selected.actorId,role:selected.role,isCurrent:check})
      .then(result=>{if(check())setSnapshot({binding:selected,result});})
      .catch(()=>{if(check())setSnapshot({binding:selected,result:{status:'error',reason:'preview_read_failed'}});});
    return()=>{current=false;};
  },[provider,user.id,role,path,revision,isCurrent]);
  const begin=useCallback((result:GiftPurchaseResult,requestId:string)=>{
    // Ancillary preview setup must never change an acknowledged financial action into a failure.
    try{
      const current=viewer.current;
      if(!mounted.current||!['admin','super_admin'].includes(current.role))return;
      if(binding.current)binding.current.valid=false;
      const selected:Binding={provider:current.provider,actorId:current.actorId,role:current.role,sourcePath:current.path,targetPath:current.pathname,source:voucherRecipientSource(result,requestId,current.actorId),entered:current.path===current.pathname,valid:true};
      binding.current=selected;setSnapshot({binding:selected,result:{status:'loading'}});setRevision(n=>n+1);
    }catch{/* A preview has no authority over issuance, payment, navigation or history. */}
  },[]);
  const retry=useCallback(()=>{if(binding.current&&isCurrent(binding.current))setRevision(n=>n+1);},[isCurrent]);
  return {begin,retry,result:snapshot&&snapshot.binding===binding.current&&isCurrent(snapshot.binding)?snapshot.result:null};
}
