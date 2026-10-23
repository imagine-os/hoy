import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5180';
const out='docs/screenshots/public-content-launch';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});
const checks=[],errors=[];
try {
 for(const lang of ['es','en']) {
  const ctx=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{
   const RealDate=Date;const fixed='2026-10-24T04:30:00Z';
   window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));} static now(){return new RealDate(fixed).getTime();}};
   localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_public',devMode:false,viewAs:null}));
  },lang);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/#/site`);await page.locator('.sanctuary-agenda').waitFor();
  await page.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));const row=s.db.class_sessions[0];const m=s.db.modalities.find(m=>m.active&&!/yoga|vinyasa|flow|yin|ligereza|hibrido|alineacion/.test(m.slug));
   s.db.class_sessions=[{...row,id:'public_demo_class',modality_id:m.id,title:'Demo evening class',starts_at:'2026-10-24T04:45:00Z',ends_at:'2026-10-24T05:45:00Z',status:'scheduled',booked_count:0,capacity:12}];
   s.db.class_templates.forEach(t=>t.active=true);
   localStorage.setItem('hoyos.db.v1',JSON.stringify(s));
  });
  await page.reload();await page.locator('.sanctuary-session-time').waitFor();
  const expected=await page.evaluate(lang=>({day:new Intl.DateTimeFormat(lang==='es'?'es-CO':'en-US',{timeZone:'America/Bogota',day:'numeric',month:'short'}).format(new Date()),time:new Intl.DateTimeFormat(lang==='es'?'es-CO':'en-US',{timeZone:'America/Bogota',hour:'numeric',minute:'2-digit'}).format(new Date('2026-10-24T04:45:00Z'))}),lang);
  assert.equal(await page.locator('.sanctuary-agenda-head span').last().textContent(),expected.day);
  assert.equal(await page.locator('.sanctuary-session-time').innerText(),expected.time.replace(/\u202f/g,' '));
  await page.locator('.sanctuary-session').click();await page.locator('.session-calendar').waitFor();
  // Existing website-to-auth interface: preserve chosen session in a validated local next target.
  await page.locator('.calendar-session:not([disabled])').first().click();
  await page.locator('[role=dialog]').waitFor();await page.locator('[role=dialog] button.btn').last().click();
  await page.waitForURL('**/#/auth/sign-in?next=*');
  const query=new URLSearchParams(page.url().split('?')[1]);assert.equal(query.get('next'),'/app/checkout/public_demo_class');
  await page.goto(`${base}/#/site/schedule`);await page.locator('.session-calendar').waitFor();
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.class_sessions[0].booked_count=12;localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
  await page.reload();await page.locator('.calendar-session:not([disabled])').first().click();
  await page.locator('[role=dialog]').waitFor();await page.locator('[role=dialog] button.btn').last().click();
  await page.waitForURL('**/#/auth/sign-in?next=*');
  assert.equal(new URLSearchParams(page.url().split('?')[1]).get('next'),'/app/waitlist/public_demo_class');
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.class_sessions=[];localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
  await page.goto(`${base}/#/site`);await page.reload();await page.locator('.sanctuary-agenda-empty').waitFor();
  for(const width of [390,1280])for(const theme of ['light','dark']) {
   await page.setViewportSize({width,height:900});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;window.scrollTo(0,0);},theme);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`${out}/${lang}-home-empty-${theme}-${width}.jpg`,quality:65,fullPage:true});
  }
  checks.push(`${lang}: Tokyo device studio-day and class-time display at Bogotá 23:30; selected class to sign-in next checkout and full-class waitlist; empty home agenda at 390/1280 light/dark`);
  await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(checks.join('\n'));
} finally {await writeFile(`${out}/agenda-results.json`,JSON.stringify({base,checks,errors,limits:['Booking verified only through sign-in handoff; auth/signup/return execution belongs to account owner.']},null,2));await browser.close();}
