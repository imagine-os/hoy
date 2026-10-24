// Controlled DEV timing delegates to the real MockProvider.atomic and actual BookedPage.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
import { installRescheduleFixture,readRescheduleDb } from './test-nt02-reschedule-fixture.mjs';
const base=process.env.QA_DEV_BASE??'http://127.0.0.1:5791',out=process.env.QA_OUTPUT??'/tmp/hoy-nt02-reschedule-context';
await mkdir(out,{recursive:true});const checks=[],errors=[],writes=[];let debug;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const logout=page=>page.evaluate(()=>{const oldValue=localStorage.getItem('hoyos.session'),newValue=JSON.stringify({userId:'usr_public',devMode:false,viewAs:null});localStorage.setItem('hoyos.session',newValue);window.dispatchEvent(new StorageEvent('storage',{key:'hoyos.session',oldValue,newValue,storageArea:localStorage,url:location.href}));});
try{
 for(const lang of ['en','es'])for(const width of [390,1280])for(const scenario of ['navigate-pending','logout-pending']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());await context.addInitScript(lang=>localStorage.setItem('hoyos.lang',lang),lang);
  const page=await context.newPage();debug=page;page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push({url:r.url(),method:r.method()});});
  await page.clock.install({time:new Date('2026-10-24T15:00:00Z')});await page.goto(`${base}/#/coming-soon`);await page.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));
  const f=await installRescheduleFixture(page,lang);await page.goto(`${base}/#/app/booking/${f.oldId}/change`);await page.reload();
  await page.getByRole('button',{name:lang==='en'?/Reschedule to another class/:/Reprogramar a otra clase/}).click();await page.getByLabel(lang==='en'?'Replacement class date':'Día de la nueva clase').fill(f.targetDay);await page.getByText(f.newTitle,{exact:true}).waitFor();
  const before=await readRescheduleDb(page);
  await page.evaluate(async()=>{
    const {MockProvider}=await import('/src/data/MockProvider.ts');const original=MockProvider.prototype.atomic;
    window.nt02OriginalAtomic=original;window.nt02AtomicCount=0;
    MockProvider.prototype.atomic=function(action,options){
      if(!options?.idempotencyKey?.startsWith('reschedule:'))return original.call(this,action,options);
      window.nt02AtomicCount++;window.nt02Blocked=true;
      return new Promise((resolve,reject)=>{window.nt02Release=()=>{original.call(this,action,options).then(resolve,reject).finally(()=>{window.nt02Settled=true;});};});
    };
  });
  await page.getByText(f.newTitle,{exact:true}).click();await page.waitForFunction(()=>window.nt02Blocked===true);
  assert.deepEqual(await readRescheduleDb(page),before,'held real command has not written');
  if(scenario==='navigate-pending'){await page.evaluate(()=>{location.hash='#/app/history';});await page.waitForURL(u=>u.hash==='#/app/history');await page.getByRole('heading',{name:lang==='en'?'History':'Historial',exact:true}).waitFor();}
  else {await logout(page);await page.waitForURL(u=>!u.hash.includes('/app/booking/'));}
  await page.evaluate(()=>window.nt02Release());await page.waitForFunction(()=>window.nt02Settled===true);
  assert.equal(await page.evaluate(()=>window.nt02AtomicCount),1);assert.deepEqual(await readRescheduleDb(page),before,'obsolete command is rejected by its existing context guard');
  assert.equal(await page.locator('[data-launch-event="rescheduled"]').count(),0,'obsolete owner cannot publish');assert.equal(await page.locator('button[data-launch-notification-open]').count(),0);
  await page.evaluate(async()=>{const {MockProvider}=await import('/src/data/MockProvider.ts');MockProvider.prototype.atomic=window.nt02OriginalAtomic;});
  checks.push({lang,width,scenario,actualCommandGuard:true,noPreview:true,wholeDbUnchanged:true});await context.close();
 }
 assert.equal(checks.length,8);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(`PASS NT02 reschedule context ${checks.length} actual controlled groups`);
}catch(error){if(debug&&!debug.isClosed()){await writeFile(`${out}/failure.txt`,await debug.locator('body').innerText());await debug.screenshot({path:`${out}/failure.jpg`,fullPage:true});}throw error;}
finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,writes,limits:'DEV delay delegates original atomic; no replacement writer/provider command and no backend authorization claim.'},null,2));}
