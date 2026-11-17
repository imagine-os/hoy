import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testPayload, validTestRecipient, liveSource } from '../src/notifications/templateTests.ts';

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
assert.equal(JSON.parse(readFileSync(new URL('../company-os.json',import.meta.url),'utf8')).requires,'>=1.19.0');
const editor=readFileSync(new URL('../src/notifications/TemplateEditor.tsx',import.meta.url),'utf8');
assert.ok(!/draft && base \? base : live/.test(editor),'panel source must not depend on the draft base');
assert.ok(!/approv|aprobaci/i.test(readFileSync(new URL('../src/modules/notifications/index.ts',import.meta.url),'utf8').split('\n').filter(l=>l.includes('emailTest.')).join('\n')),'no approval wording in emailTest strings');
console.log('Template test request validation and draft isolation passed.');
