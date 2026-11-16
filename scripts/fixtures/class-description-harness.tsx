import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {MemoryRouter} from 'react-router-dom';
import {LiveSchedulePage} from '../../src/modules/classSchedule/live/LiveSchedulePage';
import {DataProviderRoot} from '../../src/data/DataContext';
import {SessionContext} from '../../src/auth/sessionContext';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {strings} from '../../src/modules/classSchedule/strings';
import {ThemeProvider} from '../../src/design/ThemeProvider';
import {SessionEditorial} from '../../src/components/molecule/SessionEditorial/SessionEditorial';
import {adapters,fromRecord} from '../../src/data/companyos/mapping';
import {modalities} from '../../src/data/seed/catalog';
import '../../src/styles/global.css';
import '../../src/design/tokens.css';
const type={...modalities.find(x=>x.slug==='pulso')!,description:{es:'Fictional type fallback',en:'Fictional type fallback'}};
const initial={id:'fictional-template',data:{title:'Fictional published class',kind:'class',modality:'pulso',weekday:1,start_time:'07:10',duration_minutes:50,resource:'fictional-room',coach:'fictional-teacher',capacity:12,valid_from:'2026-11-16',valid_until:'2027-02-16',active:true,description:'Original shared description'}};
const w=(window as any).world={calls:[],failWrite:false,bookings:['fictional-booking-a','fictional-booking-b'],set:(_:unknown)=>{}};
function provider(index:number){
 const key='fictional-description-rows-'+index,rows=JSON.parse(sessionStorage.getItem(key)??JSON.stringify([{...initial,data:{...initial.data,description:index?'Other provider description':initial.data.description}}])),listeners=new Map<string,Set<()=>void>>();
 const snapshot=(table:string)=>table==='class_templates'?rows.map((r:any)=>fromRecord(adapters.class_templates as any,r)):table==='modalities'?[type]:[];
 return {name:'companyos',peek:snapshot,list:async(table:string)=>snapshot(table),get:async()=>null,self:async()=>({}),subscribe:(table:string,fn:()=>void)=>{if(!listeners.has(table))listeners.set(table,new Set());listeners.get(table)!.add(fn);return()=>listeners.get(table)?.delete(fn);},request:async(method:string,path:string,body:any,options:any)=>{
  if(method==='POST'&&path==='/query')return {data:body.entity==='schedule'?structuredClone(rows):body.entity==='resource'?[{id:'fictional-room',data:{name:'Fictional room',capacity:12}}]:body.entity==='coach'?[{id:'fictional-teacher',data:{person:{name:'Fictional teacher'},active:true}}]:[]};
  if(method!=='POST'||path!=='/batch')throw Error('fixture forbids other transport');
  w.calls.push({body:structuredClone(body),key:options?.idempotencyKey});if(w.failWrite)throw Object.assign(Error('forbidden'),{code:'forbidden'});
  if(body.ops.length!==1||body.ops[0].entity!=='schedule'||!['create','update'].includes(body.ops[0].op))throw Error('fixture forbids occurrence/booking changes');
  const op=body.ops[0],id=op.op==='create'?'fictional-created':op.id,existing=rows.find((r:any)=>r.id===id);if(existing)existing.data={...existing.data,...op.data};else rows.push({id,data:structuredClone(op.data)});
  sessionStorage.setItem(key,JSON.stringify(rows));w.rows=structuredClone(rows);for(const fn of listeners.get('class_templates')??[])fn();return {ids:[id]};
 }};
}
const providers=[provider(0),provider(1)];
function App(){const [ctx,setCtx]=useState({actor:'fictional-admin',role:'admin',viewAs:null,status:'ready',signedIn:true,provider:0});w.set=(change:any)=>flushSync(()=>setCtx(c=>({...c,...change})));
const session={user:{id:ctx.actor,role:ctx.role},role:ctx.role,viewAs:ctx.viewAs,viewAsPerson:null,status:ctx.status,signedIn:ctx.signedIn,can:(key:string)=>key==='classes.write'&&['admin','super_admin','coordinator'].includes(ctx.role)};
return <DataProviderRoot provider={providers[ctx.provider] as any}><SessionContext.Provider value={session as any}><I18nProvider tables={[strings]}><ThemeProvider><MemoryRouter><LiveSchedulePage/><section data-testid="published-a"><SessionEditorial session={{id:'fictional-existing-a',template_id:'fictional-template',modality_id:type.id,description_override:null,theme_override:null} as any}/></section><section data-testid="published-b"><SessionEditorial session={{id:'fictional-existing-b',template_id:'fictional-template',modality_id:type.id,description_override:null,theme_override:null} as any}/></section></MemoryRouter></ThemeProvider></I18nProvider></SessionContext.Provider></DataProviderRoot>;
}createRoot(document.getElementById('root')!).render(<App/>);
