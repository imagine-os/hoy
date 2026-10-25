// Compiled actual route, read-only legacy/unpublished references and reload.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {checkinRoomFixture,checkinRoomNow,checkinRoomIds as IDS} from './checkin-room-fixture.mjs';
const base=process.env.QA_BASE??'http://127.0.0.1:5842',out=process.env.QA_OUTPUT??'/tmp/hoy-checkin-room-evidence-20261025/production',fixture=await checkinRoomFixture(process.env.QA_SOURCE_ROOT??process.cwd()),checks=[],errors=[];await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});let debug;
try{for(const lang of ['en','es'])for(const width of [390,1280]){
 const ctx=await browser.newContext({viewport:{width,height:1000},timezoneId:'America/Bogota',reducedMotion:'reduce'});await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());
 await ctx.addInitScript(({fixture,lang,now})=>{const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:[now]));}static now(){return new D(now).getTime();}};if(!sessionStorage.getItem('qa_s02')){sessionStorage.setItem('qa_s02','1');localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_desk',viewAs:null,devMode:false}));}localStorage.setItem('hoyos.lang',lang);},{fixture,lang,now:checkinRoomNow});
 const p=await ctx.newPage();debug=p;p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/#/staff/checkin?session='+IDS.session);
 const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db),label=p.locator('[data-checkin-room]');
 for(const [session,name]of [[IDS.session,'FICTIONAL S02 LEGACY ROOM'],[IDS.second,'FICTIONAL S02 UNPUBLISHED ROOM']]){
  await p.goto(base+'/#/staff/checkin?session='+session);await p.waitForFunction(name=>document.querySelector('[data-checkin-room="ready"]')?.textContent.includes(name),name);assert((await label.innerText()).includes(lang==='en'?'Room:':'Sala:'));
  await p.reload();await p.waitForFunction(name=>document.querySelector('[data-checkin-room="ready"]')?.textContent.includes(name),name);
  for(const theme of ['light','dark']){await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${out}/${lang}-${width}-${session}-${theme}.jpg`,fullPage:true,quality:65});}
  assert.deepEqual(await read(),fixture.db,'native route/reload changes no database rows');
 }
 checks.push({lang,width,legacyAndUnpublishedReadable:true,reload:true,bothThemes:true,entireDbUnchanged:true});await ctx.close();
 }assert.equal(checks.length,4);assert.deepEqual(errors,[]);
}catch(error){errors.push(String(error));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText().catch(()=>''));await debug.screenshot({path:out+'/failure.jpg',fullPage:true}).catch(()=>{});}throw error;}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,expectedGroups:4,checks,errors,limits:['Local compiled runtime and fictional MockProvider fixture only.','Lifecycle/error/subscription and real rename are covered in DEV; no native CMS writes.']},null,2));}
