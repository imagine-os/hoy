import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createPartnerHandler} from '../../server/report.mjs';
import {createCompanyOsRead} from '../../server/company-os-read.mjs';

const dates={tenant:'fixture',start:'2026-11-01T05:00:00.000Z',end:'2026-11-02T05:00:00.000Z',limit:7};
const instant='2026-11-01T14:00:00Z';
const row=(id,data)=>({id,createdAt:instant,updatedAt:instant,orgUnitId:null,data});
const parsed={payment:[
 row('a',{status:'approved',approved_at:instant,amount:35000,product:'trial-id',notes:'private fixture'}),
 row('b',{status:'approved',approved_at:instant,amount:55000,product:'class-id'})
],booking:[
 row('c',{status:'checked_in',checked_in_at:instant,report_occurrence:{id:'session',starts_at:instant}}),
 row('d',{status:'booked',report_occurrence:{id:'session',starts_at:instant}})
]};
const signup=async()=>({complete:true,rows:[{day:'2026-11-01',count:1}]});
function fixture({override,readSignups=signup,pageSize=1}={}) {
 const calls=[];
 const read=createCompanyOsRead({tenant:'fixture',pageSize,readSignups,query:async req=>{
  calls.push(req);
  return override ? override(req) : {data:parsed[req.spec.entity].slice(req.spec.offset,req.spec.offset+req.spec.limit)};
 }});
 return {read,calls};
}
test('fixed Company OS queries, multiple pages, only projected fields, test HTTP end to end',async()=>{
 const {read,calls}=fixture();
 const server=createServer(createPartnerHandler({tenant:'fixture',token:'fixture_abcdefghijklmnopqrstuvwxyz1234',read,catalog:new Map([['trial-id','trial'],['class-id','single-class']])}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/v1/reports/activity?from=2026-11-01&to=2026-11-01',{headers:{Authorization:'Bearer fixture_abcdefghijklmnopqrstuvwxyz1234'}});
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{timezone:'America/Bogota',currency:'COP',purchases:[
   {date:'2026-11-01',amount_cop:35000,product:'trial'},{date:'2026-11-01',amount_cop:55000,product:'single-class'}
  ],daily:[{date:'2026-11-01',sign_ups:1,bookings:2,attended:1}]});
 }finally{await new Promise(r=>server.close(r));}
 const pay=calls.filter(x=>x.spec.entity==='payment'), book=calls.filter(x=>x.spec.entity==='booking');
 assert.deepEqual(pay.map(x=>x.spec.offset),[0,1,2]);
 assert.deepEqual(book.map(x=>x.spec.offset),[0,1,2]);
 assert.ok(calls.every(x=>x.path==='/t/fixture/query'&&x.method==='POST'));
 assert.deepEqual(book[0].spec.include,[{field:'occurrence',as:'report_occurrence',fields:['starts_at']}]);
 assert.deepEqual(pay[0].spec.filter.and.map(x=>[x.field,x.op,x.value]),[['status','eq','approved'],['approved_at','gte',dates.start],['approved_at','lt',dates.end]]);
});
test('rejects wrong tenant before any query',async()=>{
 const {read,calls}=fixture();await assert.rejects(read({...dates,tenant:'other'}));assert.equal(calls.length,0);
});
test('fails closed on duplicate/repeated pages, inaccessible join, cap overflow, bad payment amount and missing signup coverage',async()=>{
 for(const [override,readSignups,limit] of [
  [()=>({data:[parsed.payment[0]]}),signup,7],
  [r=>r.spec.entity==='booking'?{data:[row('missing',{status:'booked',report_occurrence:null})]}:{data:[]},signup,7],
  [undefined,signup,1],
  [r=>r.spec.entity==='payment'?{data:[row('bad-money',{status:'approved',approved_at:instant,amount:'35000'})]}:{data:[]},signup,7],
  [undefined,async()=>({complete:false,rows:[]}),7],
  [undefined,async()=>({complete:true,rows:[{day:'2026-11-01',count:1},{day:'2026-11-01',count:1}]}),7]
 ])await assert.rejects(fixture({override,readSignups}).read({...dates,limit}));
});
