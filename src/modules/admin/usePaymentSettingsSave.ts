import{useEffect,useRef,useState}from'react';
import{useData}from'../../data/DataContext';
import{useSession}from'../../auth/SessionProvider';
import{heldRoles}from'../../auth/sessionContext';
import{saveFailureCode,savePaymentSettings,type PaymentSettings,type PaymentSettingsCommand}from'./paymentInstructions';
export function usePaymentSettingsSave(){
 const data=useData(),session=useSession(),{user,role,can}=session,roles=heldRoles(session),context=JSON.stringify([user.id,role,roles]),live=useRef({data,context,mounted:true});live.current={data,context,mounted:true};
 useEffect(()=>{live.current.mounted=true;return()=>{live.current.mounted=false;};},[]);
 const[pending,setPending]=useState<{data:typeof data;context:string;status:'busy'|'error'|'saved';code?:string}|null>(null),request=useRef<{data:typeof data;context:string;signature:string;command:PaymentSettingsCommand}|null>(null);
 const state=pending?.data===data&&pending.context===context?pending.status:null,failure=state==='error'?pending?.code??'':'';
 const run=async(before:PaymentSettings,after:PaymentSettings)=>{
  if(!can('settings.write')||state==='busy')return undefined;
  const provider=data,captured=context,isCurrent=()=>live.current.mounted&&live.current.data===provider&&live.current.context===captured,signature=JSON.stringify([before,after]);
  const prior=request.current,command=prior?.data===data&&prior.context===context&&prior.signature===signature?prior.command:{actorId:user.id,role,roles:[...roles],requestId:crypto.randomUUID(),before:structuredClone(before),after:structuredClone(after)};
  request.current={data,context,signature,command};setPending({data,context,status:'busy'});
  try{const saved=await savePaymentSettings(data,command,{isCurrent});if(!isCurrent())return undefined;request.current=null;setPending({data,context,status:'saved'});return saved;}
  // The refusal keeps its code (ADM-04): the card shows its copy, not only "not confirmed".
  catch(e){if(isCurrent())setPending({data,context,status:'error',code:saveFailureCode(e)});return undefined;}
 };
 return{run,state,failure,data,context,canWrite:can('settings.write'),changed:()=>{request.current=null;setPending(null);}};
}
