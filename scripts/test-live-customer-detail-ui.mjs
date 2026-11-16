import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp,writeFile,rm,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDist,launchBrowser } from './lib/launch-qa.mjs';
const dir=await mkdtemp(join(tmpdir(),'hoy-client-'));
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import {HashRouter,Routes,Route} from 'react-router-dom';
import {LiveCustomerDetail} from './src/modules/admin/customers/LiveCustomerDetail';import {DataProviderRoot} from './src/data/DataContext';import {SessionContext} from './src/auth/sessionContext';import {I18nProvider} from './src/i18n/I18nProvider';import {strings} from './src/modules/admin/strings';import {clientStrings} from './src/modules/admin/customers/clientStrings';import {ThemeProvider} from './src/design/ThemeProvider';import './src/styles/global.css';import './src/design/tokens.css';
const person={id:'p1',data:{name:'Ana Example',email:'ana@example.test',phone:'+573001234567',dob:null}};window.world={person,writes:[],stale:false};
const request=async(method,path,body,opts)=>{if(path==='/api/person/p1')return {data:structuredClone(person)};if(path==='/query')return {data:[{id:'m1',data:{person:'p1'}}]};if(path==='/batch'){const sent=JSON.parse(JSON.stringify(body));window.world.writes.push({body:sent,opts});if(window.world.stale)throw {code:'ifMatch mismatch'};for(const op of sent.ops){if(person.data[op.ifMatch.field]!==op.ifMatch.value)throw {code:'ifMatch mismatch'};Object.assign(person.data,op.data);}return {ids:sent.ops.map(()=> 'p1')};}throw Error('unexpected');};
const readonly=new URLSearchParams(location.search).has('readonly');const provider={name:'companyos',request};const session={user:{id:'admin1'},role:readonly?'marketing':'admin',viewAs:null,can:()=>!readonly};
createRoot(document.getElementById('root')).render(<DataProviderRoot provider={provider as any}><SessionContext.Provider value={session as any}><I18nProvider tables={[strings,clientStrings]}><ThemeProvider><HashRouter><Routes><Route path='/admin/crm/:id' element={<LiveCustomerDetail/>}/></Routes></HashRouter></ThemeProvider></I18nProvider></SessionContext.Provider></DataProviderRoot>);`;
await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',outfile:join(dir,'app.js'),jsx:'automatic',loader:{'.png':'empty','.jpg':'empty','.webp':'empty','.svg':'empty'},define:{'import.meta.env':'{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true,"BASE_URL":"/"}',__HOY_BUILD__:'"production"'}});
await writeFile(join(dir,'index.html'),'<html><head><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
const host=await serveDist(31879,dir);const browser=await launchBrowser();const errors=[];
try{
 await mkdir('docs/screenshots/M-06',{recursive:true});
 for(const lang of ['en','es'])for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await context.addInitScript(l=>localStorage.setItem('hoyos.lang',l),lang);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(host.base+'/#/admin/crm/p1');
  const name=page.getByLabel(lang==='en'?'Full name':'Nombre completo',{exact:false});await name.waitFor();await name.fill('Ana Updated');await page.getByRole('button',{name:lang==='en'?'Save details':'Guardar datos',exact:true}).click();await page.getByText(lang==='en'?'Details saved and verified.':'Datos guardados y verificados.').waitFor();
  assert.equal(await page.evaluate(()=>window.world.person.data.name),'Ana Updated');assert.equal(await page.evaluate(()=>window.world.person.data.email),'ana@example.test');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`docs/screenshots/M-06/${lang}-${width}-live-client-detail.png`,fullPage:true});
  await page.evaluate(()=>window.world.stale=true);await name.fill('Conflict');await page.getByRole('button',{name:lang==='en'?'Save details':'Guardar datos',exact:true}).click();await page.getByText(lang==='en'?'Someone changed these details. Reload before editing.':'Alguien cambió estos datos. Vuelve a cargarlos antes de editar.').waitFor();assert.equal(await page.evaluate(()=>window.world.person.data.name),'Ana Updated');await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();await page.goto(host.base+'/?readonly=1#/admin/crm/p1');await page.locator('input').first().waitFor();assert.equal(await page.locator('input:disabled').count(),5);assert.equal(await page.locator('button[type=submit]').count(),0);await context.close();assert.deepEqual(errors,[]);console.log('PASS UI: EN/ES at 390/1280; confirmed edits, immutable email, responsive fit, conflict refusal and read-only role; fictional provider only');
}finally{await browser.close();await host.close();await rm(dir,{recursive:true,force:true});}
