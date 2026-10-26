import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5185';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1218,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const row=name=>page.locator('.site-teacher').filter({has:page.getByRole('heading',{name,exact:true})});
async function geometry(){return page.locator('.site-teacher').evaluateAll(cards=>cards.map(card=>{const f=card.querySelector('.mediaslot'),i=f?.querySelector('img'),r=getComputedStyle(card).borderTopLeftRadius.split(' ').map(parseFloat),b=card.getBoundingClientRect();return {name:card.querySelector('h3').textContent,width:card.offsetWidth,radius:r,frame:f&&{width:f.clientWidth,height:f.clientHeight},natural:f?.classList.contains('mediaslot-natural'),source:i&&{width:i.naturalWidth,height:i.naturalHeight},image:i&&{width:i.clientWidth,height:i.clientHeight},zoom:i&&getComputedStyle(i).transform};}));}
async function check(){for(const g of await geometry()){
 assert(Math.abs(g.radius[0]-g.width/2)<1,`${g.name}: horizontal semicircle radius`);
 assert(Math.abs((g.radius[1]??g.radius[0])-g.width/2)<1,`${g.name}: vertical radius follows width, not card height`);
 if(g.natural){assert(g.source.width>0);assert(Math.abs(g.frame.width/g.frame.height-g.source.width/g.source.height)<.003,`${g.name}: native frame proportions`);assert(Math.abs(g.image.width-g.frame.width)<=1&&Math.abs(g.image.height-g.frame.height)<=1,`${g.name}: no inset rectangle or gutters`);assert(Math.abs(g.image.width/g.source.width-g.image.height/g.source.height)<.003,`${g.name}: no cover crop or distortion`);}
}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');}
try{
 await mkdir('qa/teacher-frames',{recursive:true});await page.goto(`${base}/#/site/teachers`);
 for(const version of ['latest','photos'])for(const [lang,width,dark] of [['en',1218,false],['es',1218,true],['en',390,false],['es',390,true],['en',768,false],['es',768,true],['en',1280,false],['es',1280,true]]){
  await page.evaluate(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});await page.setViewportSize({width,height:1000});await page.goto(`${base}/#/site/teachers${version==='photos'?'?version=photos':''}`);await page.reload();await row('Raghu').waitFor();
  for(const img of await page.locator('.site-teacher img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}await check();
  assert.deepEqual(await page.evaluate(()=>({lang:document.documentElement.lang,theme:document.documentElement.dataset.theme})),{lang,theme:dark?'dark':'light'});
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);await page.setViewportSize({width,height});await page.screenshot({path:`qa/teacher-frames/${version}-${lang}-${width}${dark?'-dark':''}.jpg`,fullPage:true});
 }
 await page.setViewportSize({width:1218,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const name of ['María Camila Pinzón','Clara Zuluaga','Leandro Valencia']){const card=row(name);await card.scrollIntoViewIfNeeded();await card.hover();await page.waitForTimeout(400);assert.equal(await card.locator('img').evaluate(i=>getComputedStyle(i).transform),'none','hover must not crop verified poses');await card.screenshot({path:`qa/teacher-frames/hover-${name.split(' ')[0]}.jpg`});}
 // Hands on the overhead-bar source remain inside the visible semicircle, even on hover.
 await row('María Camila Pinzón').evaluate(card=>card.scrollIntoView({block:'center',behavior:'instant'}));await row('María Camila Pinzón').hover();await page.waitForTimeout(500);
 const pose=await row('María Camila Pinzón').evaluate(card=>{const img=card.querySelector('img'),r=img.getBoundingClientRect();return [.24,.76].map(x=>{const px=r.left+r.width*x,py=r.top+r.height*.22,hit=document.elementFromPoint(px,py);return {visible:card.contains(hit),x:px,y:py,hit:hit?.tagName};});});assert(pose.every(p=>p.visible),`raised hands remain within the visible arch: ${JSON.stringify(pose)}`);
 const original=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 try{await page.evaluate(()=>{const c=document.createElement('canvas');c.width=160;c.height=90;c.getContext('2d').fillRect(0,0,160,90);const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));state.db.teachers.find(t=>t.id==='tea_clara').photo_url=c.toDataURL();localStorage.setItem('hoyos.db.v1',JSON.stringify(state));});await page.reload();await row('Clara Zuluaga').waitFor();for(const img of await page.locator('.site-teacher img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}const cms=row('Clara Zuluaga');assert((await cms.locator('img').getAttribute('src')).startsWith('data:image/png'));assert.equal(await cms.locator('.mediaslot-natural').count(),0,'arbitrary CMS uploads keep the reserved frame');assert.equal(await cms.locator('.mediaslot').evaluate(f=>getComputedStyle(f).aspectRatio),'4 / 5');await check();await cms.screenshot({path:'qa/teacher-frames/cms-override.jpg'});}finally{await page.evaluate(db=>localStorage.setItem('hoyos.db.v1',db),original);}
 assert.deepEqual(errors,[]);await writeFile('qa/teacher-frames/results.json',JSON.stringify({passed:true,widths:[390,768,1218,1280],captures:20,checks:['native source proportions','no gutters or cover crop','semicircular width-based tops including placeholders and CMS','straight sides','hover preserves full poses','overhead hands visible','CMS priority and reserved ratio','ES/EN light/dark','no overflow','no page errors']},null,2));
 console.log('Teacher frame QA passed: native portraits and semicircular arches');
}finally{await browser.close();}
