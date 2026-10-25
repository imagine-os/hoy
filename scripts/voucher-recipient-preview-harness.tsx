// DEV only: actual S-09, real MockProvider approval, controlled read-only proof boundary.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {getStrings} from '../src/app/registry';
import {TransferQueuePage} from '../src/modules/transfers/TransferQueuePage';
import type {Role} from '../src/auth/roles';

export function mountVoucherRecipientPreviewHarness(paymentId:string){
 const provider=new MockProvider(),second=new MockProvider();
 const q={provider,second,hold:false,held:false,fault:false,armed:false,approvalCalls:0,actorId:'',role:'public' as Role,release:()=>{},switchUser:(_id:string)=>{},setViewAs:(_role:Role|null)=>{},swap:()=>{},disconnect:()=>{},navigate:(_path:string)=>{},unmount:()=>{},ready:false};
 (window as unknown as {qaRecipient:typeof q}).qaRecipient=q;
 const list=provider.list.bind(provider),purchase=provider.purchasedGift.bind(provider);
 provider.list=async(table,query)=>{
  // Only the preview proof asks for the exact current reviewer in users.
  // Queue/session reads and every financial command keep their original semantics.
  if(q.armed&&table==='users'&&query?.where&&'id' in query.where){
   if(q.hold){q.held=true;await new Promise<void>(resolve=>{q.release=()=>{q.hold=false;q.held=false;resolve();};});}
   if(q.fault)throw Error('FICTIONAL recipient proof read failure');
  }
  return list(table,query);
 };
 provider.purchasedGift=async(command,isCurrent)=>{
  const result=await purchase(command,isCurrent);
  if(command.type==='approve'){q.approvalCalls++;q.armed=true;}
  return result;
 };
 const element=document.createElement('div');element.id='qa-recipient-root';document.getElementById('root')!.style.display='none';document.body.append(element);const root=createRoot(element);q.unmount=()=>root.unmount();
 function Controls(){const session=useSession();q.actorId=session.user.id;q.role=session.role;q.switchUser=session.switchUser;q.setViewAs=session.setViewAs;q.navigate=useNavigate();q.ready=true;return null;}
 function Harness(){const[index,setIndex]=React.useState(0),[connection,setConnection]=React.useState(0);q.swap=()=>setIndex(n=>1-n);q.disconnect=()=>{Object.defineProperty(provider,'name',{value:'supabase',configurable:true});setConnection(n=>n+1);};void connection;return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={['/staff/transfers?payment='+paymentId]}><Controls/><Routes><Route path="/staff/transfers" element={<TransferQueuePage/>}/><Route path="*" element={<p>FICTIONAL OTHER DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Harness/></I18nProvider></ThemeProvider>);
}
