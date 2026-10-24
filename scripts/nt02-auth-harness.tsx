// Isolated fictional fixture: actual auth pages/actions and the shared read-only preview host.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useLocation,useNavigate} from 'react-router-dom';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot,useData} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import type {Role} from '../src/auth/roles';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {getStrings} from '../src/app/registry';
import {SignUpPage} from '../src/modules/customer/auth/SignUpPage';
import {SignInPage} from '../src/modules/customer/auth/SignInPage';
import {DemoSignInPanel} from '../src/components/organism/DemoSignInPanel/DemoSignInPanel';
import {useMockSignIn} from '../src/modules/customer/auth/useMockSignIn';
import {LaunchNotificationHost} from '../src/modules/launch-notifications';
import {tenant} from '../src/tenant/tenant';

export function mountNt02Auth(path='/auth/sign-up?next=%2Fapp%2Fplans') {
 const first=new MockProvider(),second=new MockProvider();
 const q={first,second,ready:false,path:'',actorId:'',hold:false,paused:false,failure:false,afterCommit:false,enabled:true,release:()=>{},actor:(_id:string)=>{},role:(_role:Role|null)=>{},nav:(_path:string)=>{},swap:()=>{},disable:()=>{},unmount:()=>{}};
 const atomic=first.atomic.bind(first);
 first.atomic=async(fn,options)=>{
  const pause=async()=>{q.paused=true;await new Promise<void>(resolve=>q.release=()=>{q.hold=false;q.paused=false;resolve()});};
  if(q.hold&&!q.afterCommit)await pause();
  if(q.failure)throw Error('FICTIONAL NT02 registration refusal');
  const result=await atomic(fn,options);
  if(q.hold&&q.afterCommit)await pause();
  return result;
 };
 (window as unknown as {qaNt02Auth:typeof q}).qaNt02Auth=q;
 const host=document.createElement('div');host.id='qa-nt02-auth';document.getElementById('root')!.style.display='none';document.body.append(host);
 const root=createRoot(host);q.unmount=()=>root.unmount();
 function Panel(){const[enabled,setEnabled]=React.useState(true);q.disable=()=>{q.enabled=false;setEnabled(false);};const props=useMockSignIn(()=>{},enabled);return <DemoSignInPanel {...props}/>;}
 function Controls(){const provider=useData(),session=useSession(),location=useLocation();q.actor=session.switchUser;q.role=session.setViewAs;q.nav=useNavigate();q.path=location.pathname+location.search;q.actorId=session.user.id;q.ready=true;return <LaunchNotificationHost provider={provider} tenantId={tenant.id} actorId={session.user.id} role={session.role} path={q.path}/>;}
 function Body(){const[index,set]=React.useState(0);q.swap=()=>set(i=>1-i);return <DataProviderRoot provider={index?second:first}><SessionProvider><MemoryRouter initialEntries={[path]}><Controls/><Routes><Route path='/auth/sign-up' element={<SignUpPage/>}/><Route path='/auth/sign-in' element={<SignInPage/>}/><Route path='/fictional-panel' element={<Panel/>}/><Route path='*' element={<p>FICTIONAL AUTH DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Body/></I18nProvider></ThemeProvider>);
}
