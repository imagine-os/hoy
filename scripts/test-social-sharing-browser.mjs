import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {socialSurfaces} from './lib/social-sharing.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:4179/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('evidence',{recursive:true});
try {
 const crawler=await browser.newContext({javaScriptEnabled:false});
 for(const surface of Object.values(socialSurfaces)) {
  const page=await crawler.newPage();const response=await page.goto(new URL(surface.path.slice(1),base).href);assert.equal(response.status(),200);
  assert.equal(await page.title(),surface.title);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://hoyhumanclub.com'+surface.image);
  const image=await page.request.get(new URL(surface.image.slice(1),base).href);assert.equal(image.status(),200);assert.ok(image.headers()['content-type'].includes('image/png'));await page.close();
 }
 await crawler.close();
 for(const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:844}});await page.goto(new URL('website/',base).href);await page.waitForURL('**/#/site');
  await page.locator('.site').waitFor();
  for(const route of ['plans','teachers','about']) {
   await page.goto(new URL('#/site/'+route,base).href);
   const heading=page.locator('.site-pagehead');await heading.waitFor();
   const state=await heading.evaluate(el=>({mask:getComputedStyle(el,'::after').maskImage,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.ok(state.mask.includes('radial-gradient'),route);assert.equal(state.overflow,false,route);
   await page.screenshot({path:`evidence/${route}-${width}.png`});
  }
  await page.close();
 }
 console.log('PASS emitted-site crawler metadata/assets, static-entry redirect, and six shared-heading route/viewport checks');
}finally{await browser.close()}
