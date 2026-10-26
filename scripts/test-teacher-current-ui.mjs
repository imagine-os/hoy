import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.QA_BASE||'http://127.0.0.1:5185';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}), errors=[];
page.on('pageerror',error=>errors.push(error.message));
const selected={Raghu:'teacher-raghu','Sara Estrada':'teacher-sara-estrada','Andre Cardona':'teacher-andre-cardona','Sara Crismatt Duque':'teacher-sara-crismatt','María Camila Pinzón':'teacher-maria-camila','Tatiana Ramirez':'teacher-tatiana','Clara Zuluaga':'teacher-clara','Leandro Valencia':'teacher-leandro'};
const matrix=[['es',390,false],['es',768,false],['es',1280,false],['en',390,false],['en',768,false],['en',1280,false],['es',1280,true],['en',1280,true]];
const rowsFor=path=>page.locator(path===''?'.sanctuary-teacher-link':'.site-teacher');
const namedRow=(path,name)=>rowsFor(path).filter({has:page.getByRole('heading',{name,exact:true})});
async function open(path,query='') {
  await page.goto(`${base}/#/site${path}${query}`);await page.reload();
  await page.locator(`.site[data-site-version=${query.includes('photos')?'photos':query.includes('classic')?'classic':'latest'}]`).waitFor();
  await rowsFor(path).first().waitFor();
}
async function mapping(path) {
  return rowsFor(path).evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.querySelector('h3').textContent,row.querySelector('img')?.getAttribute('src').split('/').at(-1)??null])));
}
try {
  await mkdir('qa/teacher-current',{recursive:true});
  await page.goto(base);
  for(const [lang,width,dark] of matrix) {
    await page.evaluate(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});
    for(const path of ['','/teachers']) {
      let latest;
      for(const version of ['latest','photos']) {
        await page.setViewportSize({width,height:1000});
        await open(path,version==='latest'?'':'?version=photos');
        assert.deepEqual(await page.evaluate(()=>({lang:document.documentElement.lang,theme:document.documentElement.dataset.theme})),{lang,theme:dark?'dark':'light'},'capture language and theme match the matrix');
        if(version==='latest') assert(!new URL(page.url()).hash.includes('version='),'bare URL stays bare and resolves Latest');
        assert.equal(await page.locator('.photo-preview-notice').count(),version==='photos'?1:0,'edition selection remains unchanged');
        const actual=await mapping(path);
        const expected=Object.fromEntries(Object.entries(selected).map(([name,asset])=>[name,`${asset}-960.webp`]));
        Object.assign(expected,{'Carolina Cifuentes':version==='photos'?'teacher-carolina-960.webp':null,Andrea:null,'Jennifer Varela':null});
        assert.deepEqual(actual,expected,`${version} ${path} exact teacher mapping`);
        if(version==='latest') latest=actual;
        else assert.deepEqual({...actual,'Carolina Cifuentes':null},latest,'Photos and default share only the eight verified mappings; Carolina remains edition-specific');
        if(path==='') {
          assert((await page.locator('.photo-community').getAttribute('src')).endsWith('hero-group-960.webp'));
          const group=await page.locator('.photo-community').evaluate(img=>{const box=img.getBoundingClientRect(),parent=img.parentElement.getBoundingClientRect();return {contained:box.top>=parent.top-1&&box.bottom<=parent.bottom+1,fit:getComputedStyle(img).objectFit};});
          assert(group.contained&&group.fit==='contain','selected group stays inside its existing frame without clipping');
          assert.equal(await page.locator('.photo-philosophy').count(),version==='photos'?1:0,'other Photos sections remain opt-in');
          assert.equal(await page.locator('.photo-finale-image').count(),version==='photos'?1:0,'Latest finale remains unchanged');
        }
        const images=page.locator(path===''?'.sanctuary-teachers img':'.site-teachergrid img');
        for(const img of await images.all()) {
          await img.scrollIntoViewIfNeeded();await img.evaluate(async image=>{image.loading='eager';await image.decode();});
          const box=await img.boundingBox();assert(box?.width>0&&box?.height>0,'photo has visible area');
        }
        if(path==='/teachers'&&version==='latest') for(const name of Object.keys(selected)) assert.equal(await namedRow(path,name).locator('img').evaluate(img=>getComputedStyle(img).objectFit),'contain','verified portraits retain the full selected pose');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${version} ${lang} ${width} no overflow`);
        const height=await page.evaluate(()=>document.documentElement.scrollHeight);await page.setViewportSize({width,height});
        await images.evaluateAll(async ims=>{await Promise.all(ims.map(i=>i.decode()));});
        await page.screenshot({path:`qa/teacher-current/${path?'teachers':'home'}-${version}-${lang}-${width}${dark?'-dark':''}.jpg`,fullPage:true});
      }
    }
  }
  // Explicit Latest and bare URLs resolve identically; Classic keeps its old pending portraits.
  for(const path of ['','/teachers']) {
    await open(path);const bare=await mapping(path);await open(path,'?version=latest');assert.deepEqual(await mapping(path),bare);
  }
  await open('/teachers','?version=classic');assert.equal(await rowsFor('/teachers').locator('img').count(),0,'Classic receives no new studio fallbacks');
  // Browser-local CMS overrides still beat verified and pending fallbacks after reload.
  const original=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
  const override=new URL('images/studio-2026/heater-blue-480.webp',`${base}/`).href;
  try {
    await page.evaluate(url=>{const state=JSON.parse(localStorage.getItem('hoyos.db.v1'));for(const id of ['tea_clara','tea_carolina'])state.db.teachers.find(t=>t.id===id).photo_url=url;localStorage.setItem('hoyos.db.v1',JSON.stringify(state));},override);
    for(const query of ['','?version=latest','?version=photos']) for(const path of ['','/teachers']) {
      await open(path,query);
      for(const name of ['Clara Zuluaga','Carolina Cifuentes']) assert.equal(await namedRow(path,name).locator('img').getAttribute('src'),override,'explicit CMS override wins after reload');
    }
  } finally {await page.evaluate(db=>localStorage.setItem('hoyos.db.v1',db),original);}
  assert.deepEqual(errors,[]);
  await writeFile('qa/teacher-current/results.json',JSON.stringify({passed:true,captures:32,widths:[390,768,1280],languages:['es','en'],dark:['es-1280','en-1280'],checks:['exact bare/Latest versus Photos mapping','Carolina preserved per edition','Andrea/Jennifer pending','CMS override reload','group photo','other Photos features stay opt-in','Classic unchanged','decoded images','no overflow','no page errors']},null,2));
  console.log('Current teacher photo QA passed: 32 default/Photos responsive and dark captures');
} finally {await browser.close();}
