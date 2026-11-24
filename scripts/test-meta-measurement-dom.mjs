import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const deps = process.env.HOY_TEST_DEPS ? resolve(process.env.HOY_TEST_DEPS) : join(repo, 'node_modules');
const require = createRequire(join(deps, '.local-test.cjs'));
const { build } = require('esbuild');
const { JSDOM, ResourceLoader } = process.env.HOY_JSDOM_PATH ? require(resolve(process.env.HOY_JSDOM_PATH)) : require('jsdom');
  const result = await build({
    bundle: true, absWorkingDir: repo, write: false, nodePaths: [deps], jsx: 'automatic', logLevel:'silent',
    stdin: { resolveDir: repo, loader:'tsx', contents:`
      import { StrictMode, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { HashRouter, Link, useLocation } from 'react-router-dom';
      import { Measurement, MeasurementRoute, useMeasurementEntry } from './src/measurement/Measurement';
      import { SiteRouter } from './src/app/SiteRouter';
      import { classView, checkoutEvent } from './src/measurement/pixelPolicy';
      const out = (window as any).events = [];
      const sink = new URLSearchParams(location.search).has('fixture') ? (event: unknown) => out.push(event) : undefined;
      function Scene() {
        const { pathname } = useLocation();
        useMeasurementEntry(pathname.startsWith('/app/class/') ? classView() :
          pathname.startsWith('/app/checkout/') ? checkoutEvent(35000, 'Trial class') : null, pathname);
        return <><MeasurementRoute handoff={false} />
          <Link to="/site/plans">public plans</Link>
          <Link to="/app/class/abc?email=example%40invalid.test">class A</Link>
          <Link to="/app/class/abc?token=private">same class query</Link>
          <Link to="/app/class/def">class B</Link>
          <Link to="/app/checkout/abc">checkout</Link>
          <Link to="/app/pass/private-voucher?name=example">private</Link></>;
      }
      function Harness() {
        const [pathMode, setPathMode] = useState(new URLSearchParams(location.search).get('fixture') === 'site');
        const child = pathMode ? <SiteRouter onLeave={href => { history.pushState(null, '', href); setPathMode(false); }}><Scene /></SiteRouter> : <HashRouter><Scene /></HashRouter>;
        return <Measurement sink={sink}>{child}</Measurement>;
      }
      createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
    ` },
  });
  const js = result.outputFiles[0].text;

const requests = [];
class NoNetwork extends ResourceLoader { fetch(url) { requests.push(url); return null; } }
function setup(address) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url:'https://synthetic.example.test' + address,runScripts:'outside-only',resources:new NoNetwork(), pretendToBeVisual:true });
  dom.window.fetch = (url) => { requests.push(String(url)); return Promise.reject(new Error('test disabled network')); };
  dom.window.eval(js);
  return dom;
}
const wait = async f => {
  for (let i=0;i<80;i++) { if(f()) return; await new Promise(r=>setTimeout(r,10)); }
  throw new Error('measurement UI did not settle');
};
const click = async (w, selector, label) => {
  const el=()=>[...w.document.querySelectorAll(selector)].find(e=>e.textContent===label);
  await wait(el);
  el().click();
  await new Promise(r=>setTimeout(r,35));
};
const init = setup('/#/app');
await click(init.window,'a','class A');
assert.equal(init.window.document.querySelector('aside'), null);
assert.equal(init.window.events.length,0);
init.window.close();
const synthetic=setup('/?fixture=1#/app'),w=synthetic.window;
const count=n=>wait(()=>w.events.length===n);
await click(w,'a','class A');
assert.equal(w.events.length,0);
await click(w,'button','Permitir / Allow');
await count(2);
await click(w,'a','same class query');
assert.equal(w.events.length,2);
await click(w,'a','class B');
await count(4);
await click(w,'a','checkout');
await count(6);
await click(w,'a','private');
assert.equal(w.events.length,6);
await click(w,'button','Privacidad publicitaria / Advertising privacy');
await click(w,'button','No permitir / Decline');
await click(w,'a','class A');
assert.equal(w.events.length,6);
assert.equal(w.localStorage.getItem('hoy.measurement.ads.v1'),'no');
assert.doesNotMatch(JSON.stringify(w.events),/example|private|token|voucher|abc|def|https?:/i);
synthetic.window.close();

const publicSite = setup('/?fixture=site');
const outer = publicSite.window;
await click(outer,'button','Permitir / Allow');
await click(outer,'a','public plans');
await wait(()=>outer.events.length===1);
assert.equal(outer.location.pathname,'/planes');
await click(outer,'a','class A');
await wait(()=>outer.events.length===3);
assert.match(outer.location.hash,/^#\/app\/class\/abc/);
assert.doesNotMatch(JSON.stringify(outer.events),/example|email|abc|planes/);
outer.close();
assert.deepEqual(requests,[]);
console.log('synthetic DOM/React: no-sink default, clean public routes and path-to-hash handoff, hash navigation, StrictMode, remember/revoke consent, same-path query changes, private routes, and zero requests passed');
