import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {socialSurfaces,socialHead} from './lib/social-sharing.mjs';

const expected=process.argv[2];
assert.match(expected||'',/^[0-9a-f]{40}$/,'an exact released source SHA is required');
const base=new URL(process.env.WEBSITE_BASE_URL||'https://hoyhumanclub.com/');
assert.equal(base.search,'');assert.equal(base.hash,'');
await mkdir('qa/website-release',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];
try {
 const crawler=await browser.newContext({javaScriptEnabled:false});
 let release;
 const manifest=new URL('release.json',base);manifest.searchParams.set('source',expected);
 for(let attempt=0;attempt<12;attempt++){
  const res=await crawler.request.get(manifest.href);
  if(res.ok()){const candidate=await res.json();if(candidate.sourceCommit===expected){release=candidate;break;}}
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 assert.equal(release?.sourceCommit,expected,'live website identifies the exact released source');
 checks.push('exact source SHA');
 for(const [name,surface] of Object.entries(socialSurfaces)){
  const page=await crawler.newPage();
  const response=await page.goto(new URL(surface.path.slice(1),base).href,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  assert.equal(await page.title(),surface.title);
  const html=await response.text();assert.ok(html.includes(socialHead(surface)),name+' metadata matches checked contract');
  const image=await crawler.request.get(new URL(surface.image.slice(1),base).href);
  assert.equal(image.status(),200);assert.ok(image.headers()['content-type'].includes('image/png'));
  const png=await image.body();assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
  checks.push(name+' crawler metadata and1200x630 image');await page.close();
 }
 await crawler.close();
 for(const lang of ['es','en'])for(const dark of [false,true])for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('website/',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForURL(url=>url.origin===base.origin&&url.pathname===base.pathname&&url.hash==='#/site');
  await page.locator('.site[data-site-version="latest"]').waitFor();
  const section=page.locator('.option1-finale');await section.scrollIntoViewIfNeeded();
  const arch=section.locator('.option1-finale-arch img'),background=section.locator('.option1-finale-background');
  assert.ok((await arch.getAttribute('src')).includes('finale-red-slats-'));
  assert.ok((await background.getAttribute('src')).includes('facility-equipment-'));
  await section.evaluate(async el=>{await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));});
  const geometry=await section.evaluate(el=>{
   const image=el.querySelector('.option1-finale-arch img'),frame=image.parentElement,card=el.querySelector('.sanctuary-finale-card');
   const a=frame.getBoundingClientRect(),i=image.getBoundingClientRect(),c=card.getBoundingClientRect();
   return {natural:image.naturalWidth/image.naturalHeight,ratio:i.width/i.height,gutter:Math.abs(a.width-i.width),radius:parseFloat(getComputedStyle(frame).borderTopLeftRadius),width:a.width,overlap:Math.min(a.right,c.right)>Math.max(a.left,c.left)+1&&Math.min(a.bottom,c.bottom)>Math.max(a.top,c.top)+1,href:card.querySelector('a').getAttribute('href'),fits:[...card.querySelectorAll('p,h2,a')].every(e=>e.scrollWidth<=e.clientWidth+1)};
  });
  assert.ok(Math.abs(geometry.natural-2/3)<.002);assert.ok(Math.abs(geometry.ratio-geometry.natural)<.002);assert.ok(geometry.gutter<1);assert.ok(Math.abs(geometry.radius-geometry.width/2)<1);assert.equal(geometry.overlap,false);assert.equal(geometry.fits,true);assert.equal(geometry.href,'#/site/schedule');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const suffix=lang+'-'+(dark?'dark':'light')+'-'+width;
  await section.screenshot({path:'qa/website-release/home-option1-'+suffix+'.png'});
  await page.goto(new URL('#/site/plans',base).href,{waitUntil:'domcontentloaded'});
  await page.locator('.site-pagehead').waitFor();await page.evaluate(()=>scrollTo(0,0));
  const decoration=await page.locator('.site-pagehead').evaluate(el=>({mask:getComputedStyle(el,'::after').maskImage,pointer:getComputedStyle(el,'::after').pointerEvents}));
  assert.ok(decoration.mask.includes('radial-gradient'));assert.equal(decoration.pointer,'none');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'qa/website-release/plans-'+suffix+'.png'});
  assert.deepEqual(errors,[]);checks.push('Latest redirect,Option1 frame andPlans decoration '+suffix);await context.close();
 }
 await writeFile('qa/website-release/verified.json',JSON.stringify({base:base.href,expectedSource:expected,release,checkedAt:new Date().toISOString(),checks},null,2));
 console.log('PASS released website: exact SHA, two crawler previews, eight responsive/language/theme photo andPlans groups');
}finally{await browser.close();}
