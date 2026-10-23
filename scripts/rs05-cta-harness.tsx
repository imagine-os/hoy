// QA only: actual pages in a fictional provider; never imported by application routes.
import * as React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useLocation,useNavigate} from 'react-router-dom';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {getStrings} from '../src/app/registry';
import {DataProviderRoot} from '../src/data/DataContext';
import {MockProvider} from '../src/data/MockProvider';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {SchedulePage} from '../src/modules/website/pages/SchedulePage';
import {ClassDetailPage} from '../src/modules/customer/pages/ClassDetailPage';
export function mountRS05CTA(surface:string){
 const providers=[new MockProvider(),new MockProvider()],state={provider:providers[0],silent:false,path:'',actor:'',role:'',armed:false,paused:false,pauseId:'qa_admission_ui_session',release:(_fail=false)=>{},swap:()=>{},switchUser:(_id:string)=>{},setViewAs:(_role:never)=>{},navigate:(_path:string)=>{},unmount:()=>{}};
 (window as unknown as {qaRS05:typeof state}).qaRS05=state;
 for(const provider of providers){const subscribe=provider.subscribe.bind(provider);provider.subscribe=(table,cb)=>subscribe(table,event=>{if(!state.silent)cb(event);});const get=provider.get.bind(provider);provider.get=async(table,id)=>{const row=await get(table,id);if(state.armed&&table==='class_sessions'&&id===state.pauseId){state.armed=false;state.paused=true;await new Promise<void>((resolve,reject)=>{state.release=(fail=false)=>{state.paused=false;fail?reject(Error('FICTIONAL interrupted read')):resolve();};});}return row;};}
 function Location(){const where=useLocation(),session=useSession(),navigate=useNavigate();state.path=where.pathname+where.search;state.actor=session.user.id;state.role=session.role;state.switchUser=session.switchUser;state.setViewAs=session.setViewAs;state.navigate=path=>flushSync(()=>navigate(path));return null;}
 document.getElementById('root')!.style.display='none';const node=document.createElement('div');node.id='qa-rs05';document.body.append(node);
 const root=createRoot(node);state.unmount=()=>root.unmount();
 function Harness(){const[index,setIndex]=React.useState(0);state.provider=providers[index];state.swap=()=>flushSync(()=>setIndex(n=>1-n));return <DataProviderRoot provider={providers[index]}><SessionProvider><MemoryRouter initialEntries={[surface==='site'?'/site/schedule':'/app/class/qa_admission_ui_session']}><Location/><Routes><Route path="/site/schedule" element={<SchedulePage/>}/><Route path="/app/class/:id" element={<ClassDetailPage/>}/><Route path="*" element={<p>FICTIONAL NAVIGATION DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Harness/></I18nProvider></ThemeProvider>);
}
