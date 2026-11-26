// Real staff schedule page, against a fictional transaction fixture. Never contacts Company OS.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {build} from 'esbuild';
import {serveDist,launchBrowser} from './lib/launch-qa.mjs';

const dir=await mkdtemp(join(tmpdir(),'hoy-teacher-email-'));
const fixture=`
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
import {LiveSchedulePage} from './src/modules/classSchedule/live/LiveSchedulePage';
import {DataProviderRoot} from './src/data/DataContext';import {SessionContext} from './src/auth/sessionContext';
import {I18nProvider} from './src/i18n/I18nProvider';import {strings} from './src/modules/classSchedule/strings';
import {deskStrings} from './src/modules/staff/desk/strings';import {ThemeProvider} from './src/design/ThemeProvider';
import './src/styles/global.css';import './src/design/tokens.css';
const w=window.world={person:{id:'test-person',name:'Fictional Instructor',email:'old@example.test',phone:''},writes:[]};
const provider={name:'companyos',list:async()=>[],peek:()=>[],get:async()=>null,subscribe:()=>()=>{},self:async()=>({}),
 request:async(method,path,body,options)=>{
 if(method!=='POST')throw Error('unexpected verb');
 if(path==='/query')return {data:body.entity==='coach'?[{id:'test-coach',data:{person:{...w.person},active:true}}]:[]};
 if(path!=='/batch')throw Error('unexpected write endpoint');
 const person=body.ops[0];w.writes.push({ops:structuredClone(body.ops),key:options.idempotencyKey});
 if(w.refuseEmail && 'email' in person.data) throw Object.assign(Error('Forbidden'),{code:'email_change_not_allowed'});
 if(person.ifMatch && w.person[person.ifMatch.field]!==person.ifMatch.value) throw Object.assign(Error('ifMatch mismatch'),{code:'ifmatch_mismatch'});
 w.person={...w.person,...person.data};return {ids:['test-person','test-coach']};
 }};
const canWrite=!new URLSearchParams(location.search).has('readonly');
const session={user:{id:'fictional-admin',role:'admin'},role:'admin',viewAs:null,viewAsPerson:null,status:'ready',signedIn:true,can:k=>canWrite&&k==='teachers.write'};
createRoot(document.getElementById('root')).render(<DataProviderRoot provider={provider as any}><SessionContext.Provider value={session as any}><I18nProvider tables={[strings,deskStrings]}><ThemeProvider><MemoryRouter><LiveSchedulePage/></MemoryRouter></ThemeProvider></I18nProvider></SessionContext.Provider></DataProviderRoot>);
`;
let browser,host;
try {
 const v={name:'registry-stub',setup(b){b.onLoad({filter:/src\/app\/registry\.ts$/},async a=>({contents:(await readFile(a.path,'utf8')).replace("const found = import.meta.glob<ModuleExports>('../modules/*/index.ts', { eager: true });",'const found: Record<string, ModuleExports> = {};'),loader:'ts',resolveDir:dirname(a.path)}));}};
 await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',outfile:join(dir,'app.js'),jsx:'automatic',loader:{'.png':'empty','.jpg':'empty','.webp':'empty','.svg':'empty'},define:{'import.meta.env':'{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true,"BASE_URL":"/"}',__HOY_BUILD__:'"production"'},plugins:[v]});
 await writeFile(join(dir,'index.html'),'<html><head><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
 host=await serveDist(31928,dir);browser=await launchBrowser();
 for(const [lang,width] of [['es',390],['en',1280]]){
  const ctx=await browser.newContext({viewport:{width,height:960}});await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await ctx.addInitScript(l=>localStorage.setItem('hoyos.lang',l),lang);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host.base);const copy=(es,en)=>lang==='es'?es:en;
  const teachers=page.getByRole('button',{name:copy('Profesores','Teachers'),exact:true});
  const edit=page.getByRole('button',{name:copy('Editar','Edit'),exact:true});
  const save=page.getByRole('button',{name:copy('Guardar','Save'),exact:true});
  const cancel=page.getByRole('button',{name:copy('Cancelar','Cancel'),exact:true});
  const email=page.getByLabel(copy('Correo del perfil','Profile email'),{exact:true});
  await teachers.click();await edit.click();
  await email.waitFor({timeout:2500});assert.equal(await email.inputValue(),'old@example.test');
  await email.fill('bad');assert(await save.isDisabled());assert.equal(await page.evaluate(()=>world.writes.length),0);
  await email.fill('');assert(await save.isDisabled());assert.equal(await page.evaluate(()=>world.writes.length),0);
  await email.fill('changed@example.test');await cancel.click();assert.equal(await page.evaluate(()=>world.writes.length),0);
  await edit.click();assert.equal(await email.inputValue(),'old@example.test');
  await save.click();await email.waitFor({state:'detached'});
  assert(!('email' in (await page.evaluate(()=>world.writes.at(-1).ops[0].data))));
  await edit.click();await email.fill(' Updated@EXAMPLE.test ');await save.click();await email.waitFor({state:'detached'});
  const batch=await page.evaluate(()=>world.writes.at(-1));assert.equal(batch.ops.length,2);
  assert.deepEqual(batch.ops[0],{op:'update',entity:'person',id:'test-person',ifMatch:{field:'email',value:'old@example.test'},data:{name:'Fictional Instructor',email:'updated@example.test'}});
  assert.equal(batch.ops[1].entity,'coach');assert(!('email' in batch.ops[1].data));assert(!('user' in batch.ops[0].data));
  await edit.click();assert.equal(await email.inputValue(),'updated@example.test');await email.fill('stale@example.test');
  await page.evaluate(()=>{world.person.email='different@example.test'});await save.click();await page.getByRole('alert').filter({hasText:copy('Alguien cambió','Someone changed')}).waitFor();
  assert.equal(await page.evaluate(()=>world.person.email),'different@example.test');assert.equal(await email.inputValue(),'stale@example.test');await cancel.click();
  await edit.click();assert.equal(await email.inputValue(),'different@example.test');
  await page.evaluate(()=>{world.refuseEmail=true});
  await email.fill('refused@example.test');await save.click();
  await page.getByRole('alert').filter({hasText:copy('Tu acceso no permite','permission to change')}).waitFor();
  assert.equal(await page.evaluate(()=>world.person.email),'different@example.test');await cancel.click();
  await page.goto(host.base+'?readonly');await teachers.click();assert.equal(await edit.count(),0);assert.equal(await email.count(),0);
  assert(!errors.length);await ctx.close();
 }
 console.log('PASS teacher profile email actual schedule editor, ES 390 / EN 1280, validated save, cancel, no auth writes, stale conflict, role gate');
}finally{await browser?.close();await host?.close();await rm(dir,{recursive:true,force:true});}
