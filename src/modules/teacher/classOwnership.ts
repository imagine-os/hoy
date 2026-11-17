import type {DataProvider} from '../../data/types';
import type {BookingRow,ModalityRow,RoomRow,ReviewRow,UserRow,ProfileRow} from '../../data/schema';
import type {AuditRow} from '../staff/audit';
import {tenant} from '../../tenant/tenant';
export {canChooseTeacherPreview,teacherIdentity,readTeacherClassAccess,type TeacherActor} from './classAccess';
import {readTeacherClassAccess,type TeacherActor} from './classAccess';
export async function readTeacherClassDetails(data:DataProvider,actor:TeacherActor,id:string){
 const access=await readTeacherClassAccess(data,actor,id),scope={tenant_id:tenant.id};
 const [rawBookings,rawNotes,rawReviews,rawModalities,rawRooms]=await Promise.all([
  data.list<BookingRow>('bookings',{where:{...scope,session_id:id}}),
  data.list<AuditRow>('audit_log',{where:{...scope,entity:'class_sessions',entity_id:id,action:'session.note'},orderBy:{column:'created_at',dir:'desc'}}),
  data.list<ReviewRow>('reviews',{where:{...scope,class_session_id:id}}),
  data.list<ModalityRow>('modalities',{where:{...scope,id:access.session.modality_id}}),
  data.list<RoomRow>('rooms',{where:{...scope,id:access.session.room_id}}),
 ]);
 const bookings=rawBookings.filter(b=>b.tenant_id===tenant.id&&b.session_id===id);
 const notes=rawNotes.filter(n=>n.tenant_id===tenant.id&&n.entity==='class_sessions'&&n.entity_id===id&&n.action==='session.note');
 const reviews=rawReviews.filter(r=>r.tenant_id===tenant.id&&r.class_session_id===id);
 const modalities=rawModalities.filter(m=>m.tenant_id===tenant.id&&m.id===access.session.modality_id);
 const rooms=rawRooms.filter(r=>r.tenant_id===tenant.id&&r.id===access.session.room_id);
 const ids=[...new Set(bookings.filter(b=>b.status!=='cancelled'&&b.status!=='late_cancel').map(b=>b.user_id))];
 const [rawUsers,rawProfiles]=ids.length?await Promise.all([data.list<UserRow>('users',{where:{...scope,id:ids}}),data.list<ProfileRow>('profiles',{where:{...scope,user_id:ids}})]):[[] as UserRow[],[] as ProfileRow[]];
 const users=rawUsers.filter(u=>u.tenant_id===tenant.id&&ids.includes(u.id));
 const profiles=rawProfiles.filter(p=>p.tenant_id===tenant.id&&ids.includes(p.user_id));
 await readTeacherClassAccess(data,actor,id); // Reassignment during the read cannot release stale details.
 return {...access,bookings,notes,reviews,modality:modalities[0],room:rooms[0],users,profiles};
}
export async function teacherClassCommand(data:DataProvider,input:{actor:TeacherActor;id:string;kind:'note'|'complete';note?:string;now?:number}){
 if(data.name!=='mock'||!data.atomic)throw Error('teacher_command_disconnected');
 return data.atomic(async tx=>{
  const {session,me}=await readTeacherClassAccess(tx,input.actor,input.id);
  if(input.kind==='complete'&&(session.status!=='scheduled'||(input.now??Date.now())<Date.parse(session.starts_at)))throw Error('teacher_class_not_started');
  if(input.kind==='note'&&!input.note?.trim())throw Error('teacher_note_empty');
  let diff:Record<string,unknown>;
  if(input.kind==='complete'){
   const bookings=await tx.list<BookingRow>('bookings',{where:{tenant_id:tenant.id,session_id:session.id}});
   diff={before:'scheduled',after:'completed',present:bookings.filter(b=>b.tenant_id===tenant.id&&b.session_id===session.id&&b.status==='checked_in').length,booked:session.booked_count};
   await tx.update('class_sessions',session.id,{status:'completed'});
  }else diff={note:input.note!.trim(),author:me?.display_name??input.actor.name};
  return tx.insert('audit_log',{actor_id:input.actor.userId,action:`session.${input.kind==='note'?'note':'complete'}`,entity:'class_sessions',entity_id:session.id,diff:{role:input.actor.role,source:'teacher_app',...diff},ip:null});
 });
}
