import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'teacher-live-'));
try{
 await build({stdin:{contents:"export {readLiveTeacherRoster} from './src/modules/teacher/liveRoster';export {tenant} from './src/tenant/tenant';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(dir,'test.mjs')});
 const {readLiveTeacherRoster,tenant}=await import(pathToFileURL(join(dir,'test.mjs')));const tid=tenant.id;
 const actor={userId:'teacher-user',role:'teacher',name:'Teacher'};
 const rows={teachers:[{id:'teacher',tenant_id:tid,user_id:actor.userId}],class_sessions:[{id:'own',tenant_id:tid,teacher_id:'teacher',title:'Class',starts_at:'2026-11-17T10:00:00Z',ends_at:'2026-11-17T11:00:00Z',status:'scheduled',capacity:8,booked_count:2}],bookings:[{id:'b',tenant_id:tid,session_id:'own',user_id:'p',status:'booked',secret:'NO'}, {id:'cancel',tenant_id:tid,session_id:'own',user_id:'c',status:'cancelled'}, {id:'foreign',tenant_id:'other',session_id:'own',user_id:'x',status:'booked'}],profiles:[{id:'p1',tenant_id:tid,user_id:'p',full_name:'Name',email:'secret@example.com',phone:'secret',notes:'secret'}, {id:'x1',tenant_id:'other',user_id:'x',full_name:'No'}]};
 let reads=[],race=false;
 const data={name:'companyos',list:async(t,q)=>{reads.push([t,q]);if(race&&t==='profiles')rows.class_sessions[0].teacher_id='other';return structuredClone(rows[t]??[]);},insert:()=>assert.fail('write'),update:()=>assert.fail('write'),remove:()=>assert.fail('write')};
 const out=await readLiveTeacherRoster(data,actor,'own');assert.deepEqual(out.people,[{id:'b',name:'Name',arrived:false}]);assert(!JSON.stringify(out).includes('secret'));assert(reads.every(([t])=>['teachers','class_sessions','bookings','profiles'].includes(t)));assert(reads.every(([,q])=>q.where.tenant_id===tid));
 for(const a of [{...actor,userId:'other'},{...actor,role:'customer'}]){reads=[];await assert.rejects(readLiveTeacherRoster(data,a,'own'));assert(!reads.some(([t])=>['bookings','profiles'].includes(t)));}
 rows.teachers.push({...rows.teachers[0],id:'duplicate'});await assert.rejects(readLiveTeacherRoster(data,actor,'own'));rows.teachers.pop();
 race=true;await assert.rejects(readLiveTeacherRoster(data,actor,'own'));race=false;rows.class_sessions[0].teacher_id='teacher';
 await assert.rejects(readLiveTeacherRoster(data,actor,'own',()=>false),/teacher_context_changed/);
 let contextValid=true;const original=data.list;data.list=async(t,q)=>{const value=await original(t,q);if(t==='profiles')contextValid=false;return value;};await assert.rejects(readLiveTeacherRoster(data,actor,'own',()=>contextValid),/teacher_context_changed/);data.list=original;
 for(const table of ['teachers','class_sessions','bookings','profiles']){data.list=async(t,q)=>{if(t===table)throw Error('read_failure');return original(t,q);};await assert.rejects(readLiveTeacherRoster(data,actor,'own'),/read_failure/);}data.list=original;
 console.log('PASS live teacher roster: names only, tenant/ownership/duplicate/reassignment/context denial, no write calls');
}finally{await rm(dir,{recursive:true,force:true});}
