import type {DataProvider} from '../../data/types';
import type {TeacherRow,ClassSessionRow} from '../../data/schema';
import {tenant} from '../../tenant/tenant';
export interface TeacherActor {userId:string;role:string;name:string}
export const canChooseTeacherPreview=(role:string)=>['admin','coordinator','finance','super_admin'].includes(role);
export function teacherIdentity(teachers:TeacherRow[],actor:TeacherActor,pick:string|null){
 const scoped=teachers.filter(t=>t.tenant_id===tenant.id);
 const own=scoped.filter(t=>t.user_id===actor.userId);
 if(actor.role==='teacher')return own.length===1?own[0]:undefined;
 if(!canChooseTeacherPreview(actor.role))return undefined;
 return own[0]??scoped.find(t=>t.id===pick);
}
/** Frontend-only ownership check, not server authorization. Never reads a foreign roster. */
export async function readTeacherClassAccess(data:DataProvider,actor:TeacherActor,id:string){
 let me:TeacherRow|undefined;
 const preview=['admin','coordinator','super_admin'].includes(actor.role);
 if(actor.role==='teacher'){
  const teachers=await data.list<TeacherRow>('teachers',{where:{tenant_id:tenant.id,user_id:actor.userId}});
  me=teacherIdentity(teachers,actor,null);
  if(!me)throw Error('teacher_class_unavailable');
 }else if(!preview)throw Error('teacher_class_unavailable');
 const sessions=await data.list<ClassSessionRow>('class_sessions',{where:{tenant_id:tenant.id,id,...(me?{teacher_id:me.id}:{})}});
 const session=sessions.find(s=>s.id===id&&s.tenant_id===tenant.id&&(!me||s.teacher_id===me.id));
 if(!session)throw Error('teacher_class_unavailable');
 return {session,me,isMine:actor.role==='teacher'};
}
