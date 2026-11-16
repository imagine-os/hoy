// Actual review-built website, fictional browser-local provider, external requests blocked. No customer writes.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serveDist,launchBrowser,newContext} from './lib/launch-qa.mjs';
const dir='qa/mobile-practice-layout';await mkdir(dir,{recursive:true});
const srv=await serveDist(5546),browser=await launchBrowser();
const results=[];let active=null;
const metrics=page=>page.evaluate(()=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
 return [...document.querySelectorAll('.site-classrow')].map((el,i,all)=>({id:el.id,row:rect(el),copy:rect(el.querySelector('.site-classrow-copy')),media:rect(el.querySelector('.site-classrow-media')),keys:rect(el.querySelector('.classarch-keys')),next:all[i+1]?rect(all[i+1].querySelector('.eyebrow')):null,rowGap:getComputedStyle(el).rowGap,columnGap:getComputedStyle(el).columnGap}));
});
const collision=r=>Math.max(r.media.bottom,r.keys.bottom)>r.row.bottom+1||(r.next&&Math.max(r.media.bottom,r.keys.bottom)>=r.next.top-1);
try {
 for(const width of [320,360,390,430,1280])for(const lang of ['es','en'])for(const dark of [false,true]){
  const ctx=await newContext(browser,{width,lang});await ctx.addInitScript(dark=>localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'})),dark);
  const page=active=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const suffix=`${lang}-${dark?'dark':'light'}-${width}`;
  await page.goto(`${srv.base}/#/site/classes?motion=off&video=off`);await page.locator('.site-classrow').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.site-classrow').count(),7);
  // Reproduce the former rule on exactly the same component/content, then remove only the test stylesheet.
  const old=await page.addStyleTag({content:'.site[data-edition="sanctuary"] .site-classrow { gap:8%; }'});
  const before=await metrics(page);if(width<900)assert(before.some(collision),`old rule must reproduce mobile collision ${suffix}`);
  await page.locator('#hibrido').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/before-${suffix}.png`,fullPage:true});await old.evaluate(el=>el.remove());
  const after=await metrics(page);assert.equal(after.length,7);
  for(const r of after){assert(!collision(r),`class bounds/next eyebrow ${r.id} ${suffix}: ${JSON.stringify(r)}`);assert.equal(r.columnGap,'8%');if(width<900)assert(!r.rowGap.includes('%'),`token row gap ${r.id} ${suffix}`);}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`catalog horizontal overflow ${suffix}`);
  await page.screenshot({path:`${dir}/after-${suffix}.png`,fullPage:true});
  // Shared arches on the home page and every class detail must stay inside their frames too.
  await page.goto(`${srv.base}/#/site?motion=off&video=off`);await page.locator('.sanctuary-arches').waitFor();
  assert.equal(await page.locator('.sanctuary-arches .classarch').count(),7);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`home horizontal overflow ${suffix}`);
  for(const slug of after.map(r=>r.id)){
   await page.goto(`${srv.base}/#/site/classes/${slug}?motion=off&video=off`);await page.locator('.site-classdetail-grid').waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug} detail horizontal overflow ${suffix}`);
  }
  assert.deepEqual(errors,[]);results.push({suffix,before,after,checkedDetails:after.map(r=>r.id)});await ctx.close();active=null;
 }
 await writeFile(`${dir}/verified.json`,JSON.stringify(results,null,2));console.log('PASS all seven class rows and details, home arches, 320/360/390/430/1280 ES/EN light/dark, reproduced old collisions and no corrected overlap');
}catch(e){await writeFile(`${dir}/failure.json`,JSON.stringify({message:e.message,results,url:active?.url()},null,2));if(active)await active.screenshot({path:`${dir}/failure.png`,fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await srv.close();}
