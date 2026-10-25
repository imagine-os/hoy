import {useCallback,useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import {tenant} from '../../tenant/tenant';
import {buildPendingRequestPreview,type PendingRequestSource,type PendingRequestPreviewResult} from './pendingRequestPreview';

export type PendingRequestPreviewState=PendingRequestPreviewResult|{status:'loading'};
const keyOf=(source:PendingRequestSource|null)=>source?source.kind==='cash'?`cash:${source.paymentId}`:`transfer:${source.receiptId}`:'';

/** The original saved request supplies the identity. Retry only repeats read-only proof. */
export function usePendingRequestPreview(source:PendingRequestSource|null,active:boolean,context:string){
  const provider=useData(),{user,role}=useSession(),location=useLocation();
  const path=location.pathname+location.search,sourceKey=keyOf(source);
  const owner={provider,actorId:user.id,role,path,context,sourceKey,active};
  const live=useRef(owner);live.current=owner;
  const mounted=useRef(true),generation=useRef(0);
  const [retryRevision,setRetryRevision]=useState(0);
  const [snapshot,setSnapshot]=useState<{owner:typeof owner;generation:number;result:PendingRequestPreviewState}|null>(null);
  const current=useCallback((captured:typeof owner)=>{
    const now=live.current;
    return mounted.current&&now.active&&now.role==='customer'&&!!now.sourceKey&&now.provider===captured.provider&&now.actorId===captured.actorId&&now.role===captured.role&&now.path===captured.path&&now.context===captured.context&&now.sourceKey===captured.sourceKey;
  },[]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  useEffect(()=>{
    const selected=live.current,request=source?{...source}:null;
    let alive=true;
    if(!request||!current(selected)){setSnapshot(null);return()=>{alive=false;generation.current++;};}
    const read=()=>{
      const run=++generation.current;
      const valid=()=>alive&&generation.current===run&&current(selected);
      if(!valid()||!request){setSnapshot(null);return;}
      setSnapshot({owner:selected,generation:run,result:{status:'loading'}});
      void buildPendingRequestPreview(selected.provider,request,{tenantId:tenant.id,actorId:selected.actorId,role:selected.role,isCurrent:valid})
        .then(result=>{if(valid())setSnapshot({owner:selected,generation:run,result});})
        .catch(()=>{if(valid())setSnapshot({owner:selected,generation:run,result:{status:'error',reason:'read_failed'}});});
    };
    read();
    // Local changes invalidate displayed proof; this is not a live backend subscription.
    let stop=()=>{};
    try{stop=selected.provider.subscribe('*',read);}catch{
      const run=++generation.current;
      if(current(selected))setSnapshot({owner:selected,generation:run,result:{status:'error',reason:'subscription_unavailable'}});
    }
    return()=>{alive=false;generation.current++;try{stop();}catch{/* Ancillary preview cleanup has no command authority. */}};
  },[provider,user.id,role,path,context,sourceKey,active,retryRevision,current]);
  const retry=useCallback(()=>{if(current(live.current))setRetryRevision(n=>n+1);},[current]);
  return {result:snapshot&&snapshot.generation===generation.current&&current(snapshot.owner)?snapshot.result:null,retry};
}
