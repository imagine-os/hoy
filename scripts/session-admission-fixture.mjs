// Shared synthetic fixture for admission regressions; bundled from the selected source tree.
import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
export const admissionNow='2026-10-23T15:00:00.000Z';
export const admissionIds={session:'qa_admission_ui_session',template:'qa_admission_ui_template',modality:'qa_admission_ui_modality',user:'qa_admission_ui_user',waiter:'qa_admission_ui_waiter'};
export async function admissionFixture(source=process.cwd()){
 const temp=await mkdtemp(join(tmpdir(),'hoy-admission-ui-')),values=new Map(),RealDate=Date;let stored;
 try{globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[admissionNow]));}static now(){return new RealDate(admissionNow).getTime();}};globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const file=join(temp,'fixture.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';",resolveDir:source},bundle:true,format:'esm',platform:'node',outfile:file,logLevel:'silent'});const {MockProvider}=await import(pathToFileURL(file));new MockProvider();stored=JSON.parse(values.get('hoyos.db.v1'));
 const db=stored.db,base={tenant_id:db.tenants[0].id,created_at:admissionNow,updated_at:admissionNow};
 db.modalities.push({...db.modalities[0],...base,id:admissionIds.modality,slug:'qa-admission',active:true,name_es:'CLASE FICTICIA',name_en:'FICTIONAL CLASS'});
 db.class_templates.push({...db.class_templates[0],...base,id:admissionIds.template,modality_id:admissionIds.modality,active:true,generation_mode:'manual'});
 db.class_sessions.push({...db.class_sessions[0],...base,id:admissionIds.session,title:'FICTIONAL ADMISSION CLASS',template_id:admissionIds.template,modality_id:admissionIds.modality,starts_at:'2026-10-23T23:00:00Z',ends_at:'2026-10-24T00:00:00Z',capacity:8,booked_count:0,status:'scheduled'});
 for(const user of [admissionIds.user,admissionIds.waiter]){db.users.push({...db.users[0],...base,id:user,email:user+'@example.invalid',phone:'+573000000001',status:'active'});db.profiles.push({...db.profiles[0],...base,id:user+'_profile',user_id:user,full_name:user===admissionIds.user?'FICTIONAL ADMISSION CUSTOMER':'FICTIONAL ADMISSION WAITER',initials:'QA'});db.user_roles.push({...base,id:user+'_role',user_id:user,role:'customer'});db.class_ledger.push({...base,id:user+'_grant',user_id:user,delta:3,reason:'comp',plan_id:null,payment_id:null,purchase_ledger_id:null,expires_at:'2026-12-01',frozen_from:null,frozen_until:null});}
 }finally{globalThis.Date=RealDate;await rm(temp,{recursive:true,force:true});}return stored;
}
