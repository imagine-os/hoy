// Real local product-editor commands → public Home consumer. Fictional browser session only.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5180',out=process.env.QA_OUTPUT??'docs/screenshots/public-mvp-followup';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});
const errors=[],checks=[];
try{
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
 await ctx.addInitScript(()=>{localStorage.setItem('hoyos.lang','en');localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_admin',devMode:false,viewAs:null}));});
 const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-23T17:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/admin/products`);await page.getByRole('heading',{name:'Product master',exact:true}).waitFor();
 await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('hoyos.db.v1')),p=s.db.plans.find(p=>p.id==='plan_pack12');
  const definition={code:'DEMO_PUBLIC_COMMAND',name:{es:'Paquete ficticio de prueba',en:'Fictional command package'},type:'paquetes',classes:8,validityDays:45,active:true,prices:[{id:'demo_price',amount:100000,startsOn:'2026-10-01',endsOn:null}]};
  p.frontend_catalog={definition,history:[{revision:1,actorId:'usr_admin',at:'2026-10-23T12:00:00Z',definition:structuredClone(definition)}]};delete p.frontend_publication;
  localStorage.setItem('hoyos.db.v1',JSON.stringify(s));
 });await page.reload();
 const publish=async()=>{await page.getByRole('button',{name:'Review local publication',exact:true}).click();await page.getByRole('button',{name:'Confirm publication to local preview',exact:true}).click();await page.getByText('Revision published only to the local preview.',{exact:true}).waitFor();};
 const home=async()=>{await page.goto(`${base}/#/site`);await page.locator('.sanctuary-plan').nth(1).waitFor();return page.locator('.sanctuary-plan').nth(1);};
 await publish();assert.match(await (await home()).innerText(),/100[.,]000/,'actual publication command reaches Home without provider reload');
 await page.goto(`${base}/#/admin/products`);await page.getByRole('button',{name:'Edit draft',exact:true}).click();await page.locator('[name=amount_0]').fill('150000');await page.getByRole('button',{name:'Save local draft',exact:true}).click();await page.getByText('Local draft saved. Not published.',{exact:true}).waitFor();
 assert.match(await (await home()).innerText(),/100[.,]000/,'actual saved unpublished draft stays out of Home');
 await page.goto(`${base}/#/admin/products`);await publish();assert.match(await (await home()).innerText(),/150[.,]000/,'actual republish updates Home');
 await page.goto(`${base}/#/site/plans`);assert.match(await page.getByTestId('site-published-price-plan_pack12').innerText(),/150[.,]000/,'same published amount on Plans');
 await page.goto(`${base}/#/admin/products`);await page.getByRole('button',{name:'Review local withdrawal',exact:true}).click();await page.getByRole('button',{name:'Confirm withdrawal from local preview',exact:true}).click();await page.getByText('Revision withdrawn from the local preview.',{exact:true}).waitFor();
 const withdrawn=await home();assert.equal(await withdrawn.locator('.sanctuary-price').count(),0);await withdrawn.getByRole('status').waitFor();
 checks.push('Actual fictional admin product-editor publish → Home 100000; save draft150000 → Home remains100000; republish → Home and Plans150000; withdrawal → Home guidance with no stale price. Same browser provider, no consumer reload.');
 assert.deepEqual(errors,[]);console.log(checks.join('\n'));await ctx.close();
}finally{await writeFile(`${out}/publication-command-results.json`,JSON.stringify({base,checks,errors,limits:['Fictional local browser editor/atomic commands only; no real authorization, backend publication or customer transaction.']},null,2));await browser.close();}
