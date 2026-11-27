import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPartnerHandler } from '../../server/report.mjs';

const paid={tenant:'test-tenant',status:'approved',approved_at:'2026-11-02T04:59:59Z',amount:35000,product:'p1',email:'not-for-export@example.invalid',reference:'not-for-export'};
const inputs={
 payments:[paid,{...paid,status:'pending'},{...paid,status:'voided'},{...paid,approved_at:null},{...paid,tenant:'other'},{...paid,approved_at:'2026-11-02T05:00:00Z'},{...paid,product:'unknown',concept:'not-for-export'}],
 registrations:[{tenant:'test-tenant',completed_at:'2026-11-01T18:00:00Z'},{tenant:'test-tenant',created_at:'2026-11-01T18:00:00Z'}],
 bookings:[
   {tenant:'test-tenant',starts_at:'2026-11-01T14:00:00Z',status:'booked'},
   {tenant:'test-tenant',starts_at:'2026-11-01T14:00:00Z',status:'checked_in',checked_in_at:'2026-11-01T14:01:00Z'},
   {tenant:'test-tenant',starts_at:'2026-11-01T14:00:00Z',status:'held'},
   {tenant:'test-tenant',starts_at:'2026-11-01T14:00:00Z',status:'cancelled'}
 ],
};
const token='fixture_abcdefghijk123456789012345678901234567890';
async function serve(run,read=async()=>inputs) {
 const server=createServer(createPartnerHandler({tenant:'test-tenant',token,read,catalog:new Map([['p1','trial']])}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const url='http://127.0.0.1:'+server.address().port;
 try{await run(url);}finally{await new Promise(r=>server.close(r));}
}
const report='/v1/reports/activity?from=2026-11-01&to=2026-11-01';
const headers={Authorization:'Bearer '+token};
test('only approved documented payments; reporting dates are Bogotá calendar days; privacy allowlist',()=>serve(async url=>{
 const r=await fetch(url+report,{headers});
 assert.equal(r.status,200);
 assert.match(r.headers.get('cache-control'), /no-store/);
 assert.equal(r.headers.get('access-control-allow-origin'),null);
 const body=await r.json();
 assert.deepEqual(body,{timezone:'America/Bogota',currency:'COP',purchases:[
  {date:'2026-11-01',amount_cop:35000,product:'trial'},
  {date:'2026-11-01',amount_cop:35000,product:null}
 ],daily:[{date:'2026-11-01',sign_ups:1,bookings:2,attended:1}]});
}));
test('bad credentials, writes, unknown filters and overlong/invalid dates never read source',async()=>{
 let reads=0;
 await serve(async url=>{
  for(const [route,method,h,status] of [
   [report,'GET',{},401],[report+'%26token=x','GET',{Authorization:'Bearer wrong'},401],
   [report,'POST',headers,405],[report+'&tenant=other','GET',headers,400],
   [report+'&from=2026-11-01','GET',headers,400],
   ['/v1/reports/activity?from=2026-02-30&to=2026-03-01','GET',headers,400],
   ['/v1/reports/activity?from=2026-11-01&to=2026-12-02','GET',headers,400],
   ['/v1/reports/activity?from=2026-11-02&to=2026-11-01','GET',headers,400],
   ['/v1/reports/activity?token='+token,'GET',{},401],
   ['/api/payments','GET',headers,404]]) assert.equal((await fetch(url+route,{method,headers:h})).status,status);
 },async()=>{reads++;return inputs;});
 assert.equal(reads,0);
});
test('fixed UTC half-open date bounds; upstream failure does not leak details or serve partial output',()=>serve(async url=>{
 const r=await fetch(url+report,{headers});
 assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'report_unavailable'});
},async args=>{
 if(args.tenant!=='test-tenant'||args.start!=='2026-11-01T05:00:00.000Z'||args.end!=='2026-11-02T05:00:00.000Z')return inputs;
 throw Error('private supplier info');
}));
test('backend response missing a feed is not reported as zero',()=>serve(async url=>{
 assert.equal((await fetch(url+report,{headers})).status,503);
},async()=>({payments:[],bookings:[]})));
