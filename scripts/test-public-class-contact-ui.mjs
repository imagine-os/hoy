import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5510';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('qa/public-class-contact',{recursive:true});
try {
 for(const width of [390,773,1280]) {
 const page=await browser.newPage({viewport:{width,height:1000}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['classes/ligereza','classes','contact']) {
 await page.goto(`${base}/#/site/${route}?motion=off&video=off`);await page.locator('.site').waitFor();
 if(route.startsWith('classes')){await page.locator('.classarch-arch.has-photo').first().waitFor();assert(await page.locator('.classarch-arch.natural-photo').count()>=7);}
 else {
 await page.locator('input[type=tel]').fill('+44 7700 900123');await page.locator('textarea').fill('Test message');
 await page.evaluate(()=>{window.open=(url)=>{window.__testOpened=url;return null;};});
 await page.locator('.site-form button').click(); const url=await page.evaluate(()=>window.__testOpened);
 assert(url.startsWith('https://wa.me/573127765000?text='));assert(decodeURIComponent(url).includes('+44 7700 900123'));
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${route} overflow`);
 await page.screenshot({path:`qa/public-class-contact/${route.replace('/','-')}-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS 390/773/1280 class detail/catalog/contact, international number handoff intercepted, no overflow');
}finally{await browser.close();}
