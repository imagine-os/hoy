import {settledCapture} from './qa-rendered-capture.mjs';
// PR-06 fictional deterministic frontend-only fixture. Blocks all external requests.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],checks=[],output=process.env.QA_OUTPUT??'docs/screenshots/C-04';await mkdir(output,{recursive:true});
let debugPage;
try {
 for(const lang of ['en','es']) {
  const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{if(sessionStorage.getItem('pending-init'))return;sessionStorage.setItem('pending-init','1');localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));},lang);
  const page=await ctx.newPage();debugPage=page;page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-21T17:00:00Z')});
  await page.goto(`${base}/#/app/classes`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString(),user='usr_cust';
   db.memberships=db.memberships.filter(r=>r.user_id!==user);db.class_ledger=db.class_ledger.filter(r=>r.user_id!==user);db.bookings=db.bookings.filter(r=>r.user_id!==user);db.payments=db.payments.filter(r=>r.user_id!==user);
   const source=db.class_sessions.find(s=>s.status==='scheduled');const modality=db.modalities.find(m=>!/yoga|vinyasa|flow|yin|ligereza|hibrido|alineacion/.test(m.slug));
   db.class_sessions.push({...source,id:'qa_pending_class',title:'QA Pending Class',modality_id:modality.id,starts_at:'2026-10-24T17:10:00Z',ends_at:'2026-10-24T18:00:00Z',booked_count:0,capacity:6,created_at:stamp,updated_at:stamp});
   const independent=db.class_sessions.find(s=>s.id==='qa_pending_class');db.class_sessions.push({...independent,id:'qa_confirmed_class',title:'QA Independent Confirmed Class',template_id:null,starts_at:'2026-10-25T17:10:00Z',ends_at:'2026-10-25T18:00:00Z'});
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  await page.goto(`${base}/#/app/checkout/qa_pending_class?pass=pack12`);await page.reload();
  await page.getByText(lang==='en'?'Local demonstration with fictional data. Does not process real payments.':'Demostración local con datos ficticios. No procesa pagos reales.',{exact:true}).waitFor();
  await page.getByRole('button',{name:lang==='en'?'At the front desk':'En recepción',exact:true}).click();
  await page.getByRole('button',{name:lang==='en'?/Request demo desk payment/:/Solicitar pago demo/}).click();
  await page.getByText(lang==='en'?'Pending payment at the desk':'Pendiente de pago en recepción',{exact:true}).first().waitFor();
  const result=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;return {payments:db.payments.filter(p=>p.user_id==='usr_cust'),ledger:db.class_ledger.filter(r=>r.user_id==='usr_cust'),bookings:db.bookings.filter(r=>r.user_id==='usr_cust'),count:db.class_sessions.find(s=>s.id==='qa_pending_class').booked_count};});
  assert.equal(result.payments.length,1);assert.equal(result.payments[0].status,'pending');assert.equal(result.ledger.length,0);assert.equal(result.bookings.length,0);assert.equal(result.count,0);
  for(const width of [390,1280]) {await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await settledCapture(page,{path:`${output}/${lang}-${width}-pending-package.jpg`,quality:72,fullPage:false});}
  checks.push(`${lang}: pending package request creates one payment, no purchase/debit/booking/capacity; EN/ES mobile and desktop pending notice`);
  // Confirmed demo payment activates the package and uses one class atomically.
  // An independent, earlier-expiring grant must survive an explicit fresh package purchase unchanged.
  await page.evaluate(()=>{const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,stamp=new Date().toISOString();db.class_ledger.push({id:'qa_older_grant',tenant_id:db.users[0].tenant_id,user_id:'usr_cust',plan_id:'plan_pack12',payment_id:null,delta:3,reason:'purchase',expires_at:'2026-10-30',frozen_from:null,frozen_until:null,created_at:stamp,updated_at:stamp});localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));});
  await page.getByRole('button',{name:lang==='en'?'Back to schedule':'Volver al horario',exact:true}).click();
  await page.goto(`${base}/#/app/checkout/qa_pending_class?pass=pack12`);await page.reload();
  await page.getByText(lang==='en'?'Saved pending demo request':'Solicitud demo pendiente guardada',{exact:true}).first().waitFor();
  const duplicateCharge=page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/});
  assert(await duplicateCharge.isDisabled(),'a retained pending desk request blocks a second same-class card charge');
  const beforeDuplicate=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  await duplicateCharge.evaluate(button=>button.click());
  const afterDuplicate=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  for(const table of ['payments','class_ledger','bookings','class_sessions','audit_log'])assert.deepEqual(afterDuplicate[table],beforeDuplicate[table],`${table} unchanged when same-class duplicate charge is blocked`);
  checks.push(`${lang}: retained pending request blocks same-class card charge, with no payment/grant/booking/hold mutation`);
  // A separate, explicitly available future class exercises the independent confirmed purchase.
  await page.goto(`${base}/#/app/checkout/qa_confirmed_class?pass=pack12`);await page.reload();
  await page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/}).click();
  await page.getByRole('button',{name:lang==='en'?'View my booking':'Ver mi reserva',exact:true}).waitFor();
  const approved=await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;return {payments:db.payments.filter(p=>p.user_id==='usr_cust'),ledger:db.class_ledger.filter(r=>r.user_id==='usr_cust'),bookings:db.bookings.filter(r=>r.user_id==='usr_cust'),count:db.class_sessions.find(s=>s.id==='qa_confirmed_class').booked_count,pendingCount:db.class_sessions.find(s=>s.id==='qa_pending_class').booked_count};});
  assert.equal(approved.payments.length,2);assert.deepEqual(approved.payments.find(p=>p.id===result.payments[0].id),result.payments[0],'original pending payment and accepted terms remain unchanged');assert.equal(approved.pendingCount,0);assert(!approved.bookings.some(b=>b.session_id==='qa_pending_class'));assert.equal(approved.bookings[0].session_id,'qa_confirmed_class');
  assert.equal(approved.payments.filter(p=>p.status==='approved').length,1);assert.equal(approved.ledger.filter(r=>r.reason==='purchase').length,2);assert.equal(approved.ledger.reduce((n,r)=>n+r.delta,0),14);
  const newPurchase=approved.ledger.find(r=>r.reason==='purchase'&&r.payment_id===approved.payments.find(p=>p.status==='approved').id);
  assert.equal(approved.ledger.find(r=>r.delta===-1).purchase_ledger_id,newPurchase.id,'explicit new package consumes its own purchased grant');
  assert.equal(approved.ledger.find(r=>r.id==='qa_older_grant').delta,3,'older grant unchanged');assert.equal(approved.bookings.length,1);assert.equal(approved.count,1);
  const audit=await page.evaluate(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.audit_log.filter(r=>r.action==='booking.create'&&r.entity_id===id),approved.bookings[0].id);assert.equal(audit.length,1);assert.equal(audit[0].actor_id,'usr_cust');assert.equal(audit[0].diff.role,'customer');assert(Number.isFinite(Date.parse(audit[0].created_at)));
  const outcome=await page.evaluate(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.audit_log.filter(r=>r.action==='payment.mock.approved'&&r.entity_id===id),approved.payments.find(p=>p.status==='approved').id);assert.equal(outcome.length,1);assert.equal(outcome[0].actor_id,'usr_cust');assert.equal(outcome[0].diff.simulated,true);
  checks.push(`${lang}: confirmed demo payment activates 12 classes with stored expiry, one booking/debit linked to exact fresh purchase, old 3-class grant retained (total14); pending request remains separate`);
  // A storage failure on package-only checkout must leave no payment, invoice or grant behind.
  await page.goto(`${base}/#/app/plans?plan=pack12`);
  await page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/}).waitFor();
  const beforeFailure=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  await page.evaluate(()=>{window.qaStorageFaults=0;window.qaOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='hoyos.db.v1'){window.qaStorageFaults++;throw new Error('QA storage failure');}return window.qaOriginalSetItem.call(this,k,v);};});
  await page.getByRole('button',{name:lang==='en'?/Pay .* with Wompi/:/Pagar .* con Wompi/}).click();
  // Wait for the actual persistence fault and settled operation, not the notice shown while checkout is running.
  await page.waitForFunction(()=>window.qaStorageFaults>0&&document.querySelector('[data-class-purchase-confirm]')?.disabled===false);
  await page.getByText(lang==='en'?'The purchase may already be recorded. Its result is checked before retrying; do not start another purchase to resolve this one.':'Puede que la compra ya esté registrada. Revisaremos su resultado antes de reintentar; no empieces otra compra para resolver esta.',{exact:true}).waitFor();
  await page.getByText(lang==='en'?'These are the saved details of the earlier purchase.':'Estos son los datos guardados de la compra anterior.',{exact:true}).waitFor();
  const retained=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.retained-class-purchase.v1:ten_hoy:usr_cust')));
  assert(retained?.id,'storage failure retains the exact purchase intent');
  const amount=new Intl.NumberFormat(lang==='en'?'en-US':'es-CO',{style:'currency',currency:'COP',currencyDisplay:'narrowSymbol',maximumFractionDigits:0}).format(retained.quote.chargedAmount);
  const retry=page.getByRole('dialog').getByRole('button',{name:(lang==='en'?'Retry saved purchase · ':'Reintentar la compra guardada · ')+amount,exact:true});
  assert(await retry.isEnabled());
  const afterFailure=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  for(const table of ['payments','invoices','class_ledger','bookings','audit_log'])assert.deepEqual(afterFailure[table],beforeFailure[table],`${table} unchanged after package purchase save failure`);
  const failureOutput=process.env.QA_OUTPUT?`${output}/failure`:'docs/screenshots/C-06';await mkdir(failureOutput,{recursive:true});
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await settledCapture(page,{path:`${failureOutput}/${lang}-${width}-purchase-failure.jpg`,quality:72,fullPage:false});}
  await page.evaluate(()=>Storage.prototype.setItem=window.qaOriginalSetItem);
  await retry.dblclick();
  await page.getByRole('dialog').getByRole('heading',{name:lang==='en'?'Purchase recorded':'Compra registrada',exact:true}).waitFor();
  const afterRetry=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
  const savedAttempt=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.retained-class-purchase.v1:ten_hoy:usr_cust')));
  assert.equal(savedAttempt.id,retained.id,'retry reuses the retained intent, never a new purchase id');
  assert.deepEqual(savedAttempt.quote,retained.quote,'retry retains the exact saved terms');
  const retryPayments=afterRetry.payments.filter(p=>!beforeFailure.payments.some(old=>old.id===p.id));
  const retryGrants=afterRetry.class_ledger.filter(r=>!beforeFailure.class_ledger.some(old=>old.id===r.id));
  assert.equal(retryPayments.length,1);assert.equal(retryPayments[0].status,'approved');assert.equal(retryPayments[0].amount,retained.quote.chargedAmount);
  assert.deepEqual(retryPayments[0].frontend_quote,retained.quote);
  assert.equal(retryGrants.length,1);assert.equal(retryGrants[0].reason,'purchase');assert.equal(retryGrants[0].payment_id,retryPayments[0].id);assert.equal(retryGrants[0].delta,retained.quote.classes);
  for(const table of ['invoices','bookings','class_sessions'])assert.deepEqual(afterRetry[table],beforeFailure[table],`${table} unchanged by package-only retry`);
  for(const table of ['payments','class_ledger','audit_log'])for(const row of beforeFailure[table])assert.deepEqual(afterRetry[table].find(saved=>saved.id===row.id),row,`${table} historical row unchanged after retry`);
  await page.reload();
  await page.getByRole('dialog').getByRole('heading',{name:lang==='en'?'Purchase recorded':'Compra registrada',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db),afterRetry,'reload recovers the exact committed purchase without a second write');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.retained-class-purchase.v1:ten_hoy:usr_cust')).id),retained.id);
  await page.getByRole('dialog').getByRole('button',{name:lang==='en'?'See my classes':'Ver mis clases',exact:true}).click();
  await page.waitForURL(/app\/classes/);
  await page.waitForFunction(()=>localStorage.getItem('hoyos.retained-class-purchase.v1:ten_hoy:usr_cust')===null);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db),afterRetry,'explicit acknowledgement clears only the retained marker');
  checks.push(`${lang}: package-only persistence fault leaves financial history unchanged; truthful uncertainty, same-intent retry/double-click one grant, read-only reload and explicit acknowledgement; EN/ES desktop/mobile notice`);
  await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${output}/pending-results.json`,JSON.stringify({feature:'PR-06',base,checks,errors,limits:['Frontend MockProvider only; no real charge, server approval or capacity hold.','Pending checkout creates request only; backend settlement and replay integration remains Anu work.']},null,2));console.log(checks.join('\n'));
} catch(error) {
 errors.push(String(error));
 if(debugPage&&!debugPage.isClosed()){await writeFile(`${output}/failure.txt`,await debugPage.locator('body').innerText().catch(()=>'<document unavailable>'));await debugPage.screenshot({path:`${output}/failure.jpg`,fullPage:true}).catch(()=>{});}
 await writeFile(`${output}/failure-results.json`,JSON.stringify({feature:'PR-06',base,checks,errors},null,2));throw error;
} finally {await browser.close();}
