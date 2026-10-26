import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5196';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1218,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const expected=['ligereza','hibrido','fuego','solido','centro','alineacion','pulso'];
const matrix=[['es',390,false],['en',390,true],['es',768,false],['en',768,true],['es',1218,false],['en',1218,true],['es',1280,false],['en',1280,true]];
const plansPrice=async()=>({packages:await page.locator('.package-price strong').allTextContents(),passes:await page.locator('.plans-pass-price').allTextContents()});
async function decode(){await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));const nodes=[...document.querySelectorAll('.source-practice,.source-practice .classarch-arch')];for(const node of nodes){for(const m of getComputedStyle(node).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)){const img=new Image();img.src=m[1];await img.decode();}}});}
async function open(path,version='latest'){await page.goto(`${base}/#/site${path}${version==='latest'?'':`?version=${version}`}`);await page.reload();await page.locator(`.site[data-site-version=${version}]`).waitFor();await decode();}
try{
 await mkdir('qa/home-photography',{recursive:true});await page.goto(base);
 // Simulate a valid pre-release same-day cache. Production loading, not the fixture, must add the slots.
 const oldRows=await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));
  const addedKeys=['site.home.philosophy','site.plans.pack12','site.plans.pack12_smtc','site.plans.trial','site.plans.single'];
  state.db.media_assets=state.db.media_assets.filter(r=>!addedKeys.includes(r.slot_key));
  localStorage.setItem('hoyos.db.v1',JSON.stringify(state));
  localStorage.setItem('hoyos.lang','en');
  return state.db.media_assets;
 });
 await page.goto(`${base}/#/admin/content/media`);await page.reload();await page.locator('.media-library').waitFor();
 await page.getByRole('button',{name:'Placements & briefs'}).click();await page.locator('.adm-media').waitFor();
 for(const key of ['site.home.philosophy','site.plans.pack12','site.plans.pack12_smtc','site.plans.trial','site.plans.single'])assert.equal(await page.locator('.adm-media .card .mono').filter({hasText:new RegExp('^'+key.replaceAll('.','\\.')+'$')}).count(),1,`upgraded checklist exposes ${key}`);
 const upgradedRows=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.media_assets);
 assert.equal(upgradedRows.length,oldRows.length+5);for(const row of oldRows)assert.deepEqual(upgradedRows.find(r=>r.id===row.id),row);
 await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.media_assets),upgradedRows,'browser reload does not duplicate or reset slots');
 for(const [lang,width,dark] of matrix)for(const version of ['latest','photos'])for(const path of ['','/plans']){
  await page.evaluate(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});await page.setViewportSize({width,height:1000});await open(path,version);
  assert.deepEqual(await page.evaluate(()=>({lang:document.documentElement.lang,theme:document.documentElement.dataset.theme})),{lang,theme:dark?'dark':'light'});
  if(path===''){
   assert((await page.locator('.source-philosophy-photo').getAttribute('src')).endsWith('/images/sanctuary/mountains.webp'));
   assert((await page.locator('.source-practice').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('practice-background-1280'));
   const blue=await page.locator('.source-practice').evaluate(async el=>{const url=[...getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)][0][1];const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=16;c.height=16;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,16,16);const p=ctx.getImageData(0,0,16,16).data;let r=0,b=0;for(let i=0;i<p.length;i+=4){r+=p[i];b+=p[i+2];}return b/256>r/256+15;});assert(blue,'practice background is the selected blue composition, not its cream variant');
   const cards=page.locator('.source-practice .classarch-arch');assert.equal(await cards.count(),7);
   for(let i=0;i<expected.length;i++){assert((await cards.nth(i).evaluate(e=>getComputedStyle(e).backgroundImage)).includes(`practice-${expected[i]}-960.webp`));assert(await cards.nth(i).evaluate(e=>e.classList.contains('natural-photo')));}
   assert.equal(await page.locator('.photo-preview-notice').count(),version==='photos'?1:0,'edition default is unchanged');
   if(version==='latest')assert((await page.locator('.sanctuary-finale-scene img').getAttribute('src')).includes('studio-medellin'),'bottom choice stays held');
   else assert((await page.locator('.photo-finale-image').getAttribute('src')).includes('facility-studio-960.webp'),'Photos bottom remains unchanged');
  }else{
   assert((await page.locator('.package-card').nth(0).locator('img.package-photo').getAttribute('src')).includes('pricing-duo-960.webp'));
   assert.equal(await page.locator('.package-card').nth(1).locator('img.package-photo').count(),0,'unmatched affiliate original remains held');
   for(const [index,name] of [[0,'trial'],[1,'single']])assert((await page.locator('.plans-pass').nth(index).locator('img').getAttribute('src')).includes(`plan-${name}-960.webp`));
   const prices=await plansPrice();assert.deepEqual(prices.packages.map(t=>t.replace(/\D/g,'')),['600000','480000']);assert.deepEqual(prices.passes.map(t=>t.replace(/\D/g,'')),['35000','55000']);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} ${width} no overflow`);
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);await page.setViewportSize({width,height});await decode();await page.screenshot({path:`qa/home-photography/${path?'plans':'home'}-${version}-${lang}-${width}${dark?'-dark':''}.jpg`,fullPage:true});
 }
 const original=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 try{
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));const c=document.createElement('canvas');c.width=80;c.height=80;c.getContext('2d').fillRect(0,0,80,80);const url=c.toDataURL();for(const key of ['site.home.philosophy','site.classes.fuego','site.plans.pack12','site.plans.trial']){const row=state.db.media_assets.find(r=>r.slot_key===key);if(!row)throw Error(`Missing production slot: ${key}`);Object.assign(row,{kind:'photo',status:'ready',url,alt:{es:'Foto QA',en:'QA photo'}});}localStorage.setItem('hoyos.db.v1',JSON.stringify(state));});
  for(const version of ['latest','photos']){
   await page.setViewportSize({width:1218,height:1000});await open('',version);assert((await page.locator('.source-philosophy-photo').getAttribute('src')).startsWith('data:image/png'));
   assert((await page.locator('.source-practice .classarch-arch').nth(2).evaluate(e=>e.style.backgroundImage)).includes('data:image/png'));assert.equal(await page.locator('.source-practice .classarch-arch').nth(2).evaluate(e=>e.classList.contains('natural-photo')),false,'CMS keeps existing class crop');
   await open('/plans',version);assert((await page.locator('.package-photo').getAttribute('src')).startsWith('data:image/png'));assert((await page.locator('.plans-pass-photo').first().getAttribute('src')).startsWith('data:image/png'));assert.equal((await plansPrice()).packages[0].replace(/\D/g,''),'600000');
  }
 }finally{await page.evaluate(db=>localStorage.setItem('hoyos.db.v1',db),original);}
 await open('','classic');assert.equal(await page.locator('.source-practice,.source-philosophy-photo').count(),0);await open('/plans','classic');assert.equal(await page.locator('.package-photo,.plans-pass-photo').count(),0,'Classic remains unchanged');
 assert.deepEqual(errors,[]);await writeFile('qa/home-photography/results.json',JSON.stringify({passed:true,captures:32,widths:[390,768,1218,1280],checks:['old same-day cache upgrades actual CMS checklist','existing CMS rows preserved and reload idempotent','override fixtures never create missing rows','exact seven practice selections','mountain and blue background','three verified plan selections','held fourth plan source and bottom choice','prices preserved','ready CMS overrides after reload','CMS class crop preserved','Classic/edition defaults preserved','ES/EN light/dark','decoded assets','no overflow','no page errors']},null,2));console.log('Home and plans photography UI passed:32 captures and CMS/price/hold checks');
}finally{await browser.close();}
