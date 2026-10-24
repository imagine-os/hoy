// Development-only actual checkout/MockProvider harness; never imported by application routes.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {CheckoutPage} from '../src/modules/customer/pages/CheckoutPage';
import '../src/modules/customer/customer.css';

export function mountNT02PaymentCheckout(item='single') {
  const provider=new MockProvider(), second=new MockProvider();
  const state:any={provider,second,actorId:'',role:'',path:'',atomicCalls:0,atomicSettled:0,fault:'',postRead:'',pending:[],postReads:[],committedPaymentIds:[],afterCommit:null,switchUser:()=>{},swap:()=>{},navigate:()=>{},unmount:()=>{},release:()=>{}};
  (window as any).qaNT02Payment=state;
  const atomic=provider.atomic.bind(provider), get=provider.get.bind(provider), list=provider.list.bind(provider);
  provider.atomic=async(action,options)=>{
    if(!options?.idempotencyKey?.startsWith('checkout:'))return atomic(action,options);
    state.atomicCalls++;const before=new Set(provider.peek('payments').map(row=>row.id)),fault=state.fault;state.fault='';
    const original=Storage.prototype.setItem;
    if(fault==='storage')Storage.prototype.setItem=function(key,value){if(key==='hoyos.db.v1')throw Error('FICTIONAL durable payment storage failure');return original.call(this,key,value);};
    let result;
    try{result=await atomic(action,options);}finally{Storage.prototype.setItem=original;state.atomicSettled++;}
    state.committedPaymentIds=provider.peek('payments').filter(row=>!before.has(row.id)).map(row=>row.id);
    state.afterCommit=JSON.parse(localStorage.getItem('hoyos.db.v1')!).db;
    if(fault==='lost-ack')throw Error('FICTIONAL lost acknowledgement after actual committed payment');
    return result;
  };
  provider.get=async(table,id)=>{
    if(table==='payments'&&state.committedPaymentIds.includes(id)){
      state.postReads.push(id);
      if(state.postRead==='hold')await new Promise<void>(resolve=>state.pending.push(resolve));
      if(state.postRead==='throw')throw Error('FICTIONAL postcommit source read failure');
      if(state.postRead==='missing')return null;
      const saved=await get(table,id);
      if(state.postRead==='changed'&&saved)return {...saved,amount:Number(saved.amount)+1};
      return saved;
    }
    return get(table,id);
  };
  provider.list=async(table,query)=>{
    const rows=await list(table,query);
    if(table==='users'&&state.afterCommit&&state.postRead==='recipient')return rows.map(row=>row.id===state.actorId?{...row,email:''}:row);
    return table==='payments'&&query?.where?.id&&state.postRead==='duplicate'&&rows.length?[...rows,structuredClone(rows[0])]:rows;
  };
  state.release=()=>{state.postRead='';state.pending.splice(0).forEach((release:()=>void)=>release());};
  const mount=document.createElement('div');mount.id='qa-nt02-payment';document.body.append(mount);document.getElementById('root')!.style.display='none';
  function Controls(){const session=useSession(),location=useLocation();state.actorId=session.user.id;state.role=session.role;state.path=location.pathname+location.search;state.switchUser=session.switchUser;state.navigate=useNavigate();return null;}
  function Body(){const[index,setIndex]=React.useState(0),[mounted,setMounted]=React.useState(true);state.swap=()=>setIndex(value=>1-value);state.unmount=()=>setMounted(false);return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={['/app/checkout/qa_nt02_payment_session'+(item==='default'?'':'?pass='+item)]}><Controls/>{mounted?<Routes><Route path="/app/checkout/:id" element={<CheckoutPage/>}/><Route path="*" element={<p data-nt02-payment-away>FICTIONAL PAYMENT DESTINATION</p>}/></Routes>:<p data-nt02-payment-unmounted>FICTIONAL PAYMENT UNMOUNTED</p>}</MemoryRouter></SessionProvider></DataProviderRoot>;}
  createRoot(mount).render(<ThemeProvider><I18nProvider tables={getStrings()}><Body/></I18nProvider></ThemeProvider>);
}
