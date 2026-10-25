// DEV only. Actual CMS/Register and real MockProvider atomic commands; controlled boundaries only.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {RequireRole} from '../src/auth/RequireRole';
import type {Role} from '../src/auth/roles';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {ContentPage} from '../src/modules/admin/ContentPage';
import {RegisterPage} from '../src/modules/staff/RegisterPage';
import {routes as adminRoutes} from '../src/modules/admin';
import {routes as staffRoutes} from '../src/modules/staff';
export function mountRoomPublication(path:string){
 const provider=new MockProvider(),second=new MockProvider(),q={provider,second,pauseNext:false,held:false,release:()=>{},failAfterWrites:0,lostAck:false,done:'idle',stageRoomFailure:false,stageRoomFailureSeen:false,actorId:'',role:'public' as Role,index:0,ready:false,swap:()=>{},navigate:(_path:string)=>{},switchUser:(_id:string)=>{},setViewAs:(_role:Role|null)=>{},unmount:()=>{}};
 (window as unknown as {qaRoomPublication:typeof q}).qaRoomPublication=q;
 const atomic=provider.atomic.bind(provider);provider.atomic=async(action,options)=>{q.done='pending';try{const result=await atomic(async tx=>{if(q.pauseNext){q.pauseNext=false;q.held=true;await new Promise<void>(resolve=>{q.release=()=>{q.held=false;resolve();};});}const controlled=new Proxy({} as typeof tx,{get(_target,key){if(key==='insert')return async(table:string,row:never)=>{if(table==='space_bookings'&&q.stageRoomFailure){q.stageRoomFailureSeen=true;await tx.update('rooms','qa_room_published',{active:false});}return tx.insert(table,row);};const value=Reflect.get(tx,key);return typeof value==='function'?value.bind(tx):value;}});return action(controlled);},{...options,...(q.failAfterWrites?{failAfterWrites:q.failAfterWrites}:{})});q.done='committed';if(q.lostAck){q.lostAck=false;throw Error('fictional_room_lost_ack');}return result;}catch(error){q.done=error instanceof Error?error.message:String(error);throw error;}};
 const element=document.createElement('div');element.id='qa-room-publication';document.getElementById('root')!.style.display='none';document.body.append(element);const root=createRoot(element);q.unmount=()=>root.unmount();
 function Controls(){const s=useSession();q.actorId=s.user.id;q.role=s.role;q.switchUser=s.switchUser;q.setViewAs=s.setViewAs;q.navigate=useNavigate();q.ready=true;return null;}
 function Harness(){const[index,setIndex]=React.useState(0);q.index=index;q.swap=()=>setIndex(value=>1-value);return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={[path]}><Controls/><Routes><Route path="/admin/content" element={<RequireRole roles={adminRoutes.find(route=>route.path==='/admin/content')!.roles!}><ContentPage/></RequireRole>}/><Route path="/staff/register" element={<RequireRole roles={staffRoutes.find(route=>route.path==='/staff/register')!.roles!}><RegisterPage/></RequireRole>}/><Route path="*" element={<p>FICTIONAL OTHER ROOM DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<I18nProvider tables={getStrings()}><ThemeProvider><Harness/></ThemeProvider></I18nProvider>);
}
