import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
const fixture = readFileSync(new URL('./fixtures/meta-measurement/meta-measurement-frame.html', import.meta.url), 'utf8');
const js = fixture.match(/<script>([\s\S]+)<\/script>/)?.[1];
assert(js);
const hash = createHash('sha256').update(js).digest('base64');
assert(fixture.includes("'sha256-"+hash+"'"));
const origin = 'https://fixture.invalid';
function boot({ framed=true, referrer='', hash='' }={}) {
  const parent = {};
  const window = framed ? {} : parent;
  let listener;
  const loads = [];
  runInNewContext(js, {
    parent, window, location:{ origin, search:'', hash },
    document:{ referrer, createElement:()=>({}), head:{append:s=>loads.push(s)} },
    addEventListener:(_,cb)=>{ listener=cb; }
  });
  return {loads, window, send:(event, options={})=>listener?.({origin,source:parent,data:{type:'hoy.meta.event.v1',event},...options})};
}
for(const conditions of [{framed:false},{referrer:origin+'/private/FAKE'},{hash:'#private'}]) {
  const f=boot(conditions); f.send({name:'PageView'}); assert.equal(f.loads.length,0);
}
const f=boot();
f.send({name:'PageView'},{origin:'https://untrusted.invalid'});
f.send({name:'PageView'},{source:{}});
f.send({name:'Purchase'});
f.send({name:'InitiateCheckout',params:{value:0,content_name:'Trial class'}});
assert.equal(f.loads.length,0);
f.send({name:'PageView',url:'PRIVATE'});
f.send({name:'ViewContent',params:{content_name:'PRIVATE'}});
f.send({name:'CompleteRegistration',params:{email:'PRIVATE'}});
f.send({name:'InitiateCheckout',params:{value:35000,content_name:'Trial class',email:'PRIVATE'}});
assert.equal(f.loads.length,1);
assert.equal(f.loads[0].referrerPolicy,'no-referrer');
const cmds=JSON.parse(JSON.stringify(f.window.fbq.queue.map(args=>Array.from(args))));
assert.deepEqual(cmds,[
['set','autoConfig',false,'963759066544104'],['init','963759066544104'],
['trackSingle','963759066544104','PageView',{}],
['trackSingle','963759066544104','ViewContent',{content_name:'Studio class',content_ids:['studio-class'],content_type:'product'}],
['trackSingle','963759066544104','CompleteRegistration',{}],
['trackSingle','963759066544104','InitiateCheckout',{currency:'COP',value:35000,content_name:'Trial class'}],
]);
console.log('PASS: bridge bootstrap, CSP hash, sender/referrer validation, single SDK initialization, event allowlist and sensitive field stripping (VM, not Chromium)');
