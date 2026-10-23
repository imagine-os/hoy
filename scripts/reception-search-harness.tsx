// Test-only actual reception hook harness; not imported by production routes.
import * as React from 'react';import {createRoot} from 'react-dom/client';
import {MockProvider} from '../src/data/MockProvider';import {DataProviderRoot} from '../src/data/DataContext';import {SessionProvider,useSession} from '../src/auth/SessionProvider';import {useReceptionPeople} from '../src/modules/staff/useReceptionPeople';import {tenant} from '../src/tenant/tenant';
export async function mountReceptionSearchHarness(){
 const provider=new MockProvider();await provider.insert('users',{id:'qa_search_race',email:'race@example.invalid',phone:'+573001112233',status:'active'});await provider.insert('profiles',{id:'qa_search_profile',user_id:'qa_search_race',full_name:'QA Original'});await provider.insert('user_roles',{user_id:'qa_search_race',role:'customer'});
 const list=provider.list.bind(provider),peek=provider.peek.bind(provider);window.qaSearch={provider,mode:'loading',pending:[],reads:[]};
 provider.peek=(table,q)=>q?.where?.tenant_id?[]:peek(table,q);
 provider.list=async(table,q)=>{if(q?.where?.tenant_id){window.qaSearch.reads.push({table,q});const rows=peek(table,q);if(window.qaSearch.mode==='loading')return new Promise(resolve=>window.qaSearch.pending.push(()=>resolve(rows)));if(window.qaSearch.mode==='error')throw Error('fictional_scoped_search_failure');return rows;}return list(table,q);};
 function Probe(){const [scope,setScope]=React.useState<string|null>(tenant.id),session=useSession(),{people}=useReceptionPeople(scope);window.qaSearch.scope=setScope;window.qaSearch.switchUser=session.switchUser;return <div id="qa-search-results">{people.filter(p=>p.id==='qa_search_race').map(p=><p key={p.id}>{p.name}</p>)}</div>;}
 function Harness(){const [mounted,setMounted]=React.useState(true);window.qaSearch.mount=setMounted;return mounted?<Probe/>:<p id="qa-search-left">FICTIONAL LEFT SEARCH</p>;}
 document.getElementById('root')!.style.display='none';const mount=document.createElement('div');document.body.append(mount);createRoot(mount).render(<DataProviderRoot provider={provider}><SessionProvider><Harness/></SessionProvider></DataProviderRoot>);
}
