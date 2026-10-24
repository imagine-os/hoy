import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE??'http://127.0.0.1:5598',out=process.env.QA_OUTPUT??'/tmp/hoy-pl04-read-context',checks=[],errors=[];
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try { for(const lang of ['en','es']) for(const width of [390,1280]) for(const change of ['actor','role','provider','tenant','unmount']) for(const failure of [false,true]) {
 const ctx=await browser.newContext({viewport:{width,height:1000}});await ctx.addInitScript(lang=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:'customer'}));},lang);
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/#/coming-soon');await p.waitForFunction(()=>localStorage.getItem('hoyos.db.v1'));const before=await p.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 await p.evaluate(async failure=>{(await import('/scripts/customer-read-context-harness.tsx')).mountCustomerReadContext(failure)},failure);await p.waitForFunction(()=>window.qaCustomerRead.paused);
 assert.deepEqual(await p.locator('#qa-customer-read-context [data-rows]').evaluate(e=>JSON.parse(e.textContent)),[]);
 await p.evaluate(({change,failure})=>{const q=window.qaCustomerRead;q.hold=false;q.failure=false;if(change==='actor')q.actor('usr_cust');if(change==='role')q.role('public');if(change==='provider')q.swap();if(change==='tenant')q.tenant('');if(change==='unmount')q.unmount();},{change,failure});await p.waitForTimeout(50);
 await p.evaluate(()=>window.qaCustomerRead.release());await p.waitForTimeout(100);
 const result=await p.evaluate(()=>({frames:window.qaCustomerRead.frames,queries:window.qaCustomerRead.queries,writes:window.qaCustomerRead.writes}));
 for(const frame of result.frames){assert(!frame.rows.some(id=>id.includes('foreign')||id==='same-id'));if(frame.role==='public'||!frame.tenant)assert.deepEqual(frame.rows,[]);if(frame.actor==='usr_cust')assert(frame.rows.every(id=>id.startsWith('actor-')));if(frame.provider===1)assert(frame.rows.every(id=>id.endsWith('-1')));}
 if(change==='actor')assert.deepEqual(result.frames.at(-1).rows,['actor-0','actor-0','actor-0','actor-0','actor-0']);if(change==='provider')assert.deepEqual(result.frames.at(-1).rows,['own-1','own-1','own-1','own-1','own-1']);
 if(change==='role'||change==='tenant')assert.deepEqual(result.frames.at(-1).rows,[]);
 for(const call of result.queries){assert(call.query.where.tenant_id);if(['notifications','payment_methods','bookings'].includes(call.table))assert(call.query.where.user_id);}
 assert.equal(result.writes,0);assert.equal(await p.evaluate(()=>localStorage.getItem('hoyos.db.v1')),before);
 checks.push({lang,width,change,failure,frames:result.frames,queries:result.queries});await ctx.close();
 } assert.deepEqual(errors,[]);console.log('PASS customer read context: '+checks.length+' actual-hook delayed context cases');
}catch(error){errors.push(String(error));throw error;}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({checks,errors},null,2));}
