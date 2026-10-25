// Native C-04: real browser-only cash/transfer saves, then a read-only UNSENT preview.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {admissionFixture,admissionNow,admissionIds} from './session-admission-fixture.mjs';
export const previewSelector='section[data-pending-request-preview]';
export const checkoutPath='/app/checkout/'+admissionIds.session+'?pass=pack12';
export const readDb=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
export async function pendingFixture(){
 const fixture=await admissionFixture();
 for(const table of ['payments','transfer_receipts','bookings','class_ledger','memberships'])fixture.db[table]=fixture.db[table].filter(r=>!['usr_cust','usr_super'].includes(r.user_id));
 return fixture;
}
export async function pendingContext(browser,fixture,lang,width,actorId='usr_cust',viewAs=null){
 const ctx=await browser.newContext({viewport:{width,height:1050},timezoneId:'America/Bogota',reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());
 await ctx.addInitScript(({fixture,lang,actorId,viewAs,now})=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return new D(now).getTime();}};if(!localStorage.getItem('hoyos.db.v1')){localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));localStorage.setItem('hoyos.session',JSON.stringify({userId:actorId,viewAs,devMode:false}));}localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:'light',skin:'styled'}));},{fixture,lang,actorId,viewAs,now:admissionNow});return ctx;
}
export async function preparePending(p,kind,en){
 if(kind==='cash'){await p.locator('.cust-method').filter({hasText:en?'At the front desk':'En recepción'}).click();const button=p.locator('.cust-sticky > button').last();await button.waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('.cust-sticky > button')].some(b=>!b.disabled));return button;}
 await p.getByRole('button',{name:en?'Demo transfer':'Transferencia demo',exact:true}).click();await p.getByRole('button',{name:en?'Use fictional test image':'Usar imagen ficticia de prueba',exact:true}).click();await p.getByAltText(en?'Fictional receipt preview':'Vista previa del comprobante ficticio').waitFor();const button=p.getByRole('button',{name:en?'Submit demo request':'Enviar solicitud demo',exact:true});assert.equal(await button.isDisabled(),false);return button;
}
export function assertPendingSave(before,after,kind,owner='usr_cust'){
 const added=after.payments.filter(row=>!before.payments.some(prior=>prior.id===row.id));assert.equal(added.length,1,'one saved payment request');const payment=added[0];assert.equal(payment.user_id,owner);assert.equal(payment.status,'pending');assert.equal(payment.method,kind);assert.equal(payment.provider,'manual');assert(payment.frontend_quote);assert.equal(payment.frontend_receipt??null,null);assert.equal(payment.amount_paid,null);
 for(const table of ['bookings','class_ledger','memberships','invoices','message_log','vouchers','voucher_events','users','profiles','user_roles','class_sessions','waitlist'])assert.deepEqual(after[table],before[table],table+' must not change on request save');
 assert.deepEqual(after.payments.filter(row=>row.id!==payment.id),before.payments,'prior payment history stays immutable');
 const audit=after.audit_log.filter(row=>row.action==='payment.mock.pending'&&row.entity_id===payment.id);assert.equal(audit.length,1);assert.equal(audit[0].actor_id,owner);
 if(kind==='cash'){assert(payment.frontend_desk_intent);assert.deepEqual(after.transfer_receipts,before.transfer_receipts);}
 else{const receipts=after.transfer_receipts.filter(row=>!before.transfer_receipts.some(prior=>prior.id===row.id));assert.equal(receipts.length,1);assert.equal(receipts[0].payment_id,payment.id);assert.equal(receipts[0].user_id,owner);assert.equal(receipts[0].status,'pending');assert.equal(receipts[0].booking_id,null);assert.deepEqual(after.transfer_receipts.filter(row=>row.id!==receipts[0].id),before.transfer_receipts);}
 return payment;
}
export async function assertPendingReady(p,kind,lang,payment,owner='usr_cust'){
 const en=lang==='en',preview=p.locator(previewSelector+'[data-status=ready]');await preview.waitFor();assert.equal(await preview.locator('xpath=ancestor::*[@role="dialog"]').count(),1,'preview stays in original success drawer');
 assert.equal(await preview.getAttribute('data-payment-id'),payment.id);assert.equal(await preview.getAttribute('data-kind'),kind);assert.equal(await preview.getAttribute('data-template-key'),'pending-payment-request');assert.equal(await preview.getAttribute('data-template-kind'),'builtin-mock');
 await preview.getByText(en?'Email preview · UNSENT':'Vista de email · SIN ENVIAR',{exact:true}).waitFor();
 const db=await readDb(p),user=db.users.find(u=>u.id===owner),profile=db.profiles.find(row=>row.user_id===owner);assert((await preview.locator('[data-pending-request-email]').innerText()).includes(user.email));assert((await preview.locator('[data-pending-request-name]').innerText()).includes(profile?.full_name||user.email));
 assert((await preview.locator('[data-pending-request-product]').innerText()).includes(payment.frontend_quote.name[lang]));assert.equal(Number((await preview.locator('[data-pending-request-amount]').innerText()).replace(/[^\d]/g,'')),payment.amount);
 const body=await preview.locator('[data-pending-request-body]').innerText();assert(body.includes(en?'No booking or spot hold exists for this request.':'Esta solicitud no crea una reserva ni retiene un cupo.'));assert(!/countdown|cuenta regresiva|\d+\s*(?:minutes? remaining|minutos? restantes)/i.test(body));
 const link=preview.locator('[data-pending-request-link]');assert.equal(await link.getAttribute('href'),'#/app/history');const url=p.url(),before=await readDb(p);await link.click();assert.equal(p.url(),url);assert.deepEqual(await readDb(p),before);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));return preview;
}
async function main(){
 const base=process.env.QA_BASE??'http://127.0.0.1:5694',out=process.env.QA_OUTPUT??'/tmp/hoy-pending-request-preview-ui',checks=[],errors=[];await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});let debug;
 try{for(const lang of ['en','es'])for(const width of [390,1280])for(const kind of ['cash','transfer']){
  const fixture=await pendingFixture(),ctx=await pendingContext(browser,fixture,lang,width),p=await ctx.newPage();debug=p;p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/#'+checkoutPath);const submit=await preparePending(p,kind,lang==='en');assert.equal(await p.locator(previewSelector).count(),0);const before=await readDb(p);
  await submit.evaluate(button=>{button.click();button.click();});await p.locator(previewSelector+'[data-status=ready]').waitFor();const saved=await readDb(p),payment=assertPendingSave(before,saved,kind);await assertPendingReady(p,kind,lang,payment);assert.deepEqual(await readDb(p),saved);
  for(const theme of ['light','dark']){await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await p.screenshot({path:`${out}/${lang}-${width}-${kind}-${theme}.jpg`,fullPage:true,animations:'disabled'});}
  await p.reload();await p.locator('.cust-sticky').waitFor();assert.equal(await p.locator(previewSelector).count(),0);assert.deepEqual(await readDb(p),saved);checks.push({lang,width,kind,oneOriginalSave:true,ownerRecipient:true,noBookingGrantHold:true,inertCTA:true,readOnlyPreview:true,reloadNoWrite:true});await ctx.close();
 }assert.deepEqual(errors,[]);console.log(`PASS pending request native preview: ${checks.length} groups`);
 }catch(e){errors.push(String(e));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText());await debug.screenshot({path:out+'/failure.jpg',fullPage:true});}throw e;}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,checks,errors},null,2));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
