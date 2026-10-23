// Local fictional-provider fault injection; no production test switch or external requests.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const checks = [], errors = [];
const output = 'docs/screenshots/M-06/crm-recovery';
await mkdir(output,{recursive:true});
try {
 for(const lang of ['en','es']) {
  const context=await browser.newContext({viewport:{width:320,height:900},reducedMotion:'reduce'});
  await context.addInitScript(lang=>{
   localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null}));
   localStorage.setItem('hoyos.lang',lang);
   window.crmFault='reject';window.crmWaiters=[];
  },lang);
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await context.route('**/src/data/MockProvider.ts',async route=>{
   const response=await route.fetch();
   const body=await response.text();
   assert(body.includes('async list(table, query) {'));
   await route.fulfill({response,body:body.replace('async list(table, query) {',`async list(table, query) {
    if(table === 'vouchers') { window.crmSource = this;
     if(window.crmFault === 'reject') throw new Error('Fictional interrupted CRM read');
     if(window.crmFault === 'delay') { const rows = [...this.peek(table,query)]; return new Promise(resolve=>window.crmWaiters.push(()=>resolve(rows))); }
    }
   `)});
  });
  const page=await context.newPage();await page.clock.install({time:new Date('2026-10-23T12:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
  const retry=()=>page.getByRole('button',{name:lang==='es'?'Reintentar lectura':'Retry reading',exact:true});
  const search=()=>page.locator('.crm-search');
  await page.goto(`${base}/#/admin/crm`);
  await page.locator('.emptystate-error').waitFor();assert.equal(await search().count(),0);
  await retry().click();await page.locator('.emptystate-error').waitFor();
  await page.evaluate(()=>window.crmFault='delay');await retry().click();
  await page.locator('.emptystate-loading').waitFor();assert.equal(await search().count(),0);
  // Supersede a pending attempt. The late previous response must not replace current rows.
  await page.evaluate(()=>window.crmFault='ok');await retry().click();await search().waitFor();
  await search().fill('Camila');
  await page.evaluate(()=>window.crmWaiters.splice(0).forEach(resolve=>resolve()));
  assert.equal(await search().inputValue(),'Camila');
  // A failed live refresh must hide old balances, retaining the user's search for recovery.
  await page.evaluate(async()=>{
   window.crmFault='reject';
   const profile=window.crmSource.peek('profiles').find(r=>r.user_id==='usr_cust');
   await window.crmSource.update('profiles',profile.id,{initials:'QA'});
  });
  await page.locator('.emptystate-error').waitFor();assert.equal(await search().isVisible(),false);
  await page.evaluate(()=>window.crmFault='ok');await retry().click();await search().waitFor();assert.equal(await search().inputValue(),'Camila');
  await search().fill('');
  for(const width of [320,390,768,1280]) {
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang} CRM fits ${width}`);
   if([390,1280].includes(width))await page.screenshot({path:`${output}/${lang}-${width}-list.jpg`,quality:70,fullPage:true});
  }
  await page.goto(`${base}/#/admin/crm/usr_cust`);await page.locator('.member-head').waitFor();
  // Long fictional identity; keep the source data local, then explicitly reload the interrupted read.
  await page.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('hoyos.db.v1'));
   stored.db.users.find(r=>r.id==='usr_cust').email='long-fictional-customer-address-for-responsive-crm@example.test';
   stored.db.profiles.find(r=>r.user_id==='usr_cust').full_name='Cliente ficticia con nombre largo para comprobar el diseño';
   localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  await page.reload();await page.locator('.emptystate-error').waitFor();
  assert.equal(await page.locator('.member-head:visible').count(),0);
  await page.evaluate(()=>window.crmFault='ok');await retry().click();await page.locator('.member-head').waitFor();
  for(const width of [320,390,768,1280]) {
   await page.setViewportSize({width,height:900});
   for(const tab of (lang==='es'?['Conversación','Reservas','Pagos','Práctica']:['Conversation','Bookings','Payments','Practice'])) {
    await page.getByRole('button',{name:tab,exact:true}).click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang} ${tab} fits ${width}`);
    const text=await page.locator('.crm-page').innerText();
    assert(!/⟨|checked_in|late_cancel|no_show|past_due/.test(text),'No raw enums or missing translation keys');
    if(tab===(lang==='es'?'Pagos':'Payments') && lang==='es') assert(!/\b(approved|pending|cash|transfer|package|single)\b/.test(text));
    if([390,1280].includes(width))await page.screenshot({path:`${output}/${lang}-${width}-${tab.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}.jpg`,quality:70,fullPage:false});
   }
  }
  // Navigate away during an unresolved read and then recover the next route independently.
  await page.evaluate(()=>window.crmFault='delay');await page.goto(`${base}/#/admin/crm`);await page.locator('.emptystate-loading').waitFor();
  await page.clock.fastForward(12500);await page.locator('.emptystate-error').waitFor();
  await page.evaluate(()=>window.crmFault='ok');await page.goto(`${base}/#/admin/crm/usr_cust`);await page.locator('.member-head').waitFor();
  await page.evaluate(()=>window.crmWaiters.splice(0).forEach(resolve=>resolve()));
  await page.locator('.member-head').waitFor();
  for(const width of [390,1280]) {
   await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`${output}/${lang}-${width}-identity.jpg`,quality:70});
  }
  // Key dark-mode captures use the existing theme toggle.
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  for(const width of [390,1280]) {await page.setViewportSize({width,height:900});await page.screenshot({path:`${output}/${lang}-${width}-identity-dark.jpg`,quality:70});}
  checks.push(`${lang}: repeated rejection/retry, failed live refresh with retained search, timeout, interrupted and superseded read, list/detail, long identity, all detail tabs at 320/390/768/1280`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/results.json`,JSON.stringify({checks,errors,limits:['Fictional MockProvider in development; server and cross-device behavior unverified']},null,2));
 console.log(checks.join('\n'));
} finally {await browser.close();}
