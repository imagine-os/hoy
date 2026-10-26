import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:5198',before=process.env.GROUP_QA_MODE==='before';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1218,height:1000},reducedMotion:'reduce'}),errors=[],observations=[];
page.on('pageerror',error=>errors.push(error.message));
const group=()=>page.locator('.sanctuary-community').filter({has:page.locator('img.photo-community')});
async function open(version='latest',motion='off'){await page.goto(`${base}/#/site?motion=${motion}${version==='latest'?'':`&version=${version}`}`);await page.reload();await group().waitFor();assert.equal(await page.locator('.site').getAttribute('data-site-version'),version);await group().scrollIntoViewIfNeeded();await group().locator('img').evaluate(i=>i.decode());}
async function geometry(){return group().evaluate(frame=>{const img=frame.querySelector('img'),s=getComputedStyle(frame),b=frame.getBoundingClientRect(),i=img.getBoundingClientRect();return {width:b.width,height:b.height,radius:s.borderTopLeftRadius.split(' ').map(parseFloat),image:[i.width,i.height],source:[img.naturalWidth,img.naturalHeight],src:img.currentSrc,transform:getComputedStyle(img).transform,maxHeight:s.maxHeight};});}
function check(g){assert(g.src.includes('/hero-group-'));assert(Math.abs(g.width/g.height-g.source[0]/g.source[1])<.003,'frame follows native group composition');assert(Math.abs(g.image[0]/g.image[1]-g.source[0]/g.source[1])<.003,'no inset rectangle, cover crop or distortion');assert(Math.abs(g.image[0]-g.width)<1&&Math.abs(g.image[1]-g.height)<1,'image fills frame without side gutters');assert(Math.abs(g.radius[0]-g.width/2)<1&&Math.abs((g.radius[1]??g.radius[0])-g.width/2)<1,'top is a width-based semicircle');assert.equal(g.transform,'none','no pose cropping from parallax/hover zoom');}
try{
 const out=`qa/home-group-frame/${before?'before':'after'}`;await mkdir(out,{recursive:true});await page.goto(base);
 const matrix=before?[['en',1218,false],['es',390,false]]:[['en',1218,false],['es',1218,true],['es',390,false],['en',390,true],['es',768,false],['en',768,true],['es',1280,false],['en',1280,true]];
 for(const version of before?['latest']:['latest','photos'])for(const [lang,width,dark] of matrix){
  await page.evaluate(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});await page.setViewportSize({width,height:1000});await open(version);
  const g=await geometry();observations.push({version,lang,width,dark,...g});
  await page.screenshot({path:`${out}/${version}-${lang}-${width}${dark?'-dark':''}.jpg`});
  if(before){assert(Math.abs(g.image[0]/g.image[1]-g.source[0]/g.source[1])>.05,'baseline reproduces contain gutters');continue;}
  check(g);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no document overflow');
  assert.equal(await page.locator('.sanctuary-teacher-link').count(),11,'stable teacher list');
  const visible=await group().evaluate(frame=>{const r=frame.getBoundingClientRect();return [[.08,.20],[.94,.21],[.5,.14],[.2,.35],[.5,.29],[.79,.38],[.85,.59]].map(([x,y])=>frame.contains(document.elementFromPoint(r.left+r.width*x,r.top+r.height*y)));});assert(visible.every(Boolean),'raised hands, ring and four faces remain inside the visible arch');
  await group().hover();await page.waitForTimeout(400);check(await geometry());
  if(width===390){for(const [name,selector] of [['mountain','.source-philosophy-photo'],['practices','.source-practice']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${version}-${lang}-${width}${dark?'-dark':''}-${name}.jpg`});}assert.equal(await page.locator('.source-practice .natural-photo').count(),7);}
 }
 if(!before){
  await page.setViewportSize({width:1218,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await open('latest','on');await group().hover();await page.waitForTimeout(500);check(await geometry());
  const saved=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
  try{await page.evaluate(()=>{const stored=JSON.parse(localStorage.getItem('hoyos.db.v1')),c=document.createElement('canvas');c.width=80;c.height=50;c.getContext('2d').fillRect(0,0,80,50);stored.db.teachers.find(t=>t.id==='tea_clara').photo_url=c.toDataURL();localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));});await open();assert((await page.locator('.sanctuary-teacher-link').filter({has:page.getByRole('heading',{name:'Clara Zuluaga',exact:true})}).locator('img').getAttribute('src')).startsWith('data:image/png'),'CMS portrait override preserved');check(await geometry());}finally{await page.evaluate(value=>localStorage.setItem('hoyos.db.v1',value),saved);}
  for(const version of ['classic','archive']){await page.goto(`${base}/#/site?version=${version}&motion=off`);assert.equal(await page.locator('.has-studio-photo').count(),0,'historical editions retain their frame behavior');}
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({before,observations,checks:before?['reproduced source/frame mismatch']:['natural composition/no gutters','semicircle top','hands/ring/faces visible','no hover/parallax zoom','stable teacher list and CMS portrait override','Latest/Photos and historical boundaries','mobile mountain/practice details','ES/EN light/dark/no overflow']},null,2));console.log(before?'Captured and confirmed pre-fix Home group gutters':'Home group frame QA passed: natural composition, semicircle, CMS/editions and mobile details');
}finally{await browser.close();}
