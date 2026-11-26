import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { createPilotGate } from '../../server/metaHomePilot.mjs';
const origin = 'https://hoyhumanclub.com';
const framePath = '/__hoy/meta-home-pageview';
const key='a'.repeat(43);
const digest=createHash('sha256').update(key).digest('hex');
const app = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
  import {MetaHomePilot} from './src/modules/website/MetaHomePilot';
  createRoot(document.querySelector('#root')).render(<React.StrictMode><MetaHomePilot lang="en"/></React.StrictMode>);`,
  resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, define: { __HOY_BUILD__: '"production"' },
  jsx: 'automatic', logLevel: 'silent',
});
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const sdk = `const queue = window.fbq.queue.map(x => Array.from(x));
if (queue.length !== 3 || queue[2].join(',') !== 'trackSingle,963759066544104,PageView' || window.origin !== 'null' || document.referrer) throw Error('unexpected SDK contract');
(new Image()).src='https://www.facebook.com/tr/?id=963759066544104&ev=PageView';`;
async function run({path='/', enabled=true, choice, stop=false, wrongKey=false}={}){
  const ctx = await browser.newContext({viewport:{width:390,height:800}});
  const seen = [];
  const gate = createPilotGate({environment:'production',metaHomePilot:enabled ? {digest} : null});
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if(url.origin === origin) {
      if (url.pathname === '/bundle.js') return route.fulfill({body:app.outputFiles[0].text,contentType:'text/javascript'});
      if (url.pathname === '/app-config.json') return route.fulfill({json:{tenant:'hoy',apiBase:'/api/cos',clerkPublishableKey:'pk_test_fixture',environment:'production',metaHomePilot:enabled}});
      if (url.pathname === framePath) {
        seen.push('frame');
        const actual=await req.allHeaders();
        const f=await gate.claim({method:req.method(),headers:{...actual,host:url.host}},url.search,async()=>req.postDataBuffer());
        if(!f) return route.fulfill({status:404,body:'No test'});
        return route.fulfill({body:f.body,headers:f.headers});
      }
      return route.fulfill({body:'<!doctype html><div id="root"></div><script src="/bundle.js"></script>',contentType:'text/html'});
    }
    if(url.href === 'https://connect.facebook.net/en_US/fbevents.js'){
      seen.push('sdk');
      assert.equal(await req.headerValue('referer'),null);
      return route.fulfill({body:sdk,contentType:'text/javascript'});
    }
    if(url.origin === 'https://www.facebook.com' && url.pathname === '/tr/'){
      seen.push('event');
      assert.equal(await req.headerValue('referer'),null);
      assert.deepEqual([...url.searchParams.keys()],['id','ev']);
      return route.fulfill({status:204});
    }
    seen.push('unexpected');
    return route.abort();
  });
  const page=await ctx.newPage();
  await page.goto(origin+path);
  if(choice) {
    await page.getByRole('button',{name:choice,exact:true}).waitFor();
    assert.deepEqual(seen, []);
    if(choice==='Allow for this visit') await page.getByLabel('Test key').fill(wrongKey?'b'.repeat(43):key);
    await page.getByRole('button',{name:choice,exact:true}).click();
  }
  if (stop) {
    await page.waitForFunction(() => document.querySelector('iframe') !== null);
    for(let n=0;n<30&&!seen.includes('event');n++) await new Promise(resolve=>setTimeout(resolve,100));
    await page.getByRole('button',{name:'Stop measurement',exact:true}).click();
    assert.equal(await page.locator('iframe').count(),0);
  } else {
    await page.waitForTimeout(180);
    if(!choice) assert.equal(await page.getByRole('button',{name:'Allow for this visit'}).count(),0);
  }
  await ctx.close();
  return seen;
}
try{
  for(const params of [{enabled:false},{path:'/?private=not-forwarded'},{path:'/#/app/checkout'},{path:'/horario'},{choice:'Do not allow'}]){
    assert.deepEqual(await run(params),[]);
  }
  assert.deepEqual(await run({choice:'Allow for this visit',wrongKey:true}),['frame']);
  assert.deepEqual(await run({choice:'Allow for this visit',stop:true}),['frame','sdk','event']);
  console.log('Chromium: off/default, private URL, rejected consent and one opt-in event; withdraw removes frame. All Meta requests intercepted.');
}finally{await browser.close();}
