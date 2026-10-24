// RS-08: actual paid single/trial checkout -> exact booking payment link -> persisted detail.
// All accounts/storage/payments are synthetic and local; external HTTP is blocked.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5692';
const out=process.env.QA_OUTPUT??'docs/screenshots/single-booking-payment';
const now='2026-10-23T15:00:00Z', checks=[], errors=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
let debug;
const readDb=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
try {
 for(const lang of ['en','es']) for(const width of [390,1280]) for(const kind of ['single','trial']) {
  if(process.env.QA_LANG&&lang!==process.env.QA_LANG||process.env.QA_WIDTH&&width!==Number(process.env.QA_WIDTH))continue;
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
  console.log(`paid booking link ${lang}/${width}/${kind}`);
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
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
   localStorage.setItem('hoyos.session',JSON.stringify({userId,devMode:false,viewAs:null}));
   return{tenantId,email,title,teacher:teacher.display_name,room:room.name};
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
  const savedBytes=JSON.stringify(saved),paymentBytes=JSON.stringify(payment),receiptBytes=JSON.stringify(payment.frontend_receipt);
  await page.getByRole('button',{name:en?'View my booking':'Ver mi reserva',exact:true}).click();
  await page.waitForURL(url=>url.hash===`#/app/booking/${booking.id}`);
  for(const phase of ['first-read','reload']){
   if(phase==='reload')await page.reload();
   await page.getByText(en?'Payment confirmed':'Pago confirmado',{exact:true}).waitFor();
   assert.equal(await page.getByText(en?'Payment status unavailable':'Estado del pago no disponible',{exact:true}).count(),0);
   const body=await page.locator('main').innerText();
   for(const value of [expected.title,expected.teacher,expected.room,en?'Fri, Oct 30':'vie, 30 de oct'])assert(body.includes(value),`${phase}: literal detail ${value}`);
   assert(body.includes(en?'1:30 PM':'1:30'));
   const directions=page.locator('a[href*="google.com/maps"]');assert.equal(await directions.count(),1);
   assert.match(await directions.getAttribute('href'),/^https:\/\/www\.google\.com\/maps\//);
   const after=await readDb(page),persisted=after.payments.find(p=>p.id===payment.id);
   assert.equal(JSON.stringify(after),savedBytes,'detail/reload never rewrites any DB table');
   assert.equal(JSON.stringify(persisted),paymentBytes);assert.equal(JSON.stringify(persisted.frontend_receipt),receiptBytes);
   assert.equal(after.bookings.find(b=>b.id===booking.id).payment_id,payment.id);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`${out}/${lang}-${width}-${kind}-confirmed-reload.jpg`,fullPage:true,quality:65});
  await writeFile(`${out}/${lang}-${width}-${kind}-records.json`,JSON.stringify({booking,payment,ledgerRows:0,unchangedReceiptAfterReload:true},null,2));
  checks.push({lang,width,kind,bookingId:booking.id,paymentId:payment.id,exactOwnerTenantLink:true,confirmedAfterReload:true,duplicateInitialClicksOnce:true,noGrantOrDebit:true,amountAndReceiptUnchanged:true,dateTimeRoomTeacherDirections:true,noInvoiceOrDelivery:true});
  await context.close();
 }
 const selected=['en','es'].filter(l=>!process.env.QA_LANG||l===process.env.QA_LANG).length*[390,1280].filter(w=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH)).length;
 assert(selected>0);assert.equal(checks.length,selected*2);assert.deepEqual(errors,[]);
 console.log(`PASS paid single/trial exact booking payment link: ${checks.length} actual native workflows`);
}catch(error){errors.push(String(error));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText());await debug.screenshot({path:out+'/failure.jpg',fullPage:true});}throw error;}
finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,checks,errors,scope:'Synthetic native frontend simulation only; explicit payment association, no actual charge/email/auth/server or release lifecycle claim.'},null,2));}
