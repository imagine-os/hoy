import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';

const fixture = {id:'hoy-test-quote-A',amountInCents:5500000,currency:'COP',expiresAt:'2026-11-27T05:00:00.000Z'};
const cfg={publicKey:'pub_test_fixture_value_only',integrityKey:'test_integrity_fixture_value_only',privateKey:'prv_test_fixture_value_only'};
const status=async()=>({id:'sandbox-tx-a',reference:fixture.id,amount_in_cents:fixture.amountInCents,currency:'COP',status:'APPROVED',customer_email:'fictional@example.invalid'});
const now=()=>Date.parse('2026-11-27T04:42:00.000Z');
const load=()=>import('../../server/wompi-sandbox.mjs');

test('checkout signs the server-owned COP amount and expiry; no card or customer data in the handoff',async()=>{
  const {checkoutForQuote}=await load();
  const u=new URL(checkoutForQuote(fixture,{...cfg,now}));
  assert.equal(u.origin,'https://checkout.wompi.co'); assert.equal(u.pathname,'/p/');
  assert.equal(u.searchParams.get('public-key'),cfg.publicKey);
  assert.equal(u.searchParams.get('amount-in-cents'),'5500000');
  assert.equal(u.searchParams.get('currency'),'COP');
  assert.equal(u.searchParams.get('reference'),fixture.id);
  assert.equal(u.searchParams.get('expiration-time'),fixture.expiresAt);
  const hash=createHash('sha256').update(fixture.id+'5500000COP'+fixture.expiresAt+cfg.integrityKey).digest('hex');
  assert.equal(u.searchParams.get('signature:integrity'),hash);
  assert.equal([...u.searchParams.keys()].length,6);
  assert.ok(!u.href.includes(cfg.integrityKey)&&!u.href.includes(cfg.privateKey));
});
test('bad, expired or live credentials/quotes cannot start a sandbox checkout',async()=>{
  const {checkoutForQuote}=await load();
  for(const bad of [{amountInCents:0},{amountInCents:55.01},{currency:'USD'},{id:'other-tenant'},{expiresAt:'2026-11-27T04:40:00.000Z'}])
    assert.throws(()=>checkoutForQuote({...fixture,...bad},{...cfg,now}),/checkout_unavailable/);
  for(const bad of [{publicKey:'pub_prod_sample'},{integrityKey:'prod_integrity_sample'}])
    assert.throws(()=>checkoutForQuote(fixture,{...cfg,...bad,now}),/checkout_unavailable/);
});
test('looks up provider status over the sandbox API and returns only a matched test receipt',async()=>{
  const {checkSandboxTransaction}=await load();
  const receipt=await checkSandboxTransaction('sandbox-tx-a',fixture,{...cfg,request:async(url,req)=>{
    assert.equal(url.href,'https://sandbox.wompi.co/v1/transactions/sandbox-tx-a');
    assert.equal(req.method,'GET'); assert.equal(req.redirect,'error');
    assert.equal(req.headers.Authorization,'Bearer '+cfg.privateKey);
    return Response.json({data:await status()});
  }});
  assert.deepEqual(receipt,{status:'APPROVED',id:'sandbox-tx-a'});
});
test('provider refusal or amount/reference/currency mismatch never registers an approval',async()=>{
  const {checkSandboxTransaction}=await load();
  for(const fields of [{reference:'someone-else'},{amount_in_cents:5500010},{currency:'USD'},{id:'different'},{status:'UNKNOWN'}])
    await assert.rejects(checkSandboxTransaction('sandbox-tx-a',fixture,{...cfg,request:async()=>Response.json({data:{...await status(),...fields}})}),/sandbox_transaction_unverified/);
  for(const state of ['PENDING','DECLINED','VOIDED','ERROR'])
    assert.deepEqual(await checkSandboxTransaction('sandbox-tx-a',fixture,{...cfg,request:async()=>Response.json({data:{...await status(),status:state}})}),{id:'sandbox-tx-a',status:state});
  await assert.rejects(checkSandboxTransaction('sandbox-tx-a',fixture,{...cfg,request:async()=>new Response(null,{status:401})}),/sandbox_transaction_unverified/);
  await assert.rejects(checkSandboxTransaction('sandbox-tx-a',fixture,{...cfg,privateKey:'prv_prod_fixture',request:async()=>assert.fail('no request')}),/sandbox_transaction_unverified/);
});
