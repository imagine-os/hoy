import type {DataProvider} from '../../data/types';
import type {BookingRow,ProfileRow} from '../../data/schema';
import {tenant} from '../../tenant/tenant';
import {readTeacherClassAccess,type TeacherActor} from './classAccess';
/** Production roster is names + attendance only. Never reuse the review editor's contacts, notes or actions. */
export async function readLiveTeacherRoster(data:DataProvider,actor:TeacherActor,id:string,current=()=>true){
 const check=()=>{if(!current())throw Error('teacher_context_changed');};check();
 const {session}=await readTeacherClassAccess(data,actor,id);check();
 const raw=await data.list<BookingRow>('bookings',{where:{tenant_id:tenant.id,session_id:id}});check();
 const active=raw.filter(b=>b.tenant_id===tenant.id&&b.session_id===id&&b.status!=='cancelled'&&b.status!=='late_cancel');
 const ids=[...new Set(active.map(b=>b.user_id))];
 const profiles=ids.length?await data.list<ProfileRow>('profiles',{where:{tenant_id:tenant.id,user_id:ids}}):[];check();
 const names=new Map(profiles.filter(p=>p.tenant_id===tenant.id&&ids.includes(p.user_id)).map(p=>[p.user_id,p.full_name]));
 await readTeacherClassAccess(data,actor,id);check();
 return {session:{id:session.id,title:session.title,starts_at:session.starts_at,ends_at:session.ends_at,status:session.status,capacity:session.capacity},people:active.map(b=>({id:b.id,name:names.get(b.user_id)||'',arrived:b.status==='checked_in'}))};
}
