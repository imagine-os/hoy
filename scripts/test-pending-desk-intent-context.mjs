import assert from 'node:assert/strict';import {chromium} from 'playwright-core';import {mkdir,writeFile} from 'node:fs/promises';import {admissionFixture,admissionIds as ids,admissionNow} from './session-admission-fixture.mjs';
const base=process.env.QA_BASE??'http://127.0.0.1:5481',out=process.env.QA_OUTPUT??'/tmp/hoy-pending-desk-context',fixture=await admissionFixture(),checks=[],errors=[];let debug;await mkdir(out,{recursive:true});const row={tenant_id:'ten_hoy',created_at:admissionNow,updated_at:admissionNow};
fixture.db.waitlist.push({...row,id:'qa_harness_offer',user_id:'usr_super',session_id:ids.session,status:'offered',position:1,offered_at:admissionNow,claim_until:'2026-10-23T15:30:00Z'});
fixture.db.class_ledger.push({...row,id:'qa_harness_grant',user_id:'usr_super',delta:3,reason:'comp',plan_id:null,payment_id:null,expires_at:'2026-12-01',frozen_from:null,frozen_until:null},{...row,id:'qa_harness_debit',user_id:'usr_super',delta:-1,reason:'booking',purchase_ledger_id:'qa_harness_grant',plan_id:null,payment_id:null,expires_at:null});
fixture.db.class_sessions.push({...fixture.db.class_sessions.find(s=>s.id===ids.session),id:'qa_harness_original_session',starts_at:'2026-10-25T23:00:00Z',ends_at:'2026-10-26T00:00:00Z',booked_count:1});
fixture.db.bookings.push({...row,id:'qa_harness_original_booking',user_id:'usr_super',session_id:'qa_harness_original_session',status:'booked',paid_with:'package',ledger_id:'qa_harness_debit',checked_in_at:null,cancelled_at:null,rated:false});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
async function mount(surface,lang='en',width=390){const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'America/Bogota'});await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());await ctx.addInitScript(({fixture,lang,now,surface})=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return new D(now).getTime();}};localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));localStorage.setItem('hoyos.session',JSON.stringify({userId:surface==='register'?'usr_desk':'usr_super',devMode:true,viewAs:surface==='register'?null:'customer'}));localStorage.setItem('hoyos.lang',lang);},{fixture,lang,now:admissionNow,surface});const p=await ctx.newPage();debug=p;p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);await p.goto(base+'/#/coming-soon');await p.evaluate(async surface=>(await import('/scripts/session-admission-harness.tsx')).mountAdmissionHarness(surface),surface);await p.waitForFunction(()=>window.qaAdmission?.role);return {p,ctx};}
const db=p=>p.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
async function change(p,kind){await p.evaluate(kind=>{const s=window.qaAdmission;if(kind==='actor')s.switchUser('usr_desk');if(kind==='role')s.setViewAs('teacher');if(kind==='provider')s.swap();if(kind==='unmount')s.unmount();},kind);if(kind==='actor')await p.waitForFunction(()=>window.qaAdmission.actor==='usr_desk');if(kind==='role')await p.waitForFunction(()=>window.qaAdmission.role==='teacher');if(kind==='provider')await p.waitForTimeout(100);}

