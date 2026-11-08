import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5508';
const output=process.env.HOME_PHOTO_OUTPUT||'qa/home-photo-cards';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir(output,{recursive:true});const results=[];
try {
 for(const lang of ['es','en'])for(const width of [390,1280])for(const dark of [false,true])for(const version of ['latest','photos']){
  const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await ctx.addInitScript(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});
  const page=await ctx.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
  await page.goto(`${base}/#/site?version=${version}&motion=off&video=off`);await page.locator(`.site[data-site-version=${version}]`).waitFor();
  const cards=page.locator('.sanctuary-plan');assert.equal(await cards.count(),3);assert.equal(await page.locator('.sanctuary-plan.is-photo').count(),2);
  for(let i=0;i<2;i++){
   const card=cards.nth(i),image=card.locator('.sanctuary-plan-photo');await image.scrollIntoViewIfNeeded();await image.evaluate(e=>e.decode());
   assert((await image.getAttribute('src')).endsWith(i===0?'warrior-blue-960.webp':'pricing-duo-960.webp'));
   assert.deepEqual(await image.evaluate(e=>{const s=getComputedStyle(e);return [s.opacity,s.objectFit,s.pointerEvents];}),['1','cover','none']);
   assert.deepEqual(await card.evaluate(e=>{const s=getComputedStyle(e);return [s.position,s.isolation,s.overflow];}),['relative','isolate','hidden']);
   assert.equal(await card.locator('h3').evaluate(e=>getComputedStyle(e).color),'rgb(251, 247, 239)');
   assert((await card.evaluate(e=>getComputedStyle(e,'::before').backgroundImage)).includes('linear-gradient'));
   assert((await card.getAttribute('href')).includes('/site/plans'));
  }
  assert.equal(await cards.first().locator('h3').innerText(),lang==='es'?'Para empezar':'To begin');
  for(const [i,price] of [[0,'35000'],[1,'600000'],[2,'250000']])assert((await cards.nth(i).locator('.sanctuary-price').innerText()).replace(/[^0-9]/g,'').startsWith(price));
  assert.equal(await cards.nth(2).locator('img').count(),0);assert(!(await cards.nth(2).getAttribute('class')).includes('is-photo'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  const file=`home-${lang}-${width}-${dark?'dark':'light'}-${version}.jpg`;await page.locator('.sanctuary-plan-grid').screenshot({path:`${output}/${file}`});results.push({lang,width,dark,version,file});
  await cards.first().click();await page.waitForURL(u=>u.hash.includes('/site/plans'));await page.goBack();await cards.first().waitFor();await ctx.close();
 }
 // Exercise the existing ready-photo contract only in the local review build.
 const page=await browser.newPage();await page.goto(`${base}/#/site?motion=off&video=off`);await page.locator('.sanctuary-plan').first().waitFor();
 const unchanged=await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));const before=JSON.stringify(Object.fromEntries(Object.entries(state.db).filter(([key])=>/product|price|payment|ledger|membership/.test(key))));for(const [id,name] of [['trial','facility-equipment'],['pack12','hero-group']]){const slot=state.db.media_assets.find(a=>a.slot_key===`site.plans.${id}`);if(!slot)throw Error('missing existing editorial slot');slot.status='ready';slot.url=`./images/studio-2026/${name}-960.webp`;}localStorage.setItem('hoyos.db.v1',JSON.stringify(state));return before;});
 await page.reload();await page.locator('.sanctuary-plan-photo').first().waitFor();
 for(const [index,name] of [[0,'facility-equipment'],[1,'hero-group']]){const image=page.locator('.sanctuary-plan-photo').nth(index);await image.scrollIntoViewIfNeeded();assert((await image.getAttribute('src')).includes(`${name}-960`),'each card reads its own CMS slot');assert.equal(await image.getAttribute('srcset'),null);await image.evaluate(e=>e.decode());}
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));for(const id of ['trial','pack12'])state.db.media_assets.find(a=>a.slot_key===`site.plans.${id}`).status='pending';localStorage.setItem('hoyos.db.v1',JSON.stringify(state));});
 await page.reload();await page.locator('.sanctuary-plan-photo').first().waitFor();assert((await page.locator('.sanctuary-plan-photo').first().getAttribute('src')).includes('warrior-blue-960'));assert((await page.locator('.sanctuary-plan-photo').nth(1).getAttribute('src')).includes('pricing-duo-960'));
 assert.equal(await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;return JSON.stringify(Object.fromEntries(Object.entries(db).filter(([key])=>/product|price|payment|ledger|membership/.test(key))));}),unchanged);
 for(const version of ['classic','archive']){await page.goto(`${base}/#/site?version=${version}&motion=off&video=off`);await page.locator(`.site[data-site-version=${version}]`).waitFor();assert.equal(await page.locator('.sanctuary-plan.is-photo').count(),0);}
 await page.close();await writeFile(`${output}/results.json`,JSON.stringify({passed:true,checkedAt:new Date().toISOString(),groups:results.length,historical:2,cmsReadyAndPending:true,results},null,2));console.log('PASS16 Home ES/EN390/1280light/darkLatest/Photos groups; navigation, images,prices,CMS precedence and historical boundaries');
}finally{await browser.close();}
