import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {HashRouter,Routes,Route} from 'react-router-dom';
import {DataProviderRoot,useData,useTable} from '@app/data/DataContext';
import {SessionProvider,useSession} from '@app/auth/SessionProvider';
import {I18nProvider} from '@app/i18n/I18nProvider';
import {strings} from '@app/modules/admin/strings';
import {CrmPage,useMemberStats} from '@app/modules/admin/CrmPage';
import {usePeople} from '@app/modules/staff/people';
import '@app/design/tokens.css';
import '@app/styles/global.css';
import {ControlledProvider,row,longName} from './controlled-provider';
const params=new URLSearchParams(location.search),view=params.get('view')??'hook',withPeek=params.get('peek')==='1';
localStorage.setItem('hoyos.lang',params.get('lang')??'en');localStorage.setItem('hoyos.session',JSON.stringify({userId:view==='session'?'fictional_A':'usr_admin',devMode:false,viewAs:null}));
const providers={A:new ControlledProvider('A',withPeek,params.get('long')==='1'),B:new ControlledProvider('B',withPeek)};
for(const p of Object.values(providers))for(const table of (params.get('hold')??'').split(',').filter(Boolean))p.modes[table]='hold';
const frames:any[]=[],rejections:string[]=[];window.addEventListener('unhandledrejection',event=>{rejections.push(String(event.reason?.message??event.reason));event.preventDefault();});
let configure:any,activeConfig:any;
const api:any={providers,frames,rejections,longName,row,current:null,configure(delta:any){flushSync(()=>configure((old:any)=>({...old,...delta})));},snapshot(){return {config:activeConfig,frames:[...frames],rejections:[...rejections],providers:Object.fromEntries(Object.entries(providers).map(([tag,p])=>[tag,p.snapshot()]))};}};
(window as any).qa=api;
function HookProbe({table,query}:any){const provider=useData();const state:any=useTable(table,query??undefined);const frame={provider:provider.name,table,query,rows:state.rows,loading:state.loading,error:!!state.error,hasRetry:typeof state.retry==='function'};frames.push(structuredClone(frame));api.current=frame;return <><pre data-hook-result>{JSON.stringify(frame)}</pre><button id="hook-retry" disabled={typeof state.retry!=='function'} onClick={()=>state.retry?.()}>Retry actual hook</button></>;}
function SessionProbe(){const s=useSession();const frame={id:s.user.id,name:s.user.name,role:s.role};frames.push(structuredClone(frame));api.current=frame;api.switchUser=(id:string)=>flushSync(()=>s.switchUser(id));return <pre data-session-result>{JSON.stringify(frame)}</pre>;}
function LegacyProbe(){const {people}=usePeople();const stats=useMemberStats(people);api.current={isMap:stats instanceof Map,entries:[...stats].map(([id,s])=>({id,remaining:s.pkg.left}))};return <pre data-legacy-result>{JSON.stringify(api.current)}</pre>;}
function Host(){const[config,set]=useState({provider:'A',table:'alpha',query:null,mounted:true,epoch:0});configure=set;activeConfig=config;return <I18nProvider tables={[strings]}>{config.mounted&&<DataProviderRoot provider={providers[config.provider] as any}>{view==='hook'?<HookProbe table={config.table} query={config.query}/>:<SessionProvider>{view==='session'?<SessionProbe/>:view==='legacy'?<LegacyProbe/>:<HashRouter><Routes><Route path="/admin/crm" element={<main style={{padding:'var(--sp-md)'}} key={config.epoch}><CrmPage/></main>}/></Routes></HashRouter>}</SessionProvider>}</DataProviderRoot>}</I18nProvider>;}
createRoot(document.getElementById('root')!).render(<Host/>);
