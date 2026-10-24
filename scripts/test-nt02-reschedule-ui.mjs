// NT-02: real BookedPage -> atomic reschedule -> one-shot UNSENT preview, never delivery.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { installRescheduleFixture, readRescheduleDb, financialTables } from './test-nt02-reschedule-fixture.mjs';
const base=process.env.QA_BASE??'http://127.0.0.1:5790', out=process.env.QA_OUTPUT??'/tmp/hoy-nt02-reschedule-ui';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const checks=[],errors=[],writes=[];let debug;
const preview=page=>page.locator('[data-launch-preview][data-launch-event="rescheduled"][data-launch-preview-status="ready"]');
const assertFinancial=(after,before)=>{for(const table of financialTables)assert.deepEqual(after[table],before[table],`${table}: move/preview preserves exact existing rows`);};
try {
 for(const lang of ['en','es'])for(const width of [390,1280]) {
  const en=lang==='en',context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  await context.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);},lang);
  const page=await context.newPage();debug=page;page.setDefaultTimeout(25000);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push({url:r.url(),method:r.method()});});
  await page.clock.install({time:new Date('2026-10-24T15:00:00Z')});
  await page.goto(`${base}/#/coming-soon`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
  const fixture=await installRescheduleFixture(page,lang),url=`${base}/#/app/booking/${fixture.oldId}/change`;
  await page.goto(url);await page.reload();
  const move=()=>page.getByRole('button',{name:en?/Reschedule to another class/:/Reprogramar a otra clase/});
  const choose=async()=>{await move().click();await page.getByLabel(en?'Replacement class date':'Día de la nueva clase').fill(fixture.targetDay);await page.getByText(fixture.newTitle,{exact:true}).waitFor();};
  await choose();const beforeCancel=await readRescheduleDb(page);
  await page.getByRole('button',{name:en?'Back':'Volver',exact:true}).click();
  await page.getByRole('button',{name:en?'Keep my booking':'Mantener mi reserva',exact:true}).click();
  await page.waitForURL(u=>u.hash===`#/app/booking/${fixture.oldId}`);
  assert.deepEqual(await readRescheduleDb(page),beforeCancel,'cancel edit never mutates data');assert.equal(await page.locator('[data-launch-event="rescheduled"]').count(),0,'cancel edit does not publish');
  await page.goto(url);await choose();const before=await readRescheduleDb(page);
  // Real adapter persistence failure: command refuses atomically; no publisher/preview.
  await page.evaluate(()=>{window.nt02SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hoyos.db.v1')throw new DOMException('Fictional NT02 persistence failure','QuotaExceededError');return window.nt02SetItem.call(this,key,value);};});
  await page.getByText(fixture.newTitle,{exact:true}).click();
  await page.getByText(en?'The change was not saved. Your original booking is still active; try again.':'No se guardó el cambio. Tu reserva original sigue activa; vuelve a intentarlo.',{exact:true}).waitFor();
  assert.deepEqual(await readRescheduleDb(page),before,'refused move has no data writes');assert.equal(await page.locator('[data-launch-event="rescheduled"]').count(),0,'refused move has no preview');
  await page.evaluate(()=>{Storage.prototype.setItem=window.nt02SetItem;delete window.nt02SetItem;});
  await page.getByText(fixture.newTitle,{exact:true}).click();await page.waitForURL(u=>/^#\/app\/booking\/[^/]+$/.test(u.hash)&&u.hash!==`#/app/booking/${fixture.oldId}`);
  const moved=await readRescheduleDb(page),next=moved.bookings.filter(b=>b.user_id===fixture.userId&&b.session_id===fixture.newSessionId&&b.status==='booked');
  assert.equal(next.length,1);const replacement=next[0];assert.equal(moved.bookings.find(b=>b.id===fixture.oldId).status,'cancelled');
  assert.equal(replacement.paid_with,'package');assert.equal(replacement.ledger_id,'qa_nt02_move_debit');assert.equal(replacement.payment_id,'qa_nt02_move_payment');assert.equal(replacement.user_id,fixture.userId);assert.equal(replacement.tenant_id,fixture.tenantId);
  assert.equal(moved.class_sessions.find(s=>s.id===fixture.oldSessionId).booked_count,0);assert.equal(moved.class_sessions.find(s=>s.id===fixture.newSessionId).booked_count,1);
  const audits=moved.audit_log.filter(a=>a.action==='booking.reschedule'&&a.entity_id===fixture.oldId);assert.equal(audits.length,1);assert.equal(audits[0].diff.replacement_booking_id,replacement.id);assert.equal(audits[0].actor_id,fixture.userId);assertFinancial(moved,before);
  // Shared host is deliberately nonmodal. Opening its real control is an explicit user action.
  await page.locator('button[data-launch-notification-open]').click();
  const shown=preview(page);await shown.waitFor();
  const text=await shown.innerText();assert(text.includes(fixture.newTitle));assert(text.includes(fixture.oldTitle),'separate verified summary retains original class');assert(text.includes(fixture.email));assert(text.includes(fixture.name.split(' ')[0]));assert(text.includes(fixture.teacher));
  assert(text.includes(en?'Booking moved:':'Cambiaste tu reserva:'),'correct localized saved subject');assert(!/\{\{[^}]+\}\}/.test(text),'saved template variables fully resolved');
  assert.equal(await shown.getAttribute('data-launch-owner'),fixture.userId);assert.equal(await shown.getAttribute('data-launch-template-kind'),'saved');assert.equal(await shown.getAttribute('data-launch-template-id'),fixture.templateId);assert.equal(await shown.getAttribute('data-launch-template-version'),String(fixture.templateVersion));assert.equal(await shown.getAttribute('data-launch-template-active'),String(fixture.templateActive));if(!fixture.templateActive)assert(text.includes(en?'Saved template is inactive. This is only an unsent preview.':'La plantilla guardada está inactiva. Solo es una vista previa sin enviar.'));assert.equal(await shown.getAttribute('data-launch-source-id'),replacement.id);
  assert.equal(await shown.getAttribute('data-launch-event'),'rescheduled');assert.equal(await shown.getAttribute('data-launch-preview-status'),'ready');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'preview fits native viewport');
  await page.screenshot({path:`${out}/${lang}-${width}-unsent.jpg`,fullPage:true,quality:70});
  assertFinancial(await readRescheduleDb(page),moved);
  // The successful route carries no historical event: reload/back cannot replay it.
  await page.evaluate(()=>{location.hash='#/app/history';});await page.waitForURL(u=>u.hash==='#/app/history');assert.equal(await page.locator('[data-launch-event="rescheduled"]').count(),0);assert.equal(await page.locator('button[data-launch-notification-open]').count(),0);
  await page.goBack();await page.waitForURL(u=>u.hash===`#/app/booking/${replacement.id}`);await page.getByText(fixture.newTitle,{exact:true}).first().waitFor();assert.equal(await page.locator('[data-launch-event="rescheduled"]').count(),0);assert.equal(await page.locator('button[data-launch-notification-open]').count(),0);assert.deepEqual(await readRescheduleDb(page),moved);
  await page.reload();await page.getByText(fixture.newTitle,{exact:true}).first().waitFor();assert.equal(await page.locator('[data-launch-event="rescheduled"]').count(),0);assert.equal(await page.locator('button[data-launch-notification-open]').count(),0);assert.deepEqual(await readRescheduleDb(page),moved);
  checks.push({lang,width,replacementId:replacement.id,actualMove:true,refusalAtomic:true,cancelEditNoEvent:true,exactFinancialHistoryUnchanged:true,correctLocalizedSavedTemplate:true,reloadAndNavigationNoReplay:true,templateId:fixture.templateId,templateVersion:fixture.templateVersion,templateActive:fixture.templateActive});await context.close();
 }
 assert.equal(checks.length,4);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(`PASS NT02 reschedule native ${checks.length} locale/viewport groups`);
}catch(error){if(debug&&!debug.isClosed()){await writeFile(`${out}/failure.txt`,await debug.locator('body').innerText());await debug.screenshot({path:`${out}/failure.jpg`,fullPage:true});}throw error;}
finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,writes,scope:'Synthetic local actual reschedule and UNSENT preview only; no delivery/backend/real customer data.'},null,2));}
