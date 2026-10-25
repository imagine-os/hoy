// Actual S02 DEV lifecycle; controlled reads only, never financial commands.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {checkinRoomFixture,checkinRoomNow,checkinRoomIds as IDS} from './checkin-room-fixture.mjs';
const base=process.env.QA_BASE??'http://127.0.0.1:5843',out=process.env.QA_OUTPUT??'/tmp/hoy-checkin-room-evidence-20261025/dev',fixture=await checkinRoomFixture(process.env.QA_SOURCE_ROOT??process.cwd()),checks=[],errors=[];
const cases=['ready','error','missing','foreign','duplicate','malformed','race','actor','role','provider','selection','unmount','denied'];
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});let debug;
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
try{for(const lang of ['en','es'])for(const [i,scenario]of cases.entries()){
 console.log(`[checkin-room] START ${lang} ${scenario} (${checks.length+1}/26)`);
 const width=i%2?1280:390,ctx=await browser.newContext({viewport:{width,height:1000},timezoneId:'America/Bogota',reducedMotion:'reduce'});
 await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());
 await ctx.addInitScript(({fixture,lang,now})=>{const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:[now]));}static now(){return new D(now).getTime();}};if(!sessionStorage.getItem('qa_s02')){sessionStorage.setItem('qa_s02','1');localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',viewAs:'front_desk',devMode:false}));}localStorage.setItem('hoyos.lang',lang);},{fixture,lang,now:checkinRoomNow});
 const p=await ctx.newPage();debug=p;p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/#/coming-soon');await p.waitForLoadState('networkidle');
 await p.evaluate(async({path,hold})=>{const h=await import('/scripts/checkin-room-harness.tsx');h.mountCheckinRoom(path,hold);},{path:'/staff/checkin?session='+IDS.session,hold:scenario==='ready'});
 await p.waitForFunction(()=>window.qaCheckinRoom?.ready);const before=await read(p),label=p.locator('#qa-checkin-room [data-checkin-room]');
 const ready=async(name='FICTIONAL S02 LEGACY ROOM')=>{await label.locator(':scope').waitFor();await p.waitForFunction(name=>document.querySelector('#qa-checkin-room [data-checkin-room="ready"]')?.textContent.includes(name),name);assert((await label.innerText()).includes(lang==='en'?'Room:':'Sala:'));};
 const clean=async()=>assert.equal(await p.locator('#qa-checkin-room').getByText(/PRIVATE.*CANARY|STALE.*CANARY/).count(),0);
 if(scenario==='ready'){
  await p.waitForFunction(()=>window.qaCheckinRoom.held);assert.equal(await label.getAttribute('data-checkin-room'),'loading');await p.evaluate(()=>window.qaCheckinRoom.release());
  // The held result deliberately has a stale canary: force a fresh actual read before acceptance.
  await p.evaluate(()=>window.qaCheckinRoom.refresh());await ready();await clean();
  for(const theme of ['light','dark']){await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${out}/${lang}-${width}-${theme}.jpg`,fullPage:true,quality:65});}
  await p.evaluate(async id=>{await window.qaCheckinRoom.provider.update('rooms',id,{name:'FICTIONAL S02 RENAMED ROOM'});},IDS.legacy);await ready('FICTIONAL S02 RENAMED ROOM');
  await p.evaluate(async id=>{await window.qaCheckinRoom.provider.update('rooms',id,{name:'FICTIONAL S02 LEGACY ROOM'});},IDS.legacy);await ready();
  await p.evaluate(id=>window.qaCheckinRoom.navigate('/staff/checkin?session='+id),IDS.second);await ready('FICTIONAL S02 UNPUBLISHED ROOM');
 }else{
  await ready();
  if(['error','missing','foreign','duplicate','malformed'].includes(scenario)){
   await p.evaluate(mode=>{window.qaCheckinRoom.mode=mode;window.qaCheckinRoom.refresh();},scenario);
   const state=scenario==='missing'?'unavailable':'error';await p.locator(`#qa-checkin-room [data-checkin-room="${state}"]`).waitFor();assert(!(await label.innerText()).includes('FICTIONAL S02 LEGACY ROOM'));await clean();
   await p.evaluate(()=>window.qaCheckinRoom.mode='normal');if(state==='error')await label.getByRole('button',{name:lang==='en'?'Retry':'Reintentar',exact:true}).click();else await p.evaluate(()=>window.qaCheckinRoom.refresh());await ready();
  }else{
   await p.evaluate(()=>{window.qaCheckinRoom.holdNext=true;window.qaCheckinRoom.refresh();});await p.waitForFunction(()=>window.qaCheckinRoom.held);assert.equal(await label.getAttribute('data-checkin-room'),'loading');
   if(scenario==='race')await p.evaluate(()=>window.qaCheckinRoom.refresh());
   if(scenario==='actor'){await p.evaluate(()=>window.qaCheckinRoom.switchUser('usr_desk'));await p.waitForFunction(()=>window.qaCheckinRoom.actorId==='usr_desk'&&window.qaCheckinRoom.role==='front_desk');}
   if(scenario==='role'){await p.evaluate(()=>window.qaCheckinRoom.setViewAs('admin'));await p.waitForFunction(()=>window.qaCheckinRoom.actorId==='usr_super'&&window.qaCheckinRoom.role==='admin');}
   if(scenario==='denied'){await p.evaluate(()=>window.qaCheckinRoom.setViewAs('customer'));await p.waitForFunction(()=>window.qaCheckinRoom.actorId==='usr_super'&&window.qaCheckinRoom.role==='customer');await p.locator('#qa-checkin-room').getByText('FICTIONAL OTHER S02 DESTINATION',{exact:true}).waitFor();assert.equal(await label.count(),0,'denied role unmounts check-in');}
   if(scenario==='provider')await p.evaluate(()=>window.qaCheckinRoom.swap());
   if(scenario==='selection')await p.evaluate(id=>window.qaCheckinRoom.navigate('/staff/checkin?session='+id),IDS.second);
   if(scenario==='unmount')await p.evaluate(()=>window.qaCheckinRoom.unmount());
   if(!['unmount','denied'].includes(scenario))await ready(scenario==='selection'?'FICTIONAL S02 UNPUBLISHED ROOM':'FICTIONAL S02 LEGACY ROOM');
   await p.evaluate(()=>window.qaCheckinRoom.release());await p.waitForTimeout(100);await clean();
   if(scenario==='unmount'){assert.equal(await label.count(),0);const reads=await p.evaluate(()=>window.qaCheckinRoom.reads);await p.evaluate(async id=>{await window.qaCheckinRoom.provider.update('rooms',id,{name:'FICTIONAL S02 LEGACY ROOM'});},IDS.legacy);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.qaCheckinRoom.reads),reads,'no room proof read after unmount');}
   else if(scenario==='denied'){assert.equal(await label.count(),0,'held result cannot resurrect denied room label');const reads=await p.evaluate(()=>window.qaCheckinRoom.reads);await p.evaluate(()=>window.qaCheckinRoom.refresh());await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.qaCheckinRoom.reads),reads,'denied page unsubscribed from room reads');}
   else await ready(scenario==='selection'?'FICTIONAL S02 UNPUBLISHED ROOM':'FICTIONAL S02 LEGACY ROOM');
  }
 }
 assert.deepEqual(await read(p),before,'entire DB, including financial/attendance history, remains identical');checks.push({lang,width,scenario,entireDbUnchanged:true});console.log(`[checkin-room] PASS ${lang} ${width} ${scenario} (${checks.length}/26)`);await ctx.close();
 }assert.equal(checks.length,26);assert.deepEqual(errors,[]);
}catch(error){errors.push(String(error));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText().catch(()=>''));await debug.screenshot({path:out+'/failure.jpg',fullPage:true}).catch(()=>{});}throw error;}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,expectedGroups:26,checks,errors,limits:['Synthetic local MockProvider only; no backend authorization acceptance.','Room active flag does not alter readability of existing class references.']},null,2));}
