import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {createPilot} from '../../server/wompi-test-pilot.mjs';

const now=()=>1800000000000;
const origin='https://hoy-test.fixture.invalid';
for(const scenario of [
  {name:'one confirmed opted-in purchase despite a result replay',start:true,finish:true,status:'APPROVED',expect:1},
  {name:'pending never creates a purchase',start:true,finish:true,status:'PENDING',expect:0},
  {name:'declined never creates a purchase',start:true,finish:true,status:'DECLINED',expect:0},
  {name:'voided never creates a purchase',start:true,finish:true,status:'VOIDED',expect:0},
  {name:'mismatched payment never creates a purchase',start:true,finish:true,status:'APPROVED',bad:true,expect:0},
  {name:'revoked consent never creates a purchase',start:true,finish:false,status:'APPROVED',expect:0},
  {name:'late consent is not applied retroactively',start:false,finish:true,status:'APPROVED',expect:0},
  {name:'missing consent integration defaults off',start:false,finish:false,status:'APPROVED',omit:true,expect:0},
  {name:'failed consent lookup never blocks a confirmed payment',start:true,finish:false,status:'APPROVED',lookupFailure:true,expect:0},
])test(scenario.name,async t=>{
  let reference,grant=scenario.start,fail=false;
  const db=new DatabaseSync(':memory:');
  const handle=createPilot({
    environment:'test',testGateOn:true,db,origin,now,
    publicKey:'pub_test_fixture_only',privateKey:'prv_test_fixture_only',integrityKey:'test_integrity_fixture_only',
    identify:async req=>req.headers.authorization==='Bearer opted-in-fixture'?'private-fixture-subject':null,
    ...(scenario.omit?{}:{measurementConsent:async subject=>{assert.equal(subject,'private-fixture-subject');if(fail)throw Error('unavailable'); return grant;}}),
    request:async ()=>Response.json({data:{id:'fixture-txn',reference:scenario.bad?'hoy-test-other':reference,amount_in_cents:5500000,currency:'COP',status:scenario.status,customer_email:'private@example.invalid'}})
  });
  const server=createServer(handle);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();server.close();db.close();});
  const post=(path,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/test/wompi/'+path,{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer opted-in-fixture'},body:JSON.stringify(body)});
  const start=await post('start',{});
  assert.equal(start.status,201);
  reference=new URL((await start.json()).checkout).searchParams.get('reference');
  grant=scenario.finish;
  fail=!!scenario.lookupFailure;
  for(let i=0;i<2;i++) assert.equal((await post('result',{id:'fixture-txn'})).status,scenario.bad?503:200);
  const rows=db.prepare('SELECT event_json FROM sandbox_purchase_events').all();
  assert.equal(rows.length,scenario.expect);
  if(rows.length){
    const event=JSON.parse(rows[0].event_json);
    assert.deepEqual(Object.keys(event).sort(),['action_source','custom_data','event_id','event_name','event_time']);
    assert.equal(event.event_name,'Purchase');
    assert.equal(event.event_time,1800000000);
    assert.equal(event.action_source,'website');
    assert.deepEqual(event.custom_data,{currency:'COP',value:55000});
    assert.match(event.event_id,/^hoy-purchase-[0-9a-f-]{36}$/);
    assert.doesNotMatch(rows[0].event_json,/fixture-txn|private@example|subject|hoy-test-/);
  }
});
