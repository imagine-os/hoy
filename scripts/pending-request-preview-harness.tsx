// DEV only. Actual CheckoutPage and MockProvider commands; only proof reads are controlled.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {getStrings} from '../src/app/registry';
import {CheckoutPage} from '../src/modules/customer/pages/CheckoutPage';
import type {Role} from '../src/auth/roles';
import type {PaymentRow} from '../src/data/schema';
export function mountPendingRequestPreviewHarness(path:string){
 const provider=new MockProvider(),second=new MockProvider();
 const q={provider,second,hold:false,held:false,fault:false,armed:false,proofStarted:false,proofReads:0,wildcardActive:0,wildcardOn:0,wildcardOff:0,wildcardDuplicateOff:0,tamper:'',atomicCalls:0,commandCalls:0,actorId:'',role:'public' as Role,release:()=>{},switchUser:(_id:string)=>{},setViewAs:(_role:Role|null)=>{},swap:()=>{},disconnect:()=>{},navigate:(_path:string)=>{},unmount:()=>{},ready:false};
 (window as unknown as {qaPending:typeof q}).qaPending=q;
 const atomic=provider.atomic.bind(provider),list=provider.list.bind(provider),get=provider.get.bind(provider),subscribe=provider.subscribe.bind(provider);
 provider.subscribe=(table,callback)=>{
  const off=subscribe(table,callback);if(table!=='*')return off;
  q.wildcardOn++;q.wildcardActive++;let stopped=false;
  return()=>{if(stopped)q.wildcardDuplicateOff++;else{stopped=true;q.wildcardOff++;q.wildcardActive--;}off();};
 };
 provider.atomic=async(action,options)=>{
  q.atomicCalls++;const prior=new Set(provider.peek<PaymentRow>('payments').map(row=>row.id));const result=await atomic(action,options);
  const saved=provider.peek<PaymentRow>('payments').filter(row=>!prior.has(row.id)&&row.status==='pending'&&['cash','transfer'].includes(row.method));
  if(saved.length){q.commandCalls++;q.armed=true;}return result;
 };
 function changeRow<T>(table:string,row:T):T{
  if(!q.proofStarted||!row||table!=='payments')return row;
  if(q.tamper==='wrong-owner')return {...row,user_id:'usr_desk'};
  if(q.tamper==='foreign')return {...row,tenant_id:'ten_fictional_other'};
  if(q.tamper==='nonpending')return {...row,status:'approved'};
  if(q.tamper==='negative')return {...row,amount:-1};return row;
 }
 provider.list=async(table,query)=>{
  if(q.armed&&table==='users'&&query?.where&&'id' in query.where){
   q.proofStarted=true;q.proofReads++;
   if(q.hold){q.held=true;await new Promise<void>(resolve=>{q.release=()=>{q.hold=false;q.held=false;resolve();};});}
   if(q.fault)throw Error('FICTIONAL pending request proof read failure');
  }
  const rows=(await list(table,query)).map(row=>changeRow(table,row));
  if(q.proofStarted&&table==='payments'&&q.tamper==='duplicate'&&rows.length)return [...rows,structuredClone(rows[0])];
  if(q.proofStarted&&table==='audit_log'&&q.tamper==='missing-proof')return rows.filter(row=>(row as unknown as {action:string}).action!=='payment.mock.pending');return rows;
 };
 provider.get=async(table,id)=>changeRow(table,await get(table,id));
 const element=document.createElement('div');element.id='qa-pending-root';document.getElementById('root')!.style.display='none';document.body.append(element);const root=createRoot(element);q.unmount=()=>root.unmount();
 function Controls(){const session=useSession();q.actorId=session.user.id;q.role=session.role;q.switchUser=session.switchUser;q.setViewAs=session.setViewAs;q.navigate=useNavigate();q.ready=true;return null;}
 function Harness(){const[index,setIndex]=React.useState(0),[connection,setConnection]=React.useState(0);q.swap=()=>setIndex(n=>1-n);q.disconnect=()=>{Object.defineProperty(provider,'name',{value:'supabase',configurable:true});setConnection(n=>n+1);};void connection;return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={[path]}><Controls/><Routes><Route path="/app/checkout/:id" element={<CheckoutPage/>}/><Route path="*" element={<p>FICTIONAL OTHER DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Harness/></I18nProvider></ThemeProvider>);
}
