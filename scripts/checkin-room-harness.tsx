// DEV instrumentation only. Actual page, sessions, route guard and MockProvider.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {RequireRole} from '../src/auth/RequireRole';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {CheckinPage} from '../src/modules/staff/CheckinPage';
import {routes} from '../src/modules/staff';
import type {Role} from '../src/auth/roles';
import type {ChangeEvent, Query} from '../src/data/types';
export function mountCheckinRoom(path:string,initialHold=false){
 const provider=new MockProvider(),second=new MockProvider();
 const q={provider,second,mode:'normal',holdNext:initialHold,held:false,reads:0,release:()=>{},refresh:()=>{},actorId:'',role:'public' as Role,ready:false,index:0,swap:()=>{},navigate:(_path:string)=>{},switchUser:(_id:string)=>{},setViewAs:(_role:Role|null)=>{},unmount:()=>{}};
 const listeners=new Set<(event:ChangeEvent)=>void>();q.refresh=()=>{for(const listener of [...listeners])listener({table:'rooms',type:'reset'});};
 for(const p of [provider,second]){
  const list=p.list.bind(p),subscribe=p.subscribe.bind(p);
  p.list=(async(table:string,query?:Query)=>{const rows=await list(table,query);if(table!=='rooms'||!query?.where?.id||!query.where.tenant_id)return rows;
   q.reads++;if(q.holdNext){q.holdNext=false;q.held=true;await new Promise<void>(resolve=>q.release=()=>{q.held=false;resolve();});return rows.map(row=>({...row,name:'STALE PRIVATE ROOM CANARY'}));}
   if(q.mode==='error')throw Error('fictional_room_read_failure');if(q.mode==='missing')return [];
   if(q.mode==='foreign')return rows.map(row=>({...row,tenant_id:'ten_foreign',name:'PRIVATE FOREIGN CANARY'}));
   if(q.mode==='duplicate')return [...rows,...rows];if(q.mode==='malformed')return rows.map(row=>({...row,name:42}));return rows;}) as typeof p.list;
  p.subscribe=(table,listener)=>{const off=subscribe(table,listener);if(table==='rooms')listeners.add(listener);return()=>{listeners.delete(listener);off();};};
 }
 (window as unknown as {qaCheckinRoom:typeof q}).qaCheckinRoom=q;
 const element=document.createElement('div');element.id='qa-checkin-room';document.getElementById('root')!.style.display='none';document.body.append(element);const root=createRoot(element);q.unmount=()=>root.unmount();
 function Controls(){const s=useSession();q.actorId=s.user.id;q.role=s.role;q.switchUser=s.switchUser;q.setViewAs=s.setViewAs;q.navigate=useNavigate();q.ready=true;return null;}
 function Harness(){const[index,setIndex]=React.useState(0);q.index=index;q.swap=()=>setIndex(n=>1-n);return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={[path]}><Controls/><Routes><Route path="/staff/checkin" element={<RequireRole roles={routes.find(r=>r.path==='/staff/checkin')!.roles!}><CheckinPage/></RequireRole>}/><Route path="*" element={<p>FICTIONAL OTHER S02 DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<I18nProvider tables={getStrings()}><ThemeProvider><Harness/></ThemeProvider></I18nProvider>);
}
