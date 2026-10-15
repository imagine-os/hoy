import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.QA_BASE||'http://127.0.0.1:5187';
await mkdir('docs/screenshots/M-02d',{recursive:true});
try {
 await page.goto(`${base}/#/admin/content/media`);await page.locator('.media-library').waitFor();
 for(const lang of ['es','en'])for(const theme of ['light','dark'])for(const width of [390,1280]){
  await page.evaluate(({lang,theme})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'}));},{lang,theme});
  await page.setViewportSize({width,height:1000});await page.reload();await page.locator('.media-library-grid img').first().waitFor();await page.waitForTimeout(300);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang}/${theme}/${width} overflow`);
  await page.screenshot({path:`docs/screenshots/M-02d/library-${lang}-${theme}-${width}.png`,fullPage:false});
 }
 await page.getByLabel('Search name, tag or placement').fill('teacher leandro');assert.equal(await page.locator('.media-library-grid>.card').count(),1);
 await page.locator('.media-library summary').click();assert(await page.locator('.media-library-use a[href*="version=photos"]').count()>0);
 await page.getByLabel('Usage status').selectOption('live');assert.equal(await page.locator('.media-library-grid>.card').count(),0);
 await page.getByRole('button',{name:'Reset filters'}).first().click();await page.getByLabel('Source',{exact:true}).selectOption('studio');assert.equal(await page.locator('.media-library-grid>.card').count(),14);
 await page.getByLabel('Search name, tag or placement').fill('no-matching-file');assert.equal(await page.locator('.media-library-grid>.card').count(),0);
 await page.getByRole('button',{name:'Placements & briefs'}).click();await page.locator('.adm-media').waitFor();assert(await page.locator('.adm-media>.card').count()>0);
 const check=await page.evaluate(async()=>{
  const {buildMediaLibrary,assetStates}=await import('/src/data/mediaLibrary.ts');
  const base={id:'test',tenant_id:'hoy',created_at:'2026-10-15',updated_at:'2026-10-15'};
  const slot={...base,slot_key:'site.classes.pulso',kind:'photo',ratio:'3 / 4',label:{es:'Pulso',en:'Pulso'},alt:{es:'Barra',en:'Barre'},brief:{es:'',en:''},tone:null,url:'https://example.test/shared.jpg',credit:null,status:'ready',sort:0};
  const teacher={...base,id:'tea_leandro',display_name:'Leandro',active:false,photo_url:'https://example.test/shared.jpg'};
  const assets=buildMediaLibrary([slot],[teacher],[{...base,slug:'pulso',active:true}]);const a=assets.find(a=>a.url===slot.url);
  const draft=buildMediaLibrary([{...slot,status:'pending'}],[],[]).find(a=>a.url===slot.url);
  const blocked=buildMediaLibrary([{...slot,url:'javascript:alert(1)'}],[],[]);
  return {states:assetStates(a),uses:a.usages.length,draft:assetStates(draft),blocked:blocked.some(a=>a.url.startsWith('javascript:')),fallback:assets.find(a=>a.id.includes('teacher-leandro')).usages.map(u=>u.state)};
 });
 assert.deepEqual(check.states.sort(),['inactive','live']);assert.equal(check.uses,5);assert.deepEqual(check.draft,['draft']);assert.equal(check.blocked,false);assert(check.fallback.every(s=>s==='inactive'));
 assert.deepEqual(errors,[]);await writeFile('docs/screenshots/M-02d/media-qa.json',JSON.stringify({passed:true,captures:8,checks:['search','filter','empty state','slot editor preserved','per-usage mixed states','teacher fallback deactivation','unsafe URLs excluded','ES/EN and themes','no overflow','no runtime errors']},null,2));console.log('Media library QA passed');
}finally{await browser.close();}
