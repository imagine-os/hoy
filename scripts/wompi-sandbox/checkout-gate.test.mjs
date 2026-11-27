import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {createHandler} from '../../server/app.mjs';
import {createPilot} from '../../server/wompi-test-pilot.mjs';

test('native HOY gate protects the single-class checkout and production never mounts it',async()=>{
  const db=new DatabaseSync(':memory:');
  const origin='https://hoy-test.fixture.invalid';
  const gate={on:true,origin,passphrase:'fixture passphrase only',secret:'fixture signing key only for unit testing'};
  const pilot=createPilot({environment:'test',testGateOn:true,db,origin,
    publicKey:'pub_test_local_fixture',integrityKey:'test_integrity_local_fixture',privateKey:'prv_test_local_fixture',
    identify:async req=>req.headers.authorization==='Bearer local-fixture-user'?'fixture-user':null});
  const make=async (environment,testGate) => createServer(await createHandler({
    environment,testGate,distDir:new URL('../../server/',import.meta.url).pathname,
    authorizedParties:[origin],tenant:'hoy'
  },{verifySession:async()=>({userId:'fixture-user'}),log:()=>{},checkoutPilot:pilot}));
  const staging=await make('test',gate), prod=await make('production',{on:false});
  await Promise.all([staging,prod].map(s=>new Promise(r=>s.listen(0,'127.0.0.1',r))));
  const path='/api/test/wompi/start';
  const base=s=>'http://127.0.0.1:'+s.address().port;
  const post=(url,headers,body)=>fetch(url,{method:'POST',headers,body,redirect:'manual'});
  const normal={origin,'content-type':'application/json',authorization:'Bearer local-fixture-user'};
  try {
    const blocked=await post(base(staging)+path,normal,'{}');
    assert.equal(blocked.status,401);
    assert.match(await blocked.text(),/test_gate/);
    const unlock=await post(base(staging)+'/test-gate',{'content-type':'application/x-www-form-urlencoded'},
      new URLSearchParams({passphrase:gate.passphrase,next:path}));
    assert.equal(unlock.status,303);
    const cookie=unlock.headers.get('Set-Cookie').split(';')[0];
    assert.equal((await post(base(staging)+path,{...normal,cookie,authorization:''},'{}')).status,401);
    const opened=await post(base(staging)+path,{...normal,cookie},'{}');
    assert.equal(opened.status,201);
    assert.equal(new URL((await opened.json()).checkout).searchParams.get('currency'),'COP');
    assert.equal((await post(base(prod)+path,{...normal,cookie},'{}')).status,404);
  } finally {await Promise.all([staging,prod].map(s=>new Promise(r=>s.close(r))));db.close();}
});
