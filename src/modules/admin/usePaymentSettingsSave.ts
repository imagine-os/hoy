import{useEffect,useRef,useState}from'react';
import{useData}from'../../data/DataContext';
import{useSession}from'../../auth/SessionProvider';
import{savePaymentSettings,type PaymentSettings,type PaymentSettingsCommand}from'./paymentInstructions';
export function usePaymentSettingsSave(){
 const data=useData(),{user,role,can}=useSession(),context=JSON.stringify([user.id,role]),live=useRef({data,context,mounted:true});live.current={data,context,mounted:true};
 useEffect(()=>{live.current.mounted=true;return()=>{live.current.mounted=false;};},[]);
 const[pending,setPending]=useState<{data:typeof data;context:string;status:'busy'|'error'|'saved'}|null>(null),request=useRef<{data:typeof data;context:string;signature:string;command:PaymentSettingsCommand}|null>(null);
 const state=pending?.data===data&&pending.context===context?pending.status:null;
 const run=async(before:PaymentSettings,after:PaymentSettings)=>{
  if(!can('settings.write')||state==='busy')return undefined;
  const provider=data,captured=context,isCurrent=()=>live.current.mounted&&live.current.data===provider&&live.current.context===captured,signature=JSON.stringify([before,after]);
  const prior=request.current,command=prior?.data===data&&prior.context===context&&prior.signature===signature?prior.command:{actorId:user.id,role,requestId:crypto.randomUUID(),before:structuredClone(before),after:structuredClone(after)};
  request.current={data,context,signature,command};setPending({data,context,status:'busy'});
  try{const saved=await savePaymentSettings(data,command,{isCurrent});if(!isCurrent())return undefined;request.current=null;setPending({data,context,status:'saved'});return saved;}
  catch{if(isCurrent())setPending({data,context,status:'error'});return undefined;}
 };
 return{run,state,data,context,canWrite:can('settings.write'),changed:()=>{request.current=null;setPending(null);}};
}
