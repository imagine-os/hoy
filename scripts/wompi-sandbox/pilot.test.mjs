import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {createPilot} from '../../server/wompi-test-pilot.mjs';

test('sandbox is absent in production or with the team gate off',()=>{
 for(const [environment,testGateOn] of [['production',true],['test',false],['preview',true]]) {
   assert.equal(createPilot({environment,testGateOn}),null);
 }
});
test('HOY fixture checkout only signs the server price and reconciles at most once',async()=>{
 let lookups=0;
 const db=new DatabaseSync(':memory:');
 const pilot=createPilot({environment:'test',testGateOn:true,db,origin:'https://hoy-test.fixture.invalid',
   publicKey:'pub_test_fixture_only',privateKey:'prv_test_fixture_only',integrityKey:'test_integrity_fixture_only',
   identify:async req=>({'Bearer owner':'fictional-a','Bearer visitor':'fictional-b'}[req.headers.authorization]??null),
   request:async(url)=>{
     lookups++;
     assert.equal(url.hostname,'sandbox.wompi.co');
     return Response.json({data:{id:'txn-fixture-a',reference,amount_in_cents:5500000,currency:'COP',status:'APPROVED'}});
   }});
 let reference;
 const http=createServer((req,res)=>void pilot(req,res));
 await new Promise(r=>http.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+http.address().port;
 const auth={'Authorization':'Bearer owner','Origin':'https://hoy-test.fixture.invalid','Content-Type':'application/json'};
 const post=(path,data,headers=auth)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(data)});
 try {
   const start='/api/test/wompi/start';
   assert.equal((await post(start,{}, {...auth, Authorization:'Bearer visitor',Origin:'https://elsewhere.invalid'})).status,403);
   assert.equal((await post(start,{}, {...auth, Authorization:'Bearer other'})).status,401);
   assert.equal((await post(start,{amountInCents:1})).status,400);
   const res=await post(start,{}); assert.equal(res.status,201);
   const info=await res.json();
   const checkout=new URL(info.checkout); reference=checkout.searchParams.get('reference');
   assert.equal(checkout.searchParams.get('amount-in-cents'),'5500000');
   assert.equal((await (await post(start,{})).json()).checkout,info.checkout);
   const result='/api/test/wompi/result';
   assert.equal((await post(result,{id:'txn-fixture-a'},{...auth,Authorization:'Bearer visitor'})).status,404);
   assert.equal(lookups,0);
   const first=await post(result,{id:'txn-fixture-a'}); assert.equal(first.status,200); assert.equal((await first.json()).status,'APPROVED');
   const second=await post(result,{id:'txn-fixture-a'}); assert.equal(second.status,200);assert.equal(lookups,1);
   assert.equal(db.prepare('select count(*) n from sandbox_orders where state=?').get('APPROVED').n,1);
 } finally {await new Promise(r=>http.close(r)); db.close();}
});