try{
 if(process.env.QA_CASE!=='lost-ack'){
 for(const lang of ['en','es'])for(const kind of ['actor','role','provider','unmount']){
  const {p,ctx}=await mount('checkout',lang,390),en=lang==='en',root=p.locator('#qa-admission-root');
  await root.locator('.cust-choice').nth(2).click();await root.locator('.cust-method').filter({hasText:en?'At the front desk':'En recepción'}).click();
  const before=await db(p);await p.evaluate(()=>{window.qaAdmission.mode='payment';window.qaAdmission.armed=true;});
  await root.locator('.cust-sticky > button').last().click();await p.waitForFunction(()=>window.qaAdmission.paused);
  await change(p,kind);await p.evaluate(()=>window.qaAdmission.release());await p.waitForFunction(()=>window.qaAdmission.result==='admission_context_changed');
  assert.equal(await db(p),before,'paused pending insert and intent/audit writes fully roll back');
  checks.push(`${lang}/${kind}: actual paused payment insert rolls back and cannot show stale success`);await ctx.close();
 }

 for(const lang of ['en','es'])for(const width of [390,1280]){
  const {p,ctx}=await mount('checkout',lang,width),en=lang==='en',root=p.locator('#qa-admission-root');
  await root.locator('.cust-choice').nth(2).click();await root.locator('.cust-method').filter({hasText:en?'At the front desk':'En recepción'}).click();
  const cta=root.locator('.cust-sticky > button').last();await p.waitForFunction(()=>[...document.querySelectorAll('#qa-admission-root .cust-sticky > button')].some(b=>!b.disabled));const before=await db(p);
  await p.evaluate(()=>{const state=window.qaAdmission,original=state.provider.list.bind(state.provider);state.failDeskRead=true;state.provider.list=async(table,q)=>{if(table==='payments'&&q?.where?.tenant_id&&state.failDeskRead)throw Error('fictional_pending_read');return original(table,q);};state.provider.emit({table:'payments',type:'reset'});});
  await root.getByText(en?'A single pending request could not be confirmed.':'No se puede confirmar una única solicitud pendiente.',{exact:false}).waitFor();assert(await cta.isDisabled());assert.equal(await db(p),before);
  await p.evaluate(()=>{window.qaAdmission.failDeskRead=false;});await root.getByRole('button',{name:en?'Retry':'Reintentar',exact:true}).click();await p.waitForFunction(()=>[...document.querySelectorAll('#qa-admission-root .cust-sticky > button')].some(b=>!b.disabled));assert.equal(await db(p),before);
  checks.push(`${lang}/${width}: actual scoped pending read failure blocks charging; Retry restores fresh result without writes`);await ctx.close();
 }

 }
 for(const lang of ['en','es']){
  const {p,ctx}=await mount('checkout',lang,390),en=lang==='en',root=p.locator('#qa-admission-root');
  await root.locator('.cust-choice').nth(2).click();await root.locator('.cust-method').filter({hasText:en?'At the front desk':'En recepción'}).click();const before=JSON.parse(await db(p)).db;
  await p.evaluate(()=>{const provider=window.qaAdmission.provider,atomic=provider.atomic.bind(provider);provider.atomic=async(...args)=>{await atomic(...args);throw Error('fictional_lost_ack_after_commit');};});
  await root.locator('.cust-sticky > button').last().click();await root.getByRole('button',{name:en?'View saved request':'Ver solicitud guardada',exact:true}).waitFor();assert(await root.locator('.cust-sticky > button').last().isDisabled());
  const saved=JSON.parse(await db(p)).db,newPayments=saved.payments.filter(r=>!before.payments.some(p=>p.id===r.id));assert.equal(newPayments.length,1);assert.equal(newPayments[0].status,'pending');assert(newPayments[0].frontend_desk_intent);assert.deepEqual(saved.class_ledger,before.class_ledger);assert.deepEqual(saved.bookings,before.bookings);
  const committed=await db(p);await root.getByRole('button',{name:en?'View saved request':'Ver solicitud guardada',exact:true}).click();await p.getByRole('dialog').waitFor();assert.equal(await db(p),committed);
  checks.push(`${lang}: lost acknowledgement reconciles one saved pending request without duplicate payment/grant/booking`);await ctx.close();
 }
}catch(e){errors.push(String(e));if(debug&&!debug.isClosed()){await debug.screenshot({path:out+'/interrupted.jpg'});await writeFile(out+'/interrupted.json',JSON.stringify(await debug.evaluate(()=>({text:document.body.innerText,state:window.qaAdmission?{role:window.qaAdmission.role,actor:window.qaAdmission.actor,armed:window.qaAdmission.armed,paused:window.qaAdmission.paused,result:window.qaAdmission.result}:null})),null,2));}}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,checks,errors},null,2));console.log(JSON.stringify({groups:checks.length,errors},null,2));}assert.deepEqual(errors,[]);
