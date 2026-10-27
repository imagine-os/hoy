import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';

const base=new URL(process.env.WEBSITE_BASE_URL||'http://127.0.0.1:5490/');
const expected=process.argv[2];assert.match(expected||'',/^[a-f0-9]{40}$/);
const output=process.env.CURSOR_OUTPUT||'qa/website-native-cursor';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];let active;
async function native(page,label){
  const brand=page.locator('.site-brand');
  if(await brand.count())await brand.hover();
  else await page.mouse.move(80,180);
  const state=await page.evaluate(()=>({overlays:document.querySelectorAll('.element-cursor,.element-cursor-dot,.element-cursor-ring').length,active:document.documentElement.classList.contains('element-cursor-active'),body:getComputedStyle(document.body).cursor}));
  assert.equal(state.overlays,0,label+': decorative cursor nodes removed');
  assert.equal(state.active,false,label+': native cursor never hidden');
  assert.notEqual(state.body,'none');assert.ok(!state.body.includes('url('));
  for(const selector of ['.site-brand','.site-nav a:visible','.site-actions button:visible','.coming-soon-login']){
    const control=page.locator(selector).first();if(await control.count())assert.equal(await control.evaluate(el=>getComputedStyle(el).cursor),'pointer',label+': '+selector);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  results.push({label,...state});
}
try{
  const check=await browser.newContext();const response=await check.request.get(new URL('release.json?cursor='+expected,base).href);assert.equal(response.status(),200);assert.equal((await response.json()).sourceCommit,expected);await check.close();
  for(const [lang,dark]of [['es',false],['en',true]]){
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
    await context.addInitScript(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});
    const page=active=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.locator('a').first().waitFor();await native(page,lang+' landing');
    await page.goto(new URL('website/',base).href,{waitUntil:'domcontentloaded'});await page.waitForURL(url=>url.hash==='#/site');await page.locator('.site[data-site-version="latest"]').waitFor();await native(page,lang+' Latest entry');
    await page.screenshot({path:output+'/latest-'+lang+'.png'});
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(()=>{const el=document.activeElement,s=el&&getComputedStyle(el);return el&&el!==document.body&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=1;}),'keyboard focus remains visible');
    await page.locator('.site-nav a[href*="/site/plans"]').click();await page.locator('.site-pagehead').waitFor();await native(page,lang+' link navigation');
    await page.goBack();await page.waitForURL(url=>url.hash==='#/site');await page.locator('.site[data-site-version="latest"]').waitFor();await native(page,lang+' browser back');
    for(const version of ['latest','photos','classic','archive']){
      await page.goto(new URL('#/site/teachers?version='+version+'&motion=on',base).href,{waitUntil:'domcontentloaded'});await page.locator('.site[data-site-version="'+version+'"]').waitFor();await native(page,lang+' '+version+' teachers');
    }
    await page.goto(new URL('#/site/contact?motion=on',base).href,{waitUntil:'domcontentloaded'});await page.locator('.site[data-site-version="latest"]').waitFor();await native(page,lang+' contact');
    for(const selector of ['input:not([type="checkbox"])','textarea']){const control=page.locator(selector).first();await control.waitFor();assert.ok(['text','auto'].includes(await control.evaluate(el=>getComputedStyle(el).cursor)),'native text caret');}
    await page.screenshot({path:output+'/desktop-'+lang+'.png'});assert.deepEqual(errors,[]);await context.close();
  }
  for(const touch of [false,true]){
    const context=await browser.newContext({viewport:{width:touch?390:1280,height:844},hasTouch:touch,isMobile:touch,reducedMotion:touch?'no-preference':'reduce'});
    const page=active=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('#/site?motion=on',base).href,{waitUntil:'domcontentloaded'});await page.locator('.site[data-site-version="latest"]').waitFor();await native(page,touch?'touch':'reduced motion');
    if(touch){const menu=page.locator('.site-burger');await menu.tap();assert.equal(await menu.getAttribute('aria-expanded'),'true');await page.locator('.site-nav a[href*="/site/teachers"]').tap();await page.locator('.site-teachergrid').waitFor();await native(page,'touch navigation');await page.screenshot({path:output+'/touch-390.png'});}
    assert.deepEqual(errors,[]);await context.close();
  }
  await writeFile(output+'/verified.json',JSON.stringify({expectedSource:expected,base:base.href,checkedAt:new Date().toISOString(),results},null,2));
  console.log('PASS native website cursor: '+results.length+' landing/edition/navigation/input/focus/touch/reduced-motion groups');
}catch(error){
  if(active&&!active.isClosed()){await writeFile(output+'/failure.json',JSON.stringify({message:error.message,url:active.url(),cursor:await active.evaluate(()=>({overlays:document.querySelectorAll('.element-cursor').length,active:document.documentElement.classList.contains('element-cursor-active')}))},null,2)).catch(()=>{});await active.screenshot({path:output+'/failure.png'}).catch(()=>{});}
  throw error;
}finally{await browser.close();}
