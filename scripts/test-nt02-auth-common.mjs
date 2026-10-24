import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
export {assert};
export const base=process.env.QA_BASE??'http://127.0.0.1:5791';
export const out=process.env.QA_OUTPUT??'/tmp/hoy-nt02-auth';
export const preview=(page,event)=>page.locator(`[data-launch-preview][data-launch-event="${event}"][data-launch-preview-status="ready"]`);
// Payloads are document-scoped: the welcome Drawer uses a portal outside the fixture root.
export async function openPreview(page,event){
 const control=event==='sign-in-code'?page.locator('[data-launch-signin-preview-open]'):page.locator(`[data-launch-notification-open][data-launch-event="${event}"]`);
 if(event!=='sign-in-code')await page.locator(`[data-launch-notification-host][data-launch-event="${event}"][data-launch-preview-status="ready"]`).waitFor();
 await control.waitFor();assert.equal(await preview(page,event).count(),0,'new preview remains collapsed until explicit open');
 await control.click();await preview(page,event).waitFor();
}
export async function assertNoPreview(page,event){
 const queued=await page.evaluate(async event=>{const {launchTicket}=await import('/src/modules/launch-notifications/handoff.ts');const q=window.qaNt02Auth;return [q.first,q.second].some(provider=>launchTicket(provider)?.event.type===event);},event);
 assert.equal(queued,false,'no pending event ticket on either fixture provider');
 assert.equal(await page.locator(`[data-launch-notification-host][data-launch-event="${event}"]`).count(),0,'no event host/ticket in any state');
 assert.equal(await page.locator(`[data-launch-notification-open][data-launch-event="${event}"]`).count(),0,'no event open control');
 assert.equal(await page.locator(`[data-launch-preview][data-launch-event="${event}"]`).count(),0,'no portal/inline payload in any state');
 if(event==='sign-in-code'){
  assert.equal(await page.locator('[data-launch-inline-signin]').count(),0,'no stale inline challenge container');
  assert.equal(await page.locator('[data-launch-signin-preview-open]').count(),0,'no stale sign-in open control');
 }
}
export const db=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
export const session=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.session')));
export async function suite(name,run){
 await mkdir(out,{recursive:true});const checks=[],errors=[],mutations=[],external=[];
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
 const open=async(lang,width,path,actor='usr_public')=>{
  const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>{external.push(r.request().url());return r.abort();});
  await ctx.addInitScript(({lang,actor})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:actor,viewAs:null,devMode:false}));},{lang,actor});
  const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))mutations.push(r.url());});
  await page.addInitScript(()=>{window.qaNt02Unhandled=[];addEventListener('unhandledrejection',e=>window.qaNt02Unhandled.push(String(e.reason)));});
  await page.clock.install({time:new Date('2026-10-24T12:00:00Z')});await page.goto(base+'/#/coming-soon');
  await page.evaluate(async path=>(await import('/scripts/nt02-auth-harness.tsx')).mountNt02Auth(path),path);
  await page.waitForFunction(()=>window.qaNt02Auth?.ready);return {ctx,page,root:page.locator('#qa-nt02-auth'),close:async()=>{assert.deepEqual(await page.evaluate(()=>window.qaNt02Unhandled),[]);await ctx.close();}};
 };
 try{await run({open,checks,errors});assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);console.log(`PASS ${name}: ${checks.length} groups`);}
 catch(e){errors.push(String(e));for(const ctx of browser.contexts())for(const p of ctx.pages())if(!p.isClosed()){await writeFile(`${out}/${name}-failure.txt`,await p.locator('body').innerText());await p.screenshot({path:`${out}/${name}-failure.jpg`,fullPage:true});}throw e;}
 finally{await browser.close();await writeFile(`${out}/${name}-results.json`,JSON.stringify({base,checks,errors,mutations,external},null,2));}
}
export async function fillSignup(root,lang,email='fictional-nt02@example.test'){
 const en=lang==='en';for(const[label,value]of[[en?'First name':'Nombre','FICTIONAL'],[en?'Last name':'Apellido','NT02'],[en?'Email':'Correo',email],['WhatsApp','+57 300 000 7711'],[en?'Password':'Contraseña','FICTIONAL-SECRET-NEVER-PREVIEW'],[en?'Phone':'Teléfono','+57 300 000 7712']])await root.getByLabel(new RegExp('^'+label+'\\s*\\*?$')).first().fill(value);
 await root.getByLabel(new RegExp('^'+(en?'Name':'Nombre')+'\\s*\\*?$')).last().fill('FICTIONAL EMERGENCY SECRET');await root.locator('.signup-legal input').check();
}
export const submitSignup=(root,lang)=>root.getByRole('button',{name:lang==='en'?'Continue':'Continuar',exact:true});
export async function assertOriginalRegistration(before,after,owner){
 assert.equal(after.users.length,before.users.length+1);assert.equal(after.legal_acceptances.filter(r=>r.user_id===owner).length,2);assert.equal(after.audit_log.filter(r=>r.action==='mock.registration'&&r.entity_id===owner).length,1);
 const allowed=new Set(['users','profiles','user_roles','consents','legal_acceptances','audit_log']);for(const table of Object.keys(before))if(!allowed.has(table))assert.deepEqual(after[table],before[table],`${table}: preview creates no writes`);
 assert(!JSON.stringify(after).includes('FICTIONAL-SECRET-NEVER-PREVIEW'),'password never stored');
}
