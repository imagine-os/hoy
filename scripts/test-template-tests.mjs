import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testPayload, validTestRecipient, liveSource, testRefusal, deliveryErrorKey }
  from '../src/notifications/templateTests.ts';

assert.equal(validTestRecipient('admin@example.com'),true);
for (const bad of ['', 'a@example.com,b@example.com', 'Name <a@example.com>', 'a@example.com\nBcc:x@example.com']) assert.equal(validTestRecipient(bad),false);
const live={id:'template',subject:'Hello {{person.name}}',body:'Live body',body_html:''};
const before=structuredClone(live);
assert.deepEqual(testPayload(live,' reviewer@example.com ','live',null),{templateId:'template',recipient:'reviewer@example.com',mode:'live',source:{subject:live.subject,body:live.body,bodyHtml:''}});
assert.deepEqual(testPayload(live,'reviewer@example.com','draft',{subject:'Draft',body:'Unpublished'}).draft,{subject:'Draft',body:'Unpublished'});
assert.deepEqual(live,before);
assert.throws(()=>testPayload(live,'a@example.com','draft',null));
// Live source is always the current live copy, even with an older draft base open.
const liveRow={id:'row-9',subject:'Current {{person.name}}',body:'Current body',body_html:'<p>x</p>',extra:'ignored'};
assert.deepEqual(liveSource(liveRow),{id:'row-9',subject:'Current {{person.name}}',body:'Current body',body_html:'<p>x</p>'});
const staleBase={id:'row-9',subject:'Older',body:'Older body'};
const livePayload=testPayload(liveSource(liveRow),'a@example.com','live',null);
assert.equal(livePayload.source.subject,'Current {{person.name}}');assert.notEqual(livePayload.source.subject,staleBase.subject);
const draftPayload=testPayload(liveSource(liveRow),'a@example.com','draft',{subject:'Draft',body:'D'});
assert.equal(draftPayload.draft.subject,'Draft');assert.equal(draftPayload.source.body,'Current body');
assert.equal(JSON.parse(readFileSync(new URL('../company-os.json',import.meta.url),'utf8')).requires,'>=1.18.0');
// Refusal mapping; `errorCode(e)` yields the code from either shape (server `.code`, browser `Error(message)`), the UI script drives the server shape.
const server=Object.assign(new Error('template_changed'),{code:'template_changed',status:409});
assert.deepEqual(testRefusal(server.code,server.status),{key:'changed',definitive:true});
assert.deepEqual(testRefusal(new Error('test_rate_limit').message),{key:'rateLimit',definitive:true});
assert.deepEqual(testRefusal('test_sample_missing',422),{key:'sampleMissing',definitive:true});
assert.deepEqual(testRefusal('template_tests_disabled',403),{key:'disabled',definitive:true});
assert.deepEqual(testRefusal('response_lost',503),{key:'failed',definitive:false});
assert.deepEqual(testRefusal('test_rate_limit',503),{key:'rateLimit',definitive:false});
assert.deepEqual(testRefusal('failed'),{key:'failed',definitive:false});
for (const [code,status,key] of [['test_link_base_missing',409,'linkBase'],['test_sample_invalid',422,'sampleInvalid'],['invalid_test_mode',400,'invalidMode'],['unsafe_html',422,'unsafeHtml'],['invalid_test_request',400,'invalidRequest']]) {
  assert.deepEqual(testRefusal(code,status),{key,definitive:true},code);
  assert.deepEqual(testRefusal(code,503),{key,definitive:false},code+' 5xx keeps key');
}
assert.deepEqual(testRefusal('not_found',404),{key:'gone',definitive:true});
assert.deepEqual(testRefusal('failed',404),{key:'gone',definitive:true});
assert.deepEqual(testRefusal('',404),{key:'gone',definitive:true});
assert.deepEqual(testRefusal('response_lost',503),{key:'failed',definitive:false});
// Delivery error codes in history rows.
for (const [c,k] of [['contact_suppressed','errSuppressed'],['contact_unsubscribed','errUnsubscribed'],['bounced','errBounced'],['provider_error','errProvider']]) assert.equal(deliveryErrorKey(c),k);
assert.equal(deliveryErrorKey('weird_code'),'errOther');
// Recipient check close to zod's .email().
for (const ok of ['a@example.com','first.last@sub.example.co','a+tag@example.io',"o'neil@example.com"]) assert.equal(validTestRecipient(ok),true,ok);
for (const bad of ['a..b@example.com','.a@example.com','a.@example.com','a@example','a@example.c','a@example.c1','a@-example.com','a@example..com','a b@example.com','@example.com','a@@example.com','a@example.com.']) assert.equal(validTestRecipient(bad),false,bad);
console.log('Template test request validation and draft isolation passed.');
