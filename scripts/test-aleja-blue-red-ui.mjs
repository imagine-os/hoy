import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.QA_BASE||'http://127.0.0.1:4173';
const baseline=process.env.QA_BASELINE;
const output='qa/aleja-blue-red';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[], errors=[];
const routes=['','about','classes','classes/fuego','classes/hibrido','modalities','schedule','teachers','plans','faq','contact'];
async function open(page,origin,route,lang,theme) {
  await page.goto(origin);
  await page.evaluate(({lang,theme})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'}));localStorage.setItem('hoy.site.motion','off');},{lang,theme});
  await page.goto(`${origin}/#/site${route?'/'+route:''}`);await page.reload();
  await page.locator('.site').waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.site img')].map(async i=>{i.loading='eager';try{await i.decode();}catch{}}));});
}
async function content(page) {
  return page.locator('.site-main').evaluate(el=>({text:el.innerText.replace(/\s+/g,' ').trim(),links:[...el.querySelectorAll('a')].map(a=>({text:a.textContent.replace(/\s+/g,' ').trim(),href:a.getAttribute('href')}))}));
}
try {
  for(const width of [390,768,1024,1280]) for(const lang of ['es','en']) for(const theme of ['light','dark']) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const before=baseline?await context.newPage():null;
    for(const route of routes) {
      const name=`${lang}-${width}-${theme}-${route.replaceAll('/','-')||'home'}`;
      await open(page,base,route,lang,theme);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: no horizontal overflow`);
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      const colors=await page.locator('.site').evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,text:s.color};});
      assert.equal(colors.bg,theme==='dark'?'rgb(28, 48, 72)':'rgb(44, 72, 101)',`${name}: correct blue surface`);
      assert.equal(colors.text,'rgb(241, 231, 210)',`${name}: cream text`);
      const contrast=await page.locator('.chip-tone').evaluateAll(els=>{
        const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d');
        const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
        const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
        return els.map(el=>{const s=getComputedStyle(el),a=luminance(rgb(s.color)),b=luminance(rgb(s.backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
      });
      assert(contrast.every(r=>r>=4.5),`${name}: all tone-chip text meets 4.5:1`);
      const badgeContrast=await page.locator('.badge').evaluateAll(els=>{
        const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d');
        const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
        const pixel=()=>[...ctx.getImageData(0,0,1,1).data].slice(0,3);
        return els.map(el=>{const chain=[];for(let e=el;e;e=e.parentElement)chain.unshift(e);ctx.clearRect(0,0,1,1);for(const e of chain){ctx.fillStyle=getComputedStyle(e).backgroundColor;ctx.fillRect(0,0,1,1);}const b=luminance(pixel());ctx.clearRect(0,0,1,1);ctx.fillStyle=getComputedStyle(el).color;ctx.fillRect(0,0,1,1);const a=luminance(pixel());return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
      });
      assert(badgeContrast.every(r=>r>=4.5),`${name}: badge text meets 4.5:1 over composited surfaces`);
      if(before) {await open(before,baseline,route,lang,theme);assert.deepEqual(await content(page),await content(before),`${name}: visible copy, prices and links preserved`);}
      const photos=page.locator('.private-class-photo');
      if(route===''||route==='plans') {
        assert.equal(await photos.count(),1,`${name}: supplied private photo present`);
        const geometry=await photos.evaluate(i=>({loaded:i.complete&&i.naturalWidth>0,src:i.currentSrc,ratio:i.clientWidth/i.clientHeight,native:i.naturalWidth/i.naturalHeight}));
        assert(geometry.loaded);assert.match(geometry.src,/private-acroyoga/);assert(Math.abs(geometry.ratio-geometry.native)<.006,`${name}: complete photo proportions`);
        assert(await page.locator('.sanctuary-plan-copy,.plans-private-copy').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1)),`${name}: private card copy fits`);
        assert(await page.locator('.has-private-photo,.plans-private-with-photo').evaluateAll(cards=>cards.every(card=>{const r=card.getBoundingClientRect();return [...card.querySelectorAll('.private-class-photo,.sanctuary-plan-copy,.plans-private-copy')].every(child=>{const c=child.getBoundingClientRect();return c.left>=r.left-1&&c.right<=r.right+1&&c.top>=r.top-1&&c.bottom<=r.bottom+1;});})),`${name}: private photo/copy stay within their card`);
        await photos.screenshot({path:`${output}/${name}-private-photo.jpg`});
      }
      await page.screenshot({path:`${output}/${name}.jpg`,fullPage:true});
      if(!route) for(const [section,selector] of [['plans','.sanctuary-plans'],['teachers','.sanctuary-teachers'],['finale','.sanctuary-finale']]) await page.locator(selector).screenshot({path:`${output}/${name}-${section}.jpg`});
      results.push({name,colors,copyCompared:!!before,passed:true});
    }
    // Navigation remains usable at mobile widths, without submitting any booking/payment.
    await open(page,base,'',lang,theme);
    if(width===390){await page.locator('.site-burger').click();assert(await page.locator('.site-nav').isVisible());await page.locator('.site-nav a[href*="schedule"]').click();assert.match(page.url(),/site\/schedule/);}
    await context.close();
  }
  // History is a separate skin: the new palette and new private image do not enter Classic.
  const legacy=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  await legacy.goto(`${base}/#/site?version=classic`);await legacy.locator('.site').waitFor();
  assert.equal(await legacy.locator('.site').getAttribute('data-site-version'),'classic');
  assert.equal(await legacy.locator('.private-class-photo').count(),0);
  const cms=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  await open(cms,base,'plans','es','light');
  const financialBefore=await cms.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));
    const financial=JSON.stringify(Object.fromEntries(Object.entries(state.db).filter(([key])=>/product|price|payment|ledger|membership|booking/.test(key))));
    const slot=state.db.media_assets.find(row=>row.slot_key==='site.plans.private');assertSlot(slot);
    function assertSlot(s){if(!s)throw Error('Missing private photo slot');}
    Object.assign(slot,{status:'ready',url:'./images/studio-2026/hero-group-960.webp',alt:{es:'Foto privada de prueba',en:'Private fixture photo'}});
    localStorage.setItem('hoyos.db.v1',JSON.stringify(state));return financial;
  });
  for(const lang of ['es','en']) for(const version of ['latest','photos']) for(const route of ['','plans']) {
    await open(cms,base,`${route}${version==='photos'?'?version=photos':''}`,lang,'light');
    assert.match(await cms.locator('.private-class-photo').getAttribute('src'),/hero-group-960/);
    assert.equal(await cms.locator('.private-class-photo').getAttribute('alt'),lang==='es'?'Foto privada de prueba':'Private fixture photo');
    assert.equal(await cms.locator('.private-class-photo').getAttribute('srcset'),null);
  }
  await cms.evaluate(()=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));state.db.media_assets.find(row=>row.slot_key==='site.plans.private').status='pending';localStorage.setItem('hoyos.db.v1',JSON.stringify(state));});
  for(const route of ['','plans']) {
    await open(cms,base,route,'es','light');assert.match(await cms.locator('.private-class-photo').getAttribute('src'),/private-acroyoga/);
    assert(await cms.locator('.private-class-photo').getAttribute('srcset'),'responsive supplied fallback');
  }
  assert.equal(await cms.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;return JSON.stringify(Object.fromEntries(Object.entries(db).filter(([key])=>/product|price|payment|ledger|membership|booking/.test(key))));}),financialBefore,'fictional CMS test preserves financial and booking data');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`PASS ${results.length} public route/locale/viewport/theme cases; baseline copy/price/link comparisons, full private photo, mobile navigation, Classic boundary; no writes`);
} finally {await writeFile(`${output}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
