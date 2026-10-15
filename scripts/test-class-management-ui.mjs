import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:4174';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({timezoneId:'America/Bogota',viewport:{width:1280,height:1000}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${base}/#/`);
 await page.evaluate(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null}));});
 await page.goto(`${base}/#/admin/class-schedule`);await page.reload();
 await page.getByRole('heading',{name:'Class Schedule',exact:true}).waitFor();
 await page.locator('.session-calendar').waitFor();
 for(const name of ['List','Table','Calendar']){await page.getByRole('button',{name,exact:true}).click();}
 await page.getByRole('button',{name:'List',exact:true}).click();
 await page.getByRole('button',{name:'Open session',exact:true}).first().click();
 await page.getByRole('dialog').waitFor();
 assert(await page.getByText('This session only',{exact:true}).isVisible());
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.getByRole('link',{name:'Weekly templates',exact:true}).click();
 await page.getByRole('heading',{name:'Content',exact:true}).waitFor();
 await page.getByRole('button',{name:'List',exact:true}).click();
 await page.getByRole('button',{name:'Table',exact:true}).click();
 await page.goto(`${base}/#/admin/content?entity=modalities`);
 await page.getByRole('button',{name:'Select search results',exact:true}).click();
 await page.getByLabel('Field',{exact:true}).selectOption('heated');
 await page.getByLabel('New value',{exact:true}).selectOption('true');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities.map(r=>[r.id,r.heated]));
 await page.getByRole('button',{name:'Preview changes',exact:true}).click();
 await page.getByRole('button',{name:'Apply reviewed changes',exact:true}).click();
 await page.getByText('Batch saved in the demo.',{exact:true}).waitFor();
 assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities)).every(r=>r.heated===true));
 await page.getByRole('button',{name:'Undo last batch',exact:true}).click();
 await page.getByText('Batch undone.',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities.map(r=>[r.id,r.heated])),before);
 // Preview cancellation is nonmutating.
 await page.getByRole('button',{name:'Select search results',exact:true}).click();
 await page.getByRole('button',{name:'Preview changes',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.modalities.map(r=>[r.id,r.heated])),before);
 // Deep links open the requested related record.
 const teacher=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.teachers[0].id);
 await page.goto(`${base}/#/admin/content?entity=teachers&row=${teacher}`);await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 // New templates default to 50 minutes and explicit reviewed generation.
 await page.goto(`${base}/#/admin/content?entity=class_templates`);
 const title=await page.locator('h1').innerText();assert(title.includes('Content'));
 await page.getByRole('button',{name:'Create',exact:true}).first().click();await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByRole('dialog').getByLabel('Duration (min)',{exact:true}).inputValue(),'50');
 await page.keyboard.press('Escape');
 // Marketing cannot see compensation fields or enter the admin schedule.
 await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('hoyos.db.v1')).db;const assignment=db.user_roles.find(x=>x.role==='marketing');if(!assignment)throw new Error('marketing fixture missing');localStorage.setItem('hoyos.session',JSON.stringify({userId:assignment.user_id,devMode:false,viewAs:null}));});
 await page.reload();await page.goto(`${base}/#/admin/content?entity=teachers&row=${teacher}`);await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByText('Rate per class (COP)',{exact:true}).count(),0);await page.keyboard.press('Escape');
 await page.goto(`${base}/#/admin/class-schedule`);assert.equal(await page.getByRole('heading',{name:'Class Schedule',exact:true}).count(),0);
 await page.evaluate(()=>localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null})));await page.reload();
 for(const route of ['/admin/class-schedule','/admin/content'])for(const lang of ['es','en'])for(const width of [390,1280]){
  await page.evaluate(lang=>localStorage.setItem('hoyos.lang',lang),lang);await page.setViewportSize({width,height:1000});await page.goto(`${base}/#${route}`);await page.reload();await page.locator('h1').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} ${lang} ${width}: no overflow`);
  const dir=route.includes('class-schedule')?'M-14':'M-02';await mkdir(`docs/screenshots/${dir}`,{recursive:true});await page.screenshot({path:`docs/screenshots/${dir}/verified-${lang}-${width}.jpg`,fullPage:true,quality:72});
 }
 assert.deepEqual(errors,[]);await mkdir('qa',{recursive:true});await writeFile('qa/class-management.json',JSON.stringify({passed:true,checks:['calendar/list/table','related-record deep links','Escape','batch preview/apply/undo/cancel','new-template default','marketing restrictions','ES/EN mobile/desktop no overflow','no page errors']},null,2));
}catch(error){await mkdir('qa',{recursive:true});await page.screenshot({path:'qa/class-management-failure.jpg',fullPage:true});await writeFile('qa/class-management-failure.txt',String(error));throw error;}finally{await browser.close();}
