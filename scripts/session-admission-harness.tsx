// Development-only actual-hook/component harness. Never imported by application routes.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {getStrings} from '../src/app/registry';
import {useBookingActions} from '../src/modules/customer/hooks';
import {CheckoutPage} from '../src/modules/customer/pages/CheckoutPage';
import {WaitlistPage} from '../src/modules/customer/pages/WaitlistPage';
import {RegisterPage} from '../src/modules/staff/RegisterPage';
const sid='qa_admission_ui_session';
export function mountAdmissionHarness(surface='hooks'){
 const provider=new MockProvider(),second=new MockProvider(),state={provider,armed:false,mode:'get',failRead:surface==='waitlist',paused:false,release:()=>{},result:'idle',queueBlocked:false,releaseQueue:()=>{},blockQueue:()=>{},role:'',actor:'',switchUser:(_id:string)=>{},setViewAs:(_role:unknown)=>{},swap:()=>{},unmount:()=>{},run:(_operation:string)=>{}};
 (window as unknown as {qaAdmission:typeof state}).qaAdmission=state;
 const atomic=provider.atomic.bind(provider);
 state.blockQueue=()=>{state.queueBlocked=true;void atomic(async()=>{await new Promise<void>(resolve=>{state.releaseQueue=()=>{state.queueBlocked=false;resolve();};});});};
 const pause=async()=>{if(!state.armed)return;state.armed=false;state.paused=true;await new Promise<void>(resolve=>{state.release=()=>{state.paused=false;resolve();};});};
 provider.atomic=(action,options)=>atomic(async tx=>{
  const controlled=new Proxy({}, {get(_target,key){
    if(key==='get')return async(table:string,id:string)=>{if(state.failRead&&table==='class_sessions'&&id===sid){state.failRead=false;throw Error('fictional_admission_read');}const row=await tx.get(table,id);if(state.mode==='get'&&table==='class_sessions'&&id===sid)await pause();return row;};
    if(key==='insert')return async(table:string,row:never)=>{const value=await tx.insert(table,row);if(state.mode==='payment'&&table==='payments')await pause();return value;};
    const value=Reflect.get(tx,key);return typeof value==='function'?value.bind(tx):value;
  }}) as typeof tx;
  try{const result=await action(controlled);return result;}catch(error){state.result=error instanceof Error?error.message:String(error);throw error;}
 },options);
 document.getElementById('root')!.style.display='none';// Container is separate so unmount tests do not affect app-owned roots.
 const element=document.createElement('div');element.id='qa-admission-root';document.body.append(element);
 const mounted=createRoot(element);state.unmount=()=>mounted.unmount();
 function Controls(){const session=useSession(),actions=useBookingActions();state.role=session.role;state.actor=session.user.id;state.switchUser=session.switchUser;state.setViewAs=session.setViewAs;
  state.run=operation=>{const target=provider.peek('class_sessions',{where:{id:sid}})[0] as never;state.result='pending';const work=operation==='reschedule'?actions.reschedule(provider.peek('bookings',{where:{id:'qa_harness_original_booking'}})[0] as never,provider.peek('class_sessions',{where:{id:'qa_harness_original_session'}})[0] as never,target):operation==='join'?actions.joinWaitlist(target):operation==='claim'?actions.claimWaitlist(provider.peek('waitlist',{where:{id:'qa_harness_offer'}})[0] as never,target,'package'):actions.book(target,'single');work.then(()=>{state.result='committed';},error=>{state.result=error instanceof Error?error.message:String(error);});};return null;}
 function Harness(){const[index,setIndex]=React.useState(0);state.swap=()=>setIndex(n=>1-n);return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={[surface==='register'?'/staff/register?session='+sid:surface==='waitlist'?'/app/waitlist/'+sid:'/app/checkout/'+sid]}><Controls/><Routes><Route path="/app/checkout/:id" element={surface==='hooks'?<p>FICTIONAL HOOK HARNESS</p>:<CheckoutPage/>}/><Route path="/staff/register" element={<RegisterPage/>}/><Route path="/app/waitlist/:id" element={<WaitlistPage/>}/><Route path="*" element={<p>FICTIONAL BOOKING DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 mounted.render(<I18nProvider tables={getStrings()}><Harness/></I18nProvider>);
}
