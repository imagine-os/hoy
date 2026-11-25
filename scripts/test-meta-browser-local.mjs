import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const p = await browser.newPage({ serviceWorkers: "block" });
  let sdk = 0;
  let events = [];
  const base = 'http://localhost:5179';
  await p.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.origin === base) return route.continue();
    if (u.href === 'https://connect.facebook.net/en_US/fbevents.js') {
      sdk++;
      assert.equal(route.request().headers().referer, undefined);
      // Synthetic receiver deliberately probes common SDK inputs; NEVER sends to Meta.
      return route.fulfill({contentType:'text/javascript',body:`
      const q=window.fbq;
      const send = function(cmd,pixel,event,params) {
        if(cmd!=='trackSingle')return;
        let topHref;
        try { topHref=parent.location.href; } catch { topHref='blocked'; }
        let originStorage;
        try { originStorage=localStorage.getItem('private'); } catch { originStorage='blocked'; }
        const obj={pixel,event,params,doc:location.href,ref:document.referrer,topHref,originStorage};
        new Image().src='https://www.facebook.com/tr?fixture='+encodeURIComponent(JSON.stringify(obj));
      };
      q.callMethod=send;
      q.queue.forEach(a=>send(...a));
      `});
    }
    if (u.origin === 'https://www.facebook.com' && u.pathname === '/tr') {
      assert.equal(route.request().headers().referer, undefined);
      events.push(JSON.parse(u.searchParams.get('fixture')));
      return route.fulfill({status:204,body:''});
    }
    return route.abort();
  });
  const until = async (n) => {
    for(let t=0;t<120&&events.length<n;t++)await new Promise(r=>setTimeout(r,25));
    assert.equal(events.length,n);
  };
  await p.goto(base+'/meta-qa.html?secret=FIXTURE-QUERY-SECRET#/app/schedule');
  await p.evaluate(()=>localStorage.setItem('private','FIXTURE-STORAGE-SECRET'));
  await p.getByRole('button',{name:'No permitir / Decline',exact:true}).click();
  await p.getByRole('button',{name:'View class',exact:true}).click();
  assert.equal(sdk,0);
  assert.deepEqual(events,[]);
  await p.getByRole('button',{name:'Privacidad publicitaria / Advertising privacy',exact:true}).click();
  await p.getByRole('button',{name:'Permitir / Allow',exact:true}).click();
  await until(1);
  await p.getByRole('link',{name:'Private pass'}).click();
  await p.waitForTimeout(125);
  assert.equal(events.length,1);
  await p.getByRole('link',{name:'Private receipt'}).click();
  await p.waitForTimeout(125);
  assert.equal(events.length,1);
  await p.getByRole('link',{name:'Public schedule'}).click();
  await until(2);
  for (const label of ['View class','Register','Start checkout']) await p.getByRole('button',{name:label,exact:true}).click();
  await until(5);
  const names=events.map(row=>row.event);
  assert.deepEqual(names,['PageView','PageView','ViewContent','CompleteRegistration','InitiateCheckout']);
  assert.equal(sdk,1);
  for (const row of events) {
    assert.equal(row.doc,base+'/meta-measurement-frame.html');
    assert.equal(row.ref,'');
    assert.equal(row.topHref,'blocked');
    assert.equal(row.originStorage,'blocked');
    assert.equal(row.pixel,'963759066544104');
    assert(!JSON.stringify(row).includes('SECRET'));
  }
  assert.deepEqual(events.at(-1).params,{currency:'COP',value:35000,content_name:'Trial class'});
  await p.evaluate(()=>document.querySelector('iframe')?.contentWindow?.postMessage({type:'hoy.meta.event.v1',event:{name:'Purchase',params:{value:35000}}},'*'));
  await p.waitForTimeout(125);
  assert.equal(events.length,5);
  await p.getByRole('button',{name:'Privacidad publicitaria / Advertising privacy',exact:true}).click();
  await p.getByRole('button',{name:'No permitir / Decline',exact:true}).click();
  assert.equal(await p.locator('iframe').count(),0);
  await p.getByRole('button',{name:'Register',exact:true}).click();
  await p.waitForTimeout(125);
  assert.equal(events.length,5);
  console.log('PASS: Chromium, intercepted traffic; no SDK before consent, opaque isolation, 4 allowlisted events, no private-page or Purchase event, withdrawal stops further requests.');
} finally { await browser.close(); }
