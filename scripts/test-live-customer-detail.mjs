import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({entryPoints:['src/modules/admin/customers/customerDetail.ts'], bundle:true, platform:'node', format:'esm',write:false});
const m = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const person={id:'p1',data:{name:'Ana Example',phone:'+573001234567',email:'ana@example.test',dob:null,emergency_contact_name:null,emergency_contact_phone:null,user:'login1',private_field:'keep'}};
const calls=[];
const request=async(method,path,body,options)=>{if(body)body=JSON.parse(JSON.stringify(body));calls.push({method,path,body,options}); if(path==='/api/person/p1')return {data:structuredClone(person)};if(path==='/query')return {data:[{id:'m1',data:{person:'p1'}}]};if(path==='/batch'){for(const op of body.ops){assert.equal(op.entity,'person'); assert.equal(op.id,'p1');assert.deepEqual(person.data[op.ifMatch.field],op.ifMatch.value);Object.assign(person.data,op.data);}return {ids:body.ops.map(()=> 'p1')};}throw Error('unexpected');};
const read=await m.readCustomer(request,'p1');
assert.equal(read.person.id,'p1');assert.equal(calls.filter(c=>c.path==='/query')[0].body.filter.value,'p1');
let form=m.customerForm(read.person);form.name='Ana Updated';form.phone='+573009998887';
await m.saveCustomer(request,read,form,'fictional-key',()=>false);
assert.equal(person.data.name,'Ana Updated');assert.equal(person.data.phone,'+573009998887');assert.equal(person.data.email,'ana@example.test');assert.equal(person.data.user,'login1');assert.equal(person.data.private_field,'keep');
const write=calls.find(c=>c.path==='/batch');assert.equal(write.options.idempotencyKey,'fictional-key');assert.equal(write.body.ops.length,2);assert.deepEqual(write.body.ops.map(o=>o.ifMatch.field),['name','phone']);assert(calls.at(-2).path==='/api/person/p1'||calls.at(-1).path==='/api/person/p1');
await assert.rejects(m.readCustomer(async(method,path)=>path==='/query'?{data:[]}:{data:person},'p1'),/customer_missing/);
await assert.rejects(m.readCustomer(async(method,path)=>path==='/query'?{data:[{id:'m',data:{person:'other'}}]}:{data:person},'p1'),/customer_missing/);
await assert.rejects(m.saveCustomer(request,read,{...form,name:''},'x',()=>false),/customer_validation/);
await assert.rejects(m.saveCustomer(request,read,form,'x',()=>true),/customer_cancelled/);
const stale=structuredClone(read);stale.person.data.name='Older';await assert.rejects(m.saveCustomer(async(method,path,body)=>{if(path==='/batch')throw Error('ifMatch mismatch');return request(method,path,body);},stale,{...form,name:'Newer'},'x',()=>false),/ifMatch mismatch/);
assert(m.customerErrors({...form,dob:'2026-02-30'}).dob);
assert(!m.customerErrors({...form,dob:'2000-02-29'}).dob);
await assert.rejects(m.saveCustomer(async(method,path,body)=>path==='/batch'?{ids:['p1']}:request(method,path,body),read,{...form,name:'Not saved'},'x',()=>false),/customer_unconfirmed/);
// Missing optional fields travel with an omitted ifMatch.value, exactly as JSON transport sends them.
const missing=await m.readCustomer(request,'p1');delete person.data.emergency_contact_name;delete missing.person.data.emergency_contact_name;
await m.saveCustomer(request,missing,{...m.customerForm(missing.person),emergency_contact_name:'Contact Example'},'absent-key',()=>false);
const absent=calls.filter(c=>c.path==='/batch').at(-1).body.ops[0];assert.deepEqual(absent.ifMatch,{field:'emergency_contact_name'});assert.equal(person.data.emergency_contact_name,'Contact Example');
// A no-op must still re-read and verify; stale unchanged forms cannot report success.
const noOp=await m.readCustomer(request,'p1');person.data.name='Changed elsewhere';await assert.rejects(m.saveCustomer(request,noOp,m.customerForm(noOp.person),'noop',()=>false),/customer_unconfirmed/);
// Lost acknowledgement retries the same serialized operation/key. A backend replay performs no second write.
const retryRead=await m.readCustomer(request,'p1'), retryForm={...m.customerForm(retryRead.person),name:'Retry Example'};let reserved=null, attempts=0,effects=0;
const retryRequest=async(method,path,body,options)=>{if(path!=='/batch')return request(method,path,body,options);const fingerprint=JSON.stringify([body,options]);attempts++;if(reserved){assert.equal(fingerprint,reserved);return {ids:['p1']};}reserved=fingerprint;effects++;await request(method,path,body,options);throw Error('network_lost');};
await assert.rejects(m.saveCustomer(retryRequest,retryRead,retryForm,'retry-key',()=>false),/network_lost/);await m.saveCustomer(retryRequest,retryRead,retryForm,'retry-key',()=>false);assert.equal(attempts,2);assert.equal(effects,1);
console.log('PASS live customer detail: scoped membership, bounded writes, field conflicts, cancellation, validation, confirmed readback; fictional data only');
