import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('qa/finale',{recursive:true});
const overflows=[];
try {
 for(const width of [390,773,901,1280]) for(const lang of ['es','en']) {
 const page=await browser.newPage({viewport:{width,height:1000}});
 await page.addInitScript(lang=>localStorage.setItem('hoyos.lang',lang),lang);
 await page.goto(`${process.env.QA_BASE||'http://127.0.0.1:5510'}/#/site?motion=off&video=off&lang=${lang}`);
 if(width===901) { await page.locator('.site-burger').click(); assert(await page.locator('.site-nav.is-open').isVisible(),'tablet menu remains reachable'); await page.screenshot({path:`qa/finale/menu-${lang}-${width}.png`}); await page.locator('.site-burger').click(); }
 const finale=page.locator('.option1-finale'); await finale.waitFor(); await finale.scrollIntoViewIfNeeded(); assert.equal(await page.locator('html').getAttribute('lang'),lang);
 const img=finale.locator('img'); await img.evaluate(e=>e.decode());
 assert((await img.getAttribute('src')).endsWith('finale-rings-reconstructed.png'));
 await finale.screenshot({path:`qa/finale/${lang}-${width}.png`});
 const b=await img.boundingBox(), c=await finale.locator('.sanctuary-finale-card').boundingBox();
 assert(Math.abs(b.width/b.height-1374/1145)<.02,'artwork aspect ratio preserved');
 assert.equal(await page.locator('.option1-finale-portraits').evaluate(e=>getComputedStyle(e,'::after').opacity),'0.2');
 if(width<=900) assert(c.y>=b.y+b.height,'mobile CTA must not cover portraits');
 else assert(c.y>=b.y+b.height*.51,'desktop CTA must clear ring and face');
 if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)) overflows.push({width,lang,elements:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(e).visibility!=='hidden';}).slice(0,25).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})))});
 await finale.screenshot({path:`qa/finale/${lang}-${width}.png`}); await page.close();
 }
 assert.deepEqual(overflows,[],'horizontal overflow diagnostics');
 console.log('PASS finale responsive ES/EN matrix, image loaded, 20% overlay, full portraits, mobile CTA below');
} finally {await browser.close();}
