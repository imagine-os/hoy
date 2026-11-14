import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({reducedMotion:'reduce'});
const base=process.env.QA_BASE||'http://127.0.0.1:4173';
const results=[];
await mkdir('qa/public-image-frames',{recursive:true});
try {
 for(const width of [390,768,1218,1440]) for(const theme of ['light','dark']) {
  await page.setViewportSize({width,height:1000});
  await page.goto(base);
  await page.evaluate(theme=>localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'})),theme);
  await page.goto(`${base}/#/site/teachers`);await page.reload();
  await page.locator('.site-teacher img').first().waitFor();
  await page.locator('.site-teacher img').evaluateAll(async imgs=>{for(const i of imgs)i.loading='eager';await Promise.all(imgs.map(i=>i.decode()));});
  const frames=await page.locator('.site-teacher .mediaslot,.site-teacher-monogram').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),i=e.querySelector('img'),s=i&&getComputedStyle(i);return {w:r.width,h:r.height,placeholder:e.classList.contains('site-teacher-monogram'),image:i&&{w:i.clientWidth,h:i.clientHeight,fit:s.objectFit}}}));
  assert(frames.some(f=>f.placeholder),'fixture includes missing photo');
  for(const f of frames){assert(Math.abs(f.w/f.h-2/3)<.003,'every portrait and placeholder has same ratio');if(f.image){assert.equal(f.image.fit,'cover');assert(Math.abs(f.image.w-f.w)<2&&Math.abs(f.image.h-f.h)<2,'photo fills entire frame');}}
  await page.screenshot({path:`qa/public-image-frames/teachers-${width}-${theme}.jpg`,fullPage:true});
  for(const route of ['classes','classes/fuego','classes/hibrido']) {
   await page.goto(`${base}/#/site/${route}`);await page.locator('.classarch-arch.has-photo').first().waitFor();
   await page.locator('.classarch-arch.has-photo').evaluateAll(async els=>Promise.all(els.map(async e=>{const url=getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(url){const i=new Image();i.src=url;await i.decode();}})));
   const arches=await page.locator('.classarch-arch.has-photo').evaluateAll(els=>els.map(e=>({size:getComputedStyle(e).backgroundSize,position:getComputedStyle(e).backgroundPosition,ratio:e.clientWidth/e.clientHeight})));
   for(const a of arches){assert.equal(a.size,'cover','class photo fills arch without side gutters');assert(Math.abs(a.ratio-2/3)<.01,'studio class photo keeps full portrait proportions');}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
   await page.screenshot({path:`qa/public-image-frames/${route.replace('/','-')}-${width}-${theme}.jpg`,fullPage:true});
  }
  results.push({width,theme,passed:true});
 }
 await writeFile('qa/public-image-frames/results.json',JSON.stringify(results,null,2));
} finally {await browser.close();}
