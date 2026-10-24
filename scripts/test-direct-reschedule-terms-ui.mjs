// RS-09: actual paid single/trial -> recorded-term future-day reschedule; no new charge or entitlement.
// All accounts/storage/payments are synthetic and local; external HTTP is blocked.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5693';
const out=process.env.QA_OUTPUT??'/tmp/hoy-direct-reschedule-terms-ui';
const now='2026-10-23T15:00:00Z', checks=[], errors=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
let debug;
const readDb=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
try {
 for(const lang of ['en','es']) for(const width of [390,1280]) for(const kind of ['single','trial']) {
  if(process.env.QA_LANG&&lang!==process.env.QA_LANG||process.env.QA_WIDTH&&width!==Number(process.env.QA_WIDTH)||process.env.QA_KIND&&kind!==process.env.QA_KIND)continue;
  const en=lang==='en', userId=`qa_paid_${kind}_user`,sessionId=`qa_paid_${kind}_session`;
  const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
  await context.addInitScript(({lang,now})=>{
   const OriginalDate=Date;
   window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return new OriginalDate(now).getTime();}};
   if(location.origin==='null'||localStorage.getItem('qa-paid-link-init'))return;
   localStorage.setItem('qa-paid-link-init','1');localStorage.setItem('hoyos.lang',lang);
   localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_public',devMode:false,viewAs:null}));
  },{lang,now});
  const page=await context.newPage();debug=page;page.setDefaultTimeout(25000);
  page.on('pageerror',error=>errors.push(error.message));
  console.log(`recorded-term reschedule ${lang}/${width}/${kind}`);
  await page.goto(base+'/#/coming-soon');await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
  const expected=await page.evaluate(({userId,sessionId,kind,lang,now})=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db,tenantId='ten_hoy';
   const common={tenant_id:tenantId,created_at:now,updated_at:now}, email=`qa-paid-${kind}@example.test`;
   db.users.push({...common,id:userId,email,phone:'+573000000099',status:'active',last_sign_in_at:null,locale:lang});
   db.profiles.push({...common,id:userId+'_profile',user_id:userId,full_name:`FICTIONAL ${kind.toUpperCase()} CUSTOMER`,initials:'QA',photo_url:null,marketing_optin:false,whatsapp_verified:false});
   db.user_roles.push({...common,id:userId+'_role',user_id:userId,role:'customer',granted_by:null});
   // Match the full existing usesMats predicate: this fixture deliberately selects a non-mat class.
   const modality=db.modalities.find(m=>m.active&&!/yoga|vinyasa|flow|yin|ligereza|hibrido|alineacion/.test(m.slug));
   const teacher=db.teachers.find(t=>t.active),room=db.rooms.find(r=>r.active&&r.capacity>=2)??db.rooms[0];
   if(!modality||!teacher||!room)throw Error('fictional eligible session dependencies required');
   const title=`FICTIONAL PAID ${kind.toUpperCase()} CLASS`,session=db.class_sessions.find(s=>s.status==='scheduled');
   db.class_sessions.push({...session,...common,id:sessionId,title,template_id:null,modality_id:modality.id,teacher_id:teacher.id,room_id:room.id,starts_at:'2026-10-30T18:30:00Z',ends_at:'2026-10-30T19:20:00Z',capacity:2,booked_count:0,status:'scheduled',level:'all'});
   const template=db.class_templates.find(t=>t.active);if(!template)throw Error('fictional active template required');
   const templateId=`qa_paid_${kind}_template`;db.class_templates.push({...template,...common,id:templateId,active:true,generation_mode:'manual',modality_id:modality.id,teacher_id:teacher.id,room_id:room.id});
   const original=db.class_sessions.find(s=>s.id===sessionId);original.template_id=templateId;
   db.class_sessions.push({...original,id:sessionId+'_future',title:`FICTIONAL FUTURE ${kind.toUpperCase()} CLASS`,starts_at:'2026-11-03T18:30:00Z',ends_at:'2026-11-03T19:20:00Z',booked_count:0});
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
   localStorage.setItem('hoyos.session',JSON.stringify({userId,devMode:false,viewAs:null}));
   return{tenantId,email,title,teacher:teacher.display_name,room:room.name,targetId:sessionId+'_future',targetTitle:`FICTIONAL FUTURE ${kind.toUpperCase()} CLASS`,targetDay:'2026-11-03'};
  },{userId,sessionId,kind,lang,now});
  // A distinct document avoids applying the new fixture persona through the previous public SPA.
  await page.goto(`${base}/?qa_paid_link=${lang}${width}${kind}#/app/checkout/${sessionId}?pass=${kind}`);
  await page.locator('.cust-method').filter({hasText:en?'Card':'Tarjeta'}).click();
  const confirm=page.locator('.cust-sticky >button').last();
  await page.waitForFunction(()=>[...document.querySelectorAll('.cust-sticky >button')].some(button=>!button.disabled));
  const before=await readDb(page);assert.equal(before.payments.filter(p=>p.user_id===userId).length,0);assert.equal(before.class_ledger.filter(r=>r.user_id===userId).length,0);
  await confirm.evaluate(button=>{button.click();button.click();});await page.getByRole('button',{name:en?'View my booking':'Ver mi reserva',exact:true}).waitFor();
  const saved=await readDb(page),ownBookings=saved.bookings.filter(b=>b.user_id===userId),ownPayments=saved.payments.filter(p=>p.user_id===userId);
  assert.equal(ownBookings.length,1);assert.equal(ownPayments.length,1);
  assert.equal(saved.payments.length,before.payments.length+1);assert.equal(saved.bookings.length,before.bookings.length+1);
  const booking=ownBookings[0],payment=ownPayments[0];
  assert.equal(booking.payment_id,payment.id,'new direct booking retains exact payment');
  assert.equal(booking.tenant_id,expected.tenantId);assert.equal(payment.tenant_id,expected.tenantId);
  assert.equal(booking.user_id,userId);assert.equal(payment.user_id,userId);assert.equal(booking.session_id,sessionId);
  assert.equal(booking.status,'booked');assert.equal(booking.paid_with,kind);assert.equal(booking.ledger_id,null);
  assert.equal(payment.status,'approved');assert.equal(payment.method,'card');assert.equal(payment.provider,'wompi');
  assert(payment.amount>0);assert.equal(payment.amount_paid,payment.amount);assert.equal(payment.frontend_quote.chargedAmount,payment.amount);
  assert.deepEqual(saved.class_ledger,before.class_ledger,'single/trial payment invents no reusable grant or debit');
  assert.equal(payment.frontend_receipt.kind,'fictional-payment-receipt');assert.equal(payment.frontend_receipt.delivery,'preview-only');
  assert.equal(payment.frontend_receipt.facts.paymentId,payment.id);assert.equal(payment.frontend_receipt.facts.customerId,userId);
  assert.equal(payment.frontend_receipt.facts.tenantId,expected.tenantId);assert.equal(payment.frontend_receipt.facts.amountCharged,payment.amount);
  assert.equal(payment.frontend_receipt.facts.amountReceived,payment.amount_paid);assert.equal(payment.frontend_receipt.emailPreview.status,'unsent-preview');
  assert.equal(payment.frontend_receipt.emailPreview.recipient.email,expected.email);
  assert.deepEqual(saved.invoices,before.invoices);assert.deepEqual(saved.message_log,before.message_log);
  const paymentBytes=JSON.stringify(payment),receiptBytes=JSON.stringify(payment.frontend_receipt),ledgerBytes=JSON.stringify(saved.class_ledger),savedExpiry=payment.frontend_receipt.facts.quote.entitlementExpiresAt;
  assert.equal(payment.frontend_receipt.facts.quote.itemId,kind);assert.equal(payment.frontend_receipt.facts.quote.kind,'class');assert(savedExpiry&&expected.targetDay<=savedExpiry,'target uses existing recorded expiry; no policy/current-catalog inference');
  await page.getByRole('button',{name:en?'View my booking':'Ver mi reserva',exact:true}).click();await page.waitForURL(url=>url.hash===`#/app/booking/${booking.id}`);await page.getByText(en?'Payment confirmed':'Pago confirmado',{exact:true}).waitFor();
  await page.goto(`${base}/?qa_move=${lang}${width}${kind}#/app/booking/${booking.id}/change`);await page.getByRole('button',{name:en?/Reschedule to another class/:/Reprogramar a otra clase/}).click();const date=page.getByLabel(en?'Replacement class date':'Día de la nueva clase');assert.equal(await date.getAttribute('max'),savedExpiry,'date picker derives maximum from saved receipt quote');await date.fill(expected.targetDay);const target=page.getByText(expected.targetTitle,{exact:true});await target.waitFor();const beforeMove=await readDb(page);await target.click();await page.waitForURL(url=>!url.hash.endsWith('/change'));await page.getByText(en?'Payment confirmed':'Pago confirmado',{exact:true}).waitFor();
  const moved=await readDb(page),replacements=moved.bookings.filter(b=>b.user_id===userId&&b.session_id===expected.targetId);assert.equal(replacements.length,1);const replacement=replacements[0];assert.equal(replacement.status,'booked');assert.equal(replacement.payment_id,payment.id);assert.equal(replacement.paid_with,kind);assert.equal(replacement.ledger_id,null);assert.equal(moved.bookings.find(b=>b.id===booking.id).status,'cancelled');assert.equal(moved.class_sessions.find(s=>s.id===sessionId).booked_count,0);assert.equal(moved.class_sessions.find(s=>s.id===expected.targetId).booked_count,1);for(const table of['users','profiles','payments','class_ledger','invoices','message_log'])assert.deepEqual(moved[table],beforeMove[table],`${table} unchanged by move`);assert.equal(JSON.stringify(moved.class_ledger),ledgerBytes);assert.equal(JSON.stringify(moved.payments.find(p=>p.id===payment.id)),paymentBytes);assert.equal(JSON.stringify(moved.payments.find(p=>p.id===payment.id).frontend_receipt),receiptBytes);assert.equal(moved.audit_log.filter(a=>a.action==='booking.reschedule'&&a.entity_id===booking.id).length,1);assert(await page.locator('main').innerText().then(text=>text.includes(expected.targetTitle)));const movedBytes=JSON.stringify(moved);await page.reload();await page.getByText(en?'Payment confirmed':'Pago confirmado',{exact:true}).waitFor();assert.equal(JSON.stringify(await readDb(page)),movedBytes,'reloaded moved detail never rewrites any table');assert.equal(await page.getByText(en?'Payment status unavailable':'Estado del pago no disponible',{exact:true}).count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${out}/${lang}-${width}-${kind}-future-confirmed-reload.jpg`,fullPage:true,quality:65});await writeFile(`${out}/${lang}-${width}-${kind}-records.json`,JSON.stringify({original:booking,replacement,payment,savedExpiry,noNewCharge:true,ledgerRows:0,unchangedReceiptAfterReload:true},null,2));checks.push({lang,width,kind,originalBookingId:booking.id,replacementBookingId:replacement.id,paymentId:payment.id,savedExpiry,targetDay:expected.targetDay,exactOwnerTenantLink:true,originalCancelled:true,oneFutureReplacement:true,confirmedAfterReload:true,noNewPaymentGrantDebitReceiptOrAmount:true,originalAndTargetCounts:'0/1',noInvoiceOrDelivery:true});
  await context.close();
 }
 const selected=['en','es'].filter(l=>!process.env.QA_LANG||l===process.env.QA_LANG).length*[390,1280].filter(w=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH)).length;
 assert(selected>0);assert.equal(checks.length,selected*['single','trial'].filter(kind=>!process.env.QA_KIND||kind===process.env.QA_KIND).length);assert.deepEqual(errors,[]);
 console.log(`PASS direct single/trial recorded-term future reschedule: ${checks.length} actual native workflows`);
}catch(error){errors.push(String(error));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText());await debug.screenshot({path:out+'/failure.jpg',fullPage:true});}throw error;}
finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,checks,errors,scope:'Actual checkout+reschedule+detail; existing saved quote expiry only. Package12hour cutoff separately verified; no new payment/policy/email/auth/server claims.'},null,2));}
