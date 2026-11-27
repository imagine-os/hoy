import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from './host.mjs';

const configuration = {
  RAILWAY_PROJECT_ID:'47b41e1d-b201-4da2-9b16-df8636fa136c',
  RAILWAY_ENVIRONMENT_ID:'4cadfc14-06a0-4d84-8df5-d075acbb1f2e',
  RAILWAY_SERVICE_ID:'994827c5-6e6d-44bb-afba-c96f6a44a5f2',
  RAILWAY_ENVIRONMENT_NAME:'wompi-sandbox',
  APP_URL:'https://fixture.up.railway.app',
  RAILWAY_PUBLIC_DOMAIN:'fixture.up.railway.app',
  TEST_GATE_PASSPHRASE:'p'.repeat(48),
  COOKIE_SIGNING_SECRET:'s'.repeat(48),
  WOMPI_TEST_OPERATOR_APPROVED:'a'.repeat(48),
  WOMPI_TEST_OPERATOR_DECLINED:'d'.repeat(48),
  WOMPI_SANDBOX_PUBLIC_KEY:'pub_test_fixture0123456789',
  WOMPI_SANDBOX_PRIVATE_KEY:'prv_test_fixture0123456789',
  WOMPI_SANDBOX_INTEGRITY_SECRET:'test_integrity_fixture0123456789',
};
const now = () => 1_800_000_000_000;
const cfg = {...configuration,WOMPI_TEST_CLOSE_AT:new Date(now()+1800000).toISOString()};
test('fails closed outside the exact host, with prod credentials, reused operator secrets or stale window',async ()=>{
  for(const overrides of [{RAILWAY_ENVIRONMENT_NAME:'production'},{RAILWAY_SERVICE_ID:'wrong'},
    {RAILWAY_PROJECT_ID:'wrong'},{RAILWAY_ENVIRONMENT_ID:'wrong'},{APP_URL:'https://production.invalid'},
    {WOMPI_SANDBOX_PRIVATE_KEY:'prv_prod_notallowed'},
    {WOMPI_TEST_OPERATOR_DECLINED:cfg.WOMPI_TEST_OPERATOR_APPROVED},
    {WOMPI_TEST_CLOSE_AT:new Date(now()-1).toISOString()}]){
    await assert.rejects(build({...cfg,...overrides},{now}),/sandbox configuration rejected/);
  }
});
test('native gate and separate operator auth before any sandbox access; approval, replay and isolation',async t=>{
  const refs = new Map();
  let calls=0, clock=now();
  const {server,db}=await build(cfg,{now:()=>clock,request:async (url,opts)=>{
    calls++;
    const id=url.pathname.split('/').at(-1);
    assert.equal(url.href,'https://sandbox.wompi.co/v1/transactions/'+id);
    assert(refs.has(id));
    assert.equal(opts.headers.Authorization,'Bearer '+cfg.WOMPI_SANDBOX_PRIVATE_KEY);
    return Response.json({data:{id,reference:refs.get(id),currency:'COP',amount_in_cents:5500000,status:id==='test-approval'?'APPROVED':'DECLINED'}});
  }});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();server.close();db.close();});
  const base='http://127.0.0.1:'+server.address().port;
  const post=(name,body,headers={})=>fetch(base+'/api/test/wompi/'+name,{method:'POST',headers:{origin:cfg.APP_URL,'content-type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post('start',{}, {authorization:'Bearer '+cfg.WOMPI_TEST_OPERATOR_APPROVED})).status,401);
  const gate=await fetch(base+'/test-gate',{method:'POST',redirect:'manual',body:new URLSearchParams({passphrase:cfg.TEST_GATE_PASSPHRASE})});
  assert.equal(gate.status,303);
  const cookie=gate.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('start',{}, {cookie})).status,401);
  const permit={cookie,authorization:'Bearer '+cfg.WOMPI_TEST_OPERATOR_APPROVED};
  assert.equal((await post('start',{}, {...permit,origin:'https://other.invalid'})).status,403);
  assert.equal((await fetch(base+'/api/cos/t/real/private',{headers:{cookie}})).status,404);
  assert.equal((await fetch(base+'/webhooks/resend',{method:'POST',headers:{cookie}})).status,404);
  const started=await post('start',{},permit);
  assert.equal(started.status,201);
  const link=new URL((await started.json()).checkout);
  refs.set('test-approval',link.searchParams.get('reference'));
  assert.equal(link.origin,'https://checkout.wompi.co');
  assert.equal(link.searchParams.get('amount-in-cents'),'5500000');
  const body={id:'test-approval'};
  for(let i=0;i<2;i++) assert.deepEqual(await (await post('result',body,permit)).json(),{id:'test-approval',status:'APPROVED'});
  const decline={cookie,authorization:'Bearer '+cfg.WOMPI_TEST_OPERATOR_DECLINED};
  assert.equal((await post('result',body,decline)).status,404);
  assert.equal(calls,1);
  const declinedStart=await post('start',{},decline);
  assert.equal(declinedStart.status,201);
  const declinedLink=new URL((await declinedStart.json()).checkout);
  const declinedRef=declinedLink.searchParams.get('reference');
  assert.notEqual(declinedRef,refs.get('test-approval'));
  refs.set('test-decline',declinedRef);
  assert.deepEqual(await (await post('result',{id:'test-decline'},decline)).json(),{id:'test-decline',status:'DECLINED'});
  assert.equal(calls,2);
  clock=Date.parse(cfg.WOMPI_TEST_CLOSE_AT)-15*60*1000+1;
  assert.equal((await post('start',{},permit)).status,404);
  assert.equal((await post('result',body,permit)).status,200);
  clock=Date.parse(cfg.WOMPI_TEST_CLOSE_AT);
  assert.equal((await post('start',{},permit)).status,404);
  assert.equal(calls,2);
});
