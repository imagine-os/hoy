import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { pilotAvailable, pilotFrame } from '../../server/metaHomePilot.mjs';

const conf = { environment: 'production', metaHomePilot: true };
const request = { method: 'GET', headers: { host: 'hoyhumanclub.com', 'sec-fetch-dest': 'iframe', 'sec-fetch-site': 'same-origin' } };
assert.equal(pilotAvailable(conf, request), true);
for (const c of [{}, {...conf, metaHomePilot:false}, {...conf, environment:'test'}, {...conf, testGate:{on:true}}]) assert.equal(pilotAvailable(c, request), false);
assert.equal(pilotAvailable(conf,{...request,headers:{...request.headers,host:'other.invalid'}}),false);
for (const headers of [{}, {'sec-fetch-dest':'document','sec-fetch-site':'same-origin'}, {'sec-fetch-dest':'iframe','sec-fetch-site':'cross-site'}]) assert.equal(pilotFrame({...request,headers},''),null);
assert.equal(pilotFrame(request,'?data=private'),null);
assert.equal(pilotFrame({...request,method:'POST'},''),null);
const result = pilotFrame(request,'');
assert.equal(result.headers['Referrer-Policy'],'no-referrer');
assert.equal(result.headers['Cache-Control'],'no-store');
assert.match(result.headers['Content-Security-Policy'],/frame-ancestors 'self'; sandbox allow-scripts/);
assert.doesNotMatch(result.headers['Content-Security-Policy'],/unsafe-inline|allow-same-origin/);
const source = result.body.match(/<script>([\s\S]+)<\/script>/)[1];
assert.ok(result.headers['Content-Security-Policy'].includes('sha256-'+createHash('sha256').update(source).digest('base64')));
function boot({ child=true, origin='null', referrer='', search='', hash='' }={}) {
  const loads = [];
  const window = { origin, location: {search, hash} };
  window.parent = child ? {} : window;
  const document = {referrer, createElement:()=>({}), head:{append:s=>loads.push(s)}};
  vm.runInNewContext(source,{window,document});
  return {calls: Array.from(window.fbq?.queue ?? [], args => Array.from(args)),loads};
}
const go = boot();
assert.deepEqual(go.calls,[['set','autoConfig',false,'963759066544104'],['init','963759066544104'],['trackSingle','963759066544104','PageView']]);
assert.equal(go.loads.length,1);
assert.equal(go.loads[0].src,'https://connect.facebook.net/en_US/fbevents.js');
for(const options of [{child:false},{origin:'https://hoyhumanclub.com'},{referrer:'https://hoyhumanclub.com/'},{search:'?x=1'},{hash:'#private'}]) assert.deepEqual(boot(options),{calls:[],loads:[]});
const shell = await readFile(new URL('../../src/modules/website/SiteShell.tsx',import.meta.url),'utf8');
assert.match(shell, /<MetaHomePilot/);
console.log('HOY homepage pilot: default off, exact host, document/URL guard, opaque frame policy and one PageView contract pass.');
