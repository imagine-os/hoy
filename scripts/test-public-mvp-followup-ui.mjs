// All mutations are isolated fictional browser fixtures; no external handoffs are followed.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5180',out=process.env.QA_OUTPUT??'docs/screenshots/public-mvp-followup';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});
const checks=[],errors=[];let active;
async function go(page,path){await page.goto(`${base}/#${path}`);await page.reload();await page.locator('.site').waitFor();}
async function capture(page,name,selector='.site'){
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});await page.evaluate(async()=>{window.scrollTo(0,0);await document.fonts.ready;});
  await page.waitForTimeout(100);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflow ${width}`);
  assert(!(await page.locator('body').innerText()).includes('⟨'),`${name} translated`);
  await page.locator(selector).screenshot({path:`${out}/${name}-${width}.jpg`,quality:65,animations:'disabled'});
 }
}
async function contacts(page,profile,front,specials='',support='',sales=''){
 await page.evaluate(({profile,front,specials,support,sales})=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1')),t=s.db.tenants.find(t=>t.id==='ten_hoy');t.settings={...t.settings,profile:{...t.settings.profile,whatsapp:profile,email:'studio@example.invalid'},contacts:{frontDesk:{whatsapp:front,hours:'always'},specials:{whatsapp:specials,hours:'always'},support:{whatsapp:support,hours:'always'},sales:{whatsapp:sales,hours:'always'}}};localStorage.setItem('hoyos.db.v1',JSON.stringify(s));},{profile,front,specials,support,sales});
}
async function publication(page,action){await page.evaluate(action=>{
 const s=JSON.parse(localStorage.getItem('hoyos.db.v1')),p=s.db.plans.find(p=>p.id==='plan_pack12');
 if(action==='create'){
  const definition={code:'DEMO_PACKAGE',name:{es:'Paquete ficticio publicado',en:'Published fictional package'},type:'paquetes',classes:8,validityDays:45,active:true,prices:[{id:'demo_current',amount:123456,startsOn:'2026-10-01',endsOn:'2026-10-31'},{id:'demo_next',amount:654321,startsOn:'2026-11-01',endsOn:null}]};
  const draft={definition,history:[{revision:1,actorId:'usr_admin',at:'2026-10-23T12:00:00Z',definition:structuredClone(definition)}]};
  p.frontend_catalog=draft;p.frontend_publication={snapshot:structuredClone(draft),revision:1,actorId:'usr_admin',at:'2026-10-23T12:00:00Z',withdrawnAt:null,history:[]};
 }else if(action==='draft')p.frontend_catalog.definition.prices[0].amount=222222;
 else if(action==='republish')p.frontend_publication.snapshot=structuredClone(p.frontend_catalog);
 else if(action==='withdraw')p.frontend_publication.withdrawnAt='2026-10-23T18:00:00Z';
 else if(action==='unpriced')p.frontend_publication.snapshot.definition.prices=[{id:'future_only',amount:999999,startsOn:'2026-12-01',endsOn:null}];
 else if(action==='broken')p.frontend_publication.snapshot=null;
 else if(action==='zero')p.frontend_publication.snapshot.definition.prices[0].amount=0;
 localStorage.setItem('hoyos.db.v1',JSON.stringify(s));
 },action);}
try{
 for(const lang of ['es','en']){
  const ctx=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_public',devMode:false,viewAs:null}));},lang);
  const page=await ctx.newPage();active=page;await page.clock.install({time:new Date('2026-10-23T17:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
  await go(page,'/site');
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.teachers=s.db.teachers.map((row,index)=>({...row,display_name:`Demo Guide ${index+1}`,photo_url:null}));s.db.reviews=[];const t=s.db.tenants.find(t=>t.id==='ten_hoy');t.settings={...t.settings,profile:{...t.settings.profile,whatsapp:'+1 202 555 0100',email:'studio@example.invalid'}};localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
  await go(page,'/site');
  assert.match(await page.locator('.sanctuary-plan').nth(1).innerText(),/600[.,]000/,'legacy demo preserved without local publication');
  await publication(page,'create');await go(page,'/site');
  const packageCard=()=>page.locator('.sanctuary-plan').nth(1);
  assert.match(await packageCard().innerText(),/123[.,]456/);assert((await packageCard().innerText()).includes(lang==='es'?'8 clases · 45 días':'8 classes · 45 days'));
  assert((await packageCard().innerText()).includes(lang==='es'?'Paquete ficticio publicado':'Published fictional package'));
  assert.equal(await page.locator('.sanctuary-plan [role=status]').count(),2,'unpublished trial/private cannot show stale amount');
  await capture(page,`${lang}-home-published`);
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');await capture(page,`${lang}-home-published-dark`,'.sanctuary-plans');await page.evaluate(()=>document.documentElement.dataset.theme='light');
  await go(page,'/site/plans');assert.match(await page.getByTestId('site-published-price-plan_pack12').innerText(),/123[.,]456/);
  await publication(page,'draft');await go(page,'/site');assert.match(await packageCard().innerText(),/123[.,]456/,'draft stays private to editing workflow');
  await publication(page,'republish');await go(page,'/site');assert.match(await packageCard().innerText(),/222[.,]222/);
  await go(page,'/site/plans');assert.match(await page.getByTestId('site-published-price-plan_pack12').innerText(),/222[.,]222/);
  await capture(page,`${lang}-plans-republished`);
  // New effective date while the tab stays mounted; no reload and no backend event.
  await go(page,'/site');await page.clock.setSystemTime(new Date('2026-11-01T05:00:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelectorAll('.sanctuary-plan')[1]?.textContent?.match(/654[.,]321/));
  await page.clock.setSystemTime(new Date('2026-10-23T17:00:00Z'));
  await publication(page,'withdraw');await go(page,'/site');assert.equal(await packageCard().locator('.sanctuary-price').count(),0);await packageCard().getByRole('status').waitFor();
  await capture(page,`${lang}-home-withdrawn`);
  await publication(page,'create');await publication(page,'unpriced');await go(page,'/site');assert.equal(await packageCard().locator('.sanctuary-price').count(),0);
  await publication(page,'zero');await go(page,'/site'); // future-only zero still lacks a current price
  assert.equal(await packageCard().locator('.sanctuary-price').count(),0);
  await publication(page,'create');await publication(page,'broken');await go(page,'/site');assert.equal(await packageCard().locator('.sanctuary-price').count(),0,'corrupt Home snapshot does not crash or expose stale price');
  await publication(page,'create');await publication(page,'zero');await go(page,'/site');assert.match(await packageCard().locator('.sanctuary-price').innerText(),/\$\s*0/);
  await go(page,'/site?version=classic');assert.equal(await page.locator('.sanctuary').count(),0);assert(!(await page.locator('.site-main').innerText()).includes('35,000'),'unpublished trial suppressed in Classic');
  await capture(page,`${lang}-classic-unpublished-trial`);
  checks.push(`${lang}: Home/Plans share published name, price and 8-class/45-day terms; draft isolation; republished price update; open-tab effective date; withdrawal, missing/unpriced offers, explicit zero; Classic trial suppresses stale price`);
  // Valid and missing topic numbers keep existing configured reception handoff.
  await go(page,'/site/contact');await contacts(page,'+1 202 555 0100','+1 (202) 555-0101','+1 202 555 0102','+1 202 555 0103');await go(page,'/site/contact');
  assert.equal(await page.getByTestId('footer-whatsapp').getAttribute('href'),'https://wa.me/12025550101');
  for(const link of await page.locator('a[href^="https://wa.me/"]').all())assert.match(await link.getAttribute('href'),/^https:\/\/wa\.me\/[1-9]\d{7,14}(?:\?|$)/);
  await contacts(page,'+1 202 555 0100','+1 202 555 0101','bad','bad','bad');
  for(const route of ['/site/contact','/site/plans','/site/faq','/site?version=classic']){
   await go(page,route);await page.locator('[data-whatsapp-state=fallback]').first().waitFor();
   for(const href of await page.locator('a[href^="https://wa.me/"]').evaluateAll(a=>a.map(x=>x.href)))assert.equal(new URL(href).pathname,'/12025550101');
   await capture(page,`${lang}-${route.includes('contact')?'contact':route.includes('plans')?'plans':route.includes('faq')?'faq':'classic'}-fallback`);
  }
  await contacts(page,'+1 202 555 0100','bad');await go(page,'/site/contact');assert.equal(await page.getByTestId('footer-whatsapp').getAttribute('href'),'https://wa.me/12025550100','invalid reception override falls to valid configured profile');
  await contacts(page,'bad','bad','bad','bad','bad');
  for(const route of ['/site/contact','/site/plans','/site/faq','/site?version=classic']){
   await go(page,route);assert.equal(await page.locator('a[href^="https://wa.me/"]').count(),0,'all invalid numbers produce no WhatsApp anchors');
   await page.locator('[data-whatsapp-state=unavailable]').first().waitFor();
   assert(await page.locator('[data-whatsapp-state=unavailable] a[href$="/site/contact"]').count()>0,'alternative stays keyboard reachable');
   if(route==='/site/contact'){
    await page.locator('.site-form textarea').fill('Fictional message');assert(await page.locator('.site-form button').isDisabled());
    assert.equal(await page.locator('a[href="mailto:studio@example.invalid"]').count(),2,'email alternatives retained');
   }
   await capture(page,`${lang}-${route.includes('contact')?'contact':route.includes('plans')?'plans':route.includes('faq')?'faq':'classic'}-unavailable`);
   if(route==='/site/contact'){await page.evaluate(()=>document.documentElement.dataset.theme='dark');await capture(page,`${lang}-contact-unavailable-dark`,'.site-foot');await page.evaluate(()=>document.documentElement.dataset.theme='light');}
  }
  await contacts(page,'+1 202 555 0100','','','','');await go(page,'/site/contact');assert.equal(await page.getByTestId('footer-whatsapp').getAttribute('href'),'https://wa.me/12025550100','missing contacts retain profile fallback');
  await page.locator('.site-form textarea').fill('Demo & café? #1');await page.evaluate(()=>{window.open=url=>{window.__opened=String(url);return null;};});await page.locator('.site-form button').click();assert.equal(new URL(await page.evaluate(()=>window.__opened)).searchParams.get('text')?.includes('Demo & café? #1'),true);
  checks.push(`${lang}: valid/missing contacts; malformed topic → reception; malformed reception → configured profile; all invalid → no WhatsApp links, bilingual alternatives and disabled form; encoded Unicode valid form handoff; contact/Plans/FAQ/Classic 390/1280`);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.teachers=[];localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
  await go(page,'/site/teachers');assert.equal(await page.locator('.site-teacher').count(),0);await page.locator('.site-main .emptystate').waitFor();
  const expected=lang==='es'?'Aún no hay perfiles de profesores publicados.':'No teacher profiles are published yet.';
  assert((await page.locator('.site-main .emptystate').innerText()).includes(expected));
  assert.equal(await page.locator('.site-main .emptystate a').count(),2);
  await capture(page,`${lang}-teachers-empty`);
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');await capture(page,`${lang}-teachers-empty-dark`,'.site-main');await page.evaluate(()=>document.documentElement.dataset.theme='light');
  for(const route of ['/site','/site?version=classic']){await go(page,route);await page.locator('.site-main .emptystate').waitFor();assert((await page.locator('.site-main .emptystate').innerText()).includes(expected));}
  // Verify populated rendering recovers from empty through a separate fictional data refresh.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.teachers=[{id:'teacher_demo',tenant_id:'ten_hoy',created_at:'2026-10-23T12:00:00Z',updated_at:'2026-10-23T12:00:00Z',display_name:'Demo Guide',active:true,specialties:[],photo_url:null,bio:{es:'Guía ficticia',en:'Fictional guide'},rating_avg:0}];localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
  await go(page,'/site/teachers');await page.getByRole('heading',{name:'Demo Guide'}).waitFor();assert.equal(await page.locator('.site-main .emptystate').count(),0);
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await capture(page,`${lang}-teachers-populated-${theme}`);}
  checks.push(`${lang}: empty teacher directory/Home/Classic translated guidance and schedule/contact actions; populated recovery, portrait fallback and light/dark 390/1280`);
  await ctx.close();
 }
 // New D-02 component states are rendered from the actual library.
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:true,viewAs:null}));});
 const page=await ctx.newPage();active=page;page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/#/dev/components`);const library=page.locator('#cmp-PublicWhatsappLink');await library.waitFor();
 for(const state of ['direct','fallback','unavailable'])assert.equal(await library.locator(`[data-whatsapp-state=${state}]`).count(),1);
 assert.equal(await library.locator('[data-whatsapp-state=unavailable] a[href^="https://wa.me/"]').count(),0);
 await library.screenshot({path:`${out}/library-public-whatsapp.jpg`,quality:65});await ctx.close();
 checks.push('actual D-02 PublicWhatsappLink direct/fallback/unavailable states render; unavailable state has no WhatsApp anchor');
 assert.deepEqual(errors,[]);console.log(checks.join('\n'));
}catch(error){if(active)await active.screenshot({path:`${out}/failure.jpg`,quality:65,fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,limits:['Fictional local fixtures; no real message, publication service, backend, number ownership or security change.','Q-14/Q-15 remain unresolved. Archive content remains the historical design preview; shared footer uses safe live Settings presentation.']},null,2));await browser.close();}
