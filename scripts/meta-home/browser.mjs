import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { createServer } from 'node:https';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler } from '../../server/app.mjs';

const origin = 'https://hoyhumanclub.com';
const framePath = '/__hoy/meta-home-pageview';
const key='a'.repeat(43);
const digest=createHash('sha256').update(key).digest('hex');
const dir=await mkdtemp(join(tmpdir(),'hoy-pixel-browser-'));
const app = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
  import {MetaHomePilot} from './src/modules/website/MetaHomePilot';
  createRoot(document.querySelector('#root')).render(<React.StrictMode><MetaHomePilot lang="en"/></React.StrictMode>);`,
  resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, define: { __HOY_BUILD__: '"production"' },
  jsx: 'automatic', logLevel: 'silent',
});
await mkdir(join(dir,'assets'));
await writeFile(join(dir,'index.html'),'<!doctype html><html><head></head><body><div id="root"></div><script src="/assets/pilot.js"></script></body></html>');
await writeFile(join(dir,'assets/pilot.js'),app.outputFiles[0].text);
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=hoyhumanclub.com',
  '-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem')],{stdio:'ignore'});
const tls={key:await readFile(join(dir,'key.pem')),cert:await readFile(join(dir,'cert.pem'))};
const vendorPath=process.env.HOY_META_LOCAL_SDK;
const vendorConfigPath=process.env.HOY_META_LOCAL_CONFIG;
const vendorConfig=vendorConfigPath ? await readFile(vendorConfigPath,'utf8') : null;
const sdk=vendorPath?await readFile(vendorPath,'utf8'):`const queue=window.fbq.queue.map(x=>Array.from(x));
if(queue.length!==3||queue[2].join(',')!=='trackSingle,963759066544104,PageView'||window.origin!=='null'||document.referrer)throw Error('unexpected SDK contract');
(new Image()).src='https://www.facebook.com/tr/?id=963759066544104&ev=PageView';`;

async function run({path='/', enabled=true, choice, stop=false, wrongKey=false}={}){
  const seen=[];
  const handler=await createHandler({distDir:dir,environment:'production',tenant:'hoy',clerkPublishableKey:'pk_test_fixture',
    launch:{siteLive:true},authorizedParties:[origin],metaHomePilot:enabled?{digest}:null}, {verifySession:async()=>{throw new Error('No fixture auth')},log:()=>{}});
  const server=createServer(tls,(req,res)=>{
    if(req.url===framePath||req.url==='/__hoy/meta-home-unlock'){
      const tag=req.url===framePath?'frame':'unlock';
      seen.push(tag);
      res.on('finish',()=>{ if(![200,204].includes(res.statusCode)&&!wrongKey) seen.push(tag+'Denied:'+res.statusCode); });
    }
    void handler(req,res);
  }).listen(0,'127.0.0.1');
  await once(server,'listening');
  let browser;
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
      env:Object.fromEntries(Object.entries(process.env).filter(([name])=>!/proxy/i.test(name))),
      args:['--no-sandbox','--no-proxy-server',`--host-resolver-rules=MAP hoyhumanclub.com 127.0.0.1:${server.address().port},MAP * ~NOTFOUND,EXCLUDE localhost`]});
    const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:800},serviceWorkers:'block'});
    await ctx.route(url=>url.origin!==origin,async route=>{
      const req=route.request(), url=new URL(req.url());
      if(url.href==='https://connect.facebook.net/en_US/fbevents.js'){
        seen.push('sdk');
        assert.equal(await req.headerValue('referer'),null);
        assert.equal(await req.headerValue('cookie'),null);
        return route.fulfill({body:sdk,contentType:'text/javascript'});
      }
      if(vendorConfig && url.origin==='https://connect.facebook.net' && url.pathname==='/signals/config/963759066544104'){
        seen.push('sdk-config');
        assert.equal(await req.headerValue('referer'),null);
        return route.fulfill({body:vendorConfig,contentType:'text/javascript'});
      }
      if(url.origin==='https://www.facebook.com'&&url.pathname==='/tr/'){
        seen.push('event');
        assert.equal(await req.headerValue('referer'),null);
        assert.equal(url.searchParams.get('id'),'963759066544104');
        assert.equal(url.searchParams.get('ev'),'PageView');
        if(!vendorPath) assert.deepEqual([...url.searchParams.keys()],['id','ev']);
        else {
          const pageUrl=url.searchParams.get('dl');
          assert.ok(pageUrl===origin+framePath||pageUrl===origin+'/', 'unexpected event source');
          assert.ok(!url.searchParams.get('rl'), 'event must not include a referrer');
          assert.ok([...url.searchParams.keys()].every(key=>! /^(ud|aud|cd)\[|^(fbp|fbc)$/.test(key)), 'unexpected cookies or matching data');
          console.log('SDK dry observation: keys='+[...url.searchParams.keys()].join(',')+'; source matches frame='+(pageUrl===origin+framePath));
        }
        return route.fulfill({status:204});
      }
      seen.push('unexpected:'+url.origin+url.pathname);
      return route.abort();
    });
    const page=await ctx.newPage();
    if(vendorPath) page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('SDK dry diagnostic:',m.text().split('\n')[0].slice(0,360));});
    await page.goto(origin+path,{timeout:8000});
    if(choice){
      await page.getByRole('button',{name:choice,exact:true}).waitFor({timeout:5000});
      assert.deepEqual(seen,[]);
      if(choice==='Allow for this visit')await page.getByLabel('Test key').fill(wrongKey?'b'.repeat(43):key);
      await page.getByRole('button',{name:choice,exact:true}).click();
    }
    if(stop){
      await page.getByRole('button',{name:'Stop measurement',exact:true}).waitFor({timeout:5000});
      for(let n=0;n<40&&!seen.includes('event');n++)await new Promise(resolve=>setTimeout(resolve,100));
      await page.getByRole('button',{name:'Stop measurement',exact:true}).click();
      assert.equal(await page.locator('iframe').count(),0);
    }else if(wrongKey){
      await page.getByText('Could not start the test.').waitFor({timeout:5000});
    }else{
      await page.waitForTimeout(200);
      if(!choice)assert.equal(await page.getByRole('button',{name:'Allow for this visit'}).count(),0);
    }
    return seen;
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
try{
  if(!vendorPath){
    for(const params of [{enabled:false},{path:'/?private=not-forwarded'},{path:'/#/app/checkout'},{path:'/horario'},{choice:'Do not allow'}])assert.deepEqual(await run(params),[]);
    assert.deepEqual(await run({choice:'Allow for this visit',wrongKey:true}),['unlock']);
  }
  assert.deepEqual(await run({choice:'Allow for this visit',stop:true}),vendorConfig ? ['unlock','frame','sdk','sdk-config','event'] : ['unlock','frame','sdk','event']);
  console.log('Chromium: exact TLS origin, gated opt-in and frame removal passed; no Meta request was sent.');
}finally{await rm(dir,{recursive:true,force:true});}
