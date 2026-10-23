// M-06: preserve known guest/comp payment-source labels and honest unknown values.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.QA_BASE??'http://127.0.0.1:5173';
const errors=[];
try{
 for(const lang of ['es','en']){
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.addInitScript(lang=>{localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null}));localStorage.setItem('hoyos.lang',lang);},lang);
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/#/admin/crm/usr_cust`);await page.locator('.member-head').waitFor();
  await page.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),db=stored.db;
   const original=db.bookings.find(b=>b.user_id==='usr_cust');
   db.bookings=db.bookings.filter(b=>b.user_id!=='usr_cust');
   for(const [index,paid] of ['guest','comp','unrecognized_fixture'].entries())db.bookings.push({...original,id:`qa_label_${paid}`,session_id:db.class_sessions[index].id,status:['booked','checked_in','no_show'][index],paid_with:paid});
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  await page.reload();await page.locator('.member-head').waitFor();
  const labels=lang==='es'?['Invitado','Cortesía','Sin confirmar']:['Guest','Complimentary','Unconfirmed'];
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});
   await page.getByRole('button',{name:lang==='es'?'Reservas':'Bookings',exact:true}).click();
   const sources=await page.locator('.crm-page tbody tr td:last-child').allTextContents();
   assert.deepEqual([...sources].sort(),[...labels].sort(),`${lang}: guest and comp retain known meanings; unknown stays unconfirmed`);
   const statuses=await page.locator('.crm-page tbody tr td:nth-child(3)').allTextContents();
   assert.deepEqual([...statuses].sort(),(lang==='es'?['Reserva','Asistió','No vino']:['Booking','Check-in','No-show']).sort());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('.crm-page .datatable').scrollIntoViewIfNeeded();
   await page.locator('.crm-page .datatable-scroll').evaluate(el=>{el.scrollLeft=el.scrollWidth;});
   await page.screenshot({path:`docs/screenshots/M-06/crm-recovery/${lang}-${width}-booking-labels.jpg`,quality:70,animations:'disabled'});
   await page.getByRole('button',{name:lang==='es'?'Conversación':'Conversation',exact:true}).click();
   for(const label of labels)assert((await page.locator('.member-conv').innerText()).includes(label),`${lang}: timeline includes ${label}`);
   assert(!(await page.locator('.crm-page').innerText()).includes('unrecognized_fixture'));
   console.log(`PASS ${lang} ${width}: guest/comp/unknown in booking table and timeline; booking statuses unchanged; no overflow`);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
