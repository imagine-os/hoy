// Fictional browser fixtures only. Never follows external WhatsApp/map/contact links.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5180';
const out = 'docs/screenshots/public-content-launch';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--no-proxy-server'] });
const checks = [], errors = [];
async function context(lang='en', timezoneId='Asia/Tokyo', date='2026-10-29T23:00:00Z') {
  const ctx = await browser.newContext({ viewport: { width:390, height:900 }, timezoneId, reducedMotion:'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, r => r.abort());
  await ctx.addInitScript(({lang,date}) => {
    const RealDate=Date;
    window.Date=class extends RealDate { constructor(...args){super(...(args.length ? args : [date]));} static now(){return new RealDate(date).getTime();} };
    localStorage.setItem('hoyos.lang',lang);
    localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_public',devMode:false,viewAs:null}));
  }, {lang,date});
  const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message));
  return {ctx,page};
}
async function capture(page, name) {
  for(const width of [390,1280]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>{window.scrollTo(0,0);return document.fonts.ready;});
    await page.waitForTimeout(100);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflow ${width}`);
    assert(!(await page.locator('body').innerText()).includes('⟨'),`${name} translated`);
    await page.screenshot({path:`${out}/${name}-${width}.jpg`,quality:65,fullPage:true});
  }
}
try {
  for(const lang of ['es','en']) {
    const {ctx,page}=await context(lang);
    for(const route of ['/','/coming-soon?login=soon']) {
      await page.goto(`${base}/#${route}`);await page.locator('.coming-soon').waitFor();
      assert(!page.url().includes('#/site'));
    }
    await page.goto(`${base}/#/coming-soon`);await page.locator('.coming-soon').waitFor();
    await capture(page,`${lang}-prelaunch`);
    const historyLength=await page.evaluate(()=>history.length);
    // One second tick re-evaluates the wall clock, without reload/navigation.
    await page.evaluate(()=>{const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-30T05:00:00Z']));}static now(){return new RealDate('2026-10-30T05:00:00Z').getTime();}};});
    await page.waitForURL('**/#/site');await page.locator('.site').waitFor();
    assert.equal(await page.evaluate(()=>history.length),historyLength,'launch replaces history');
    await ctx.close();
    for(const route of ['/','/coming-soon?login=soon&version=archive']) {
      const {ctx:post,page:p}=await context(lang,'Pacific/Honolulu','2026-10-30T05:00:00Z');
      await p.goto(`${base}/#${route}`);await p.waitForURL('**/#/site');await p.locator('.site').waitFor();
      assert.equal(await p.locator('.coming-soon').count(),0);assert.equal(await p.locator('[role=dialog]').count(),0);
      await post.close();
    }
    checks.push(`${lang}: prelaunch both routes; open-tab boundary; exact launch both routes replaces route and drops obsolete queries across Tokyo/Honolulu device zones`);
  }
  for(const lang of ['es','en']) {
    const {ctx,page}=await context(lang,'Asia/Tokyo','2026-10-23T05:30:00Z');
    await page.goto(`${base}/#/site/contact`);await page.locator('[data-testid=footer-whatsapp]').waitFor();
    // Simulates persisted Settings with isolated fictitious numbers and no network services.
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));const t=s.db.tenants.find(t=>t.id==='ten_hoy');t.settings={...t.settings,profile:{...t.settings.profile,whatsapp:'+1 202 555 0100',email:'studio@example.invalid'},contacts:{frontDesk:{whatsapp:'+1 202 555 0101',hours:'always'},specials:{whatsapp:'+1 202 555 0102',hours:'always'},support:{whatsapp:'+1 202 555 0103',hours:'always'}}};localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
    await page.reload();await page.locator('[data-testid=footer-whatsapp]').waitFor();
    const foot=page.locator('[data-testid=footer-whatsapp]');
    assert((await foot.innerText()).includes('+1 202 555 0101'));assert.equal(await foot.getAttribute('href'),'https://wa.me/12025550101');
    const links=page.locator('.site-main a[href^="https://wa.me/"]');
    const hrefs=await links.evaluateAll(a=>a.map(x=>x.href));
    assert.equal(hrefs.filter(h=>h.startsWith('https://wa.me/12025550101')).length,2);
    assert.equal(hrefs.filter(h=>h.startsWith('https://wa.me/12025550102')).length,1);
    assert((await links.first().innerText()).includes('+1 202 555 0101'));
    // Check the actual form button by its containing form block, independent of translated copy.
    const formButton=page.locator('.site-form button').last();assert(await formButton.isDisabled());
    await page.locator('.site-form textarea').fill('   ');assert(await formButton.isDisabled());
    await page.locator('.site-form textarea').fill('Demo & café? #1');
    await page.evaluate(()=>{window.open=(url)=>{window.__opened=String(url);return null;};});
    await formButton.click();const opened=await page.evaluate(()=>window.__opened);
    assert.equal(new URL(opened).pathname,'/12025550101');assert(new URL(opened).searchParams.get('text').includes('Demo & café? #1'));
    await capture(page,`${lang}-contact-configured`);
    for(const route of ['','/about','/classes','/modalities','/schedule','/teachers','/plans','/faq']) {
      await page.goto(`${base}/#/site${route}?video=off&motion=off`);await page.locator('.site').waitFor();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('[data-testid=footer-whatsapp]').getAttribute('href'),'https://wa.me/12025550101');
      const topic=route==='/plans'?'12025550102':route==='/faq'?'12025550103':null;
      if(topic)for(const href of await page.locator('.site-main a[href^="https://wa.me/"]').evaluateAll(a=>a.map(x=>x.href))) assert.equal(new URL(href).pathname,`/${topic}`);
      await capture(page,`${lang}-${route.slice(1)||'home'}`);
    }
    await page.locator('.faq-search input').fill('fictional-no-match-4932');
    await page.locator('.emptystate').waitFor();
    assert.equal(new URL(await page.locator('.emptystate a[href^="https://wa.me/"]').getAttribute('href')).pathname,'/12025550103');
    await capture(page,`${lang}-faq-empty`);
    // Missing topic falls back to configured front desk.
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.tenants[0].settings.contacts.specials.whatsapp='';localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
    await page.goto(`${base}/#/site/plans`);await page.reload();await page.locator('.site').waitFor();
    for(const href of await page.locator('.site-main a[href^="https://wa.me/"]').evaluateAll(a=>a.map(x=>x.href))) assert.equal(new URL(href).pathname,'/12025550101');
    checks.push(`${lang}: contact/footer exact configured front desk display and link; contact special/Plans/FAQ topic destinations; FAQ no-match support link; empty topic fallback; blank form disabled; encoded Unicode message builds direct URL only; 9 public pages translated and responsive at 390/1280`);
    await ctx.close();
  }
  assert.deepEqual(errors,[]);
  console.log(checks.join('\n'));
} finally {
  await writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,limits:['Fictional local browser Settings fixtures; external HTTP aborted. No real messages, auth, backend or location acceptance.']},null,2));
  await browser.close();
}
