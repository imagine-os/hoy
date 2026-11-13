import assert from 'node:assert/strict';
import { testPayload, validTestRecipient } from '../src/notifications/templateTests.ts';

assert.equal(validTestRecipient('admin@example.com'),true);
for (const bad of ['', 'a@example.com,b@example.com', 'Name <a@example.com>', 'a@example.com\nBcc:x@example.com']) assert.equal(validTestRecipient(bad),false);
const live={id:'template',subject:'Hello {{person.name}}',body:'Live body',body_html:''};
const before=structuredClone(live);
assert.deepEqual(testPayload(live,' reviewer@example.com ','live',null),{templateId:'template',recipient:'reviewer@example.com',mode:'live',source:{subject:live.subject,body:live.body,bodyHtml:''}});
assert.deepEqual(testPayload(live,'reviewer@example.com','draft',{subject:'Draft',body:'Unpublished'}).draft,{subject:'Draft',body:'Unpublished'});
assert.deepEqual(live,before);
assert.throws(()=>testPayload(live,'a@example.com','draft',null));
console.log('Template test request validation and draft isolation passed.');
