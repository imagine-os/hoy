import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5185';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}), errors=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir('qa/photos',{recursive:true});
try {
 for(const [lang,width,dark] of [['es',390,false],['es',768,false],['es',1280,false],['en',390,false],['en',768,false],['en',1280,false],['es',1280,true],['en',1280,true]]) for(const path of ['','/about','/teachers','/plans','/schedule']) {
  await page.goto(`${base}/#/site?version=photos`);await page.evaluate(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});await page.setViewportSize({width,height:1000});await page.goto(`${base}/#/site${path}?version=photos`);await page.reload();await page.locator('.site[data-site-version=photos]').waitFor();
  await page.waitForTimeout(500);
  await page.evaluate(async()=>{for(const im of document.images){im.loading='eager';}await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  for(const img of await page.locator('img[src*="studio-2026"]').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(async i=>{await i.decode();}); await page.waitForTimeout(80); }
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} ${width} overflow`);
  const images=await page.locator('img[src*="studio-2026"]').evaluateAll(ims=>ims.map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0,alt:i.alt})));
  assert(images.length>0,`${path} has photos`);assert(images.every(i=>i.loaded),JSON.stringify(images));
  if(path === '' || path === '/teachers') {
    const rows=page.locator(path === '' ? '.sanctuary-teacher-link' : '.site-teacher');
    for(const [name,asset] of [['Andre Cardona','teacher-andre-cardona'],['Clara Zuluaga','teacher-clara'],['Raghu','teacher-raghu'],['Leandro Valencia','teacher-leandro']]) {
      const row=rows.filter({has:page.getByRole('heading',{name,exact:true})});
      assert((await row.locator('img').getAttribute('src')).includes(`${asset}-960.webp`),`${name} uses the annotated selection`);
    }
    for(const name of ['Andrea','Jennifer Varela']) assert.equal(await rows.filter({has:page.getByRole('heading',{name,exact:true})}).locator('img').count(),0,`${name} remains pending`);
    if(path === '') assert((await page.locator('.photo-community').getAttribute('src')).includes('hero-group-960.webp'),'teacher sidebar uses the selected group');
  }
  if(path === '') {
    for(const cls of ['.photo-hero-image','.photo-finale-image']) {
      const box=await page.locator(cls).boundingBox();assert(box && box.width>200 && box.height>150,`${cls} has visible area`);
      const parent=await page.locator(cls).evaluate(i=>{const r=i.parentElement.getBoundingClientRect();const c=i.getBoundingClientRect();return {top:c.top-r.top,bottom:c.bottom-r.bottom};});assert(parent.top>=-1 && parent.bottom<=1,`${cls} stays inside its section: ${JSON.stringify(parent)}`);
    }
  }
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('video').count(),0,'no old concept video in photo preview');
  console.log('Photo geometry',lang,width,path,await page.locator('img[src*="studio-2026"]').evaluateAll(ims=>ims.map(i=>({class:i.className,src:i.currentSrc,w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height}))));
  // Full-height viewport avoids Chromium's offscreen image raster eviction in fullPage capture.
  const captureHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  await page.setViewportSize({width,height:captureHeight});
  await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  await page.waitForTimeout(300);
  await page.screenshot({path:`qa/photos/${path.slice(1)||'home'}-${lang}-${width}${dark?'-dark':''}.jpg`,fullPage:true});
 }
 await page.goto(`${base}/#/site?version=photos`);await page.locator('.photo-hero-image').waitFor();
 await page.locator('.sanctuary-hero-copy a[href*="schedule"]').click();await page.locator('.session-calendar').waitFor();assert(page.url().includes('version=photos'));
 await page.goBack();await page.locator('.photo-hero-image').waitFor();
 await page.locator('.site-actions select').selectOption('latest');await page.locator('.site[data-site-version=latest]').waitFor();assert.equal(await page.locator('.photo-hero-image').count(),1);assert((await page.locator('.photo-hero-image').getAttribute('src')).includes('facility-red-studio-1600.webp'));
 await page.locator('.site-actions select').selectOption('photos');await page.locator('.photo-hero-image').waitFor();
 await page.reload();await page.locator('.photo-hero-image').waitFor();
 await page.goto(`${base}/#/site`);await page.locator('.site[data-site-version=latest]').waitFor();
 // An explicit CMS photo must win on both teacher surfaces, even in Latest.
 const originalDb=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 const override=new URL('images/studio-2026/heater-blue-480.webp',`${base}/`).href;
 try {
  await page.evaluate(url=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));state.db.teachers.find(t=>t.id==='tea_clara').photo_url=url;localStorage.setItem('hoyos.db.v1',JSON.stringify(state));},override);
  for(const version of ['photos','latest']) for(const path of ['','/teachers']) {
    await page.goto(`${base}/#/site${path}?version=${version}`);await page.reload();
    const row=page.locator(path === '' ? '.sanctuary-teacher-link' : '.site-teacher').filter({has:page.getByRole('heading',{name:'Clara Zuluaga',exact:true})});
    await row.waitFor();assert.equal(await row.locator('img').getAttribute('src'),override,'CMS override survives reload and wins over fallback');
  }
 } finally {await page.evaluate(db=>localStorage.setItem('hoyos.db.v1',db),originalDb);}
 assert.deepEqual(errors,[]);
 await writeFile('qa/photos/results.json',JSON.stringify({passed:true,captures:40,widths:[390,768,1280],checks:['images decoded','annotated teacher and group selections','unassigned Andrea and Jennifer','CMS override on both pages and editions after reload','no overflow','no concept videos','version navigation and Back','reload','Latest default unchanged','no page errors']}));
 console.log('Photo preview QA passed, 40 bilingual desktop/tablet/mobile and dark captures');
} finally { await browser.close(); }
