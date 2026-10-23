import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAUNCH_EMAIL_EVENTS as events,renderLaunchPreview,filterLaunchEvents,adjacentLaunchEvent} from '../src/modules/email-previews/catalog.ts';
const expected=['welcome','sign-in-code','booking-pending-payment','payment-confirmed','payment-rejected','booking-released','rescheduled','class-cancelled','voucher-received','receipt'];
assert.deepEqual(events.map(e=>e.id),expected);
// Preserve the literal source requirement separately from preview identifiers.
const manifest=JSON.parse(readFileSync('docs/frontend-completion/features.json'));
const rows=Array.isArray(manifest)?manifest:manifest.features??manifest.rows;
assert.equal(rows.find(e=>e.id==='NT-02').criterion,'Sent on the right trigger: welcome, sign-in code, booking pending payment, payment confirmed, payment rejected, booking released, rescheduled, class cancelled, voucher received and receipt.');
for(const lang of ['en','es'])for(const e of events){const r=renderLaunchPreview(e,lang);assert.equal(r.status,'ready');assert(r.subject.startsWith('[SIM]'));assert(r.body.trim());assert(e.when[lang]&&e.gap[lang]);assert(!r.body.includes('{{'));assert.equal(filterLaunchEvents(events,e.name[lang],lang)[0].id,e.id);assert.equal(renderLaunchPreview(e,lang,'empty').status,'empty');assert.equal(renderLaunchPreview(e,lang,'error').status,'error');assert.equal(renderLaunchPreview({...e,body:{en:'',es:''}},lang).status,'error');}
assert.equal(renderLaunchPreview(undefined,'en').status,'empty');
assert.deepEqual(filterLaunchEvents(events,'no-such-event','en'),[]);
assert.equal(adjacentLaunchEvent(events,'welcome',-1),'welcome');assert.equal(adjacentLaunchEvent(events,'receipt',1),'receipt');assert.equal(adjacentLaunchEvent([],'',1),null);
assert.equal(events.find(e=>e.id==='sign-in-code').catalogKey,null,'reset/verify templates must not stand in for sign-in');
assert.notEqual(events.find(e=>e.id==='receipt').body.en,events.find(e=>e.id==='payment-confirmed').body.en);
for(const file of ['src/modules/email-previews/catalog.ts','src/components/organism/LaunchEmailPreviews/LaunchEmailPreviews.tsx']){const s=readFileSync(file,'utf8');assert(!/useData|useSession|localStorage|sessionStorage|fetch\(|setTimeout\(|message_log/.test(s),file+' remains isolated');}
console.log('NT-02: exact ten source events, EN/ES rendering, distinct receipt/confirmation, mapping gaps, empty/error, filter and bounded navigation pass.');
