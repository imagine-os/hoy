import assert from 'node:assert/strict';
import { allowedEvent, checkoutEvent, classView, classifyProduct, registrationCreated, routeEligible } from '../src/measurement/pixelPolicy.ts';

assert.equal(routeEligible('/site/plans'), true);
assert.equal(routeEligible('/app/class/session-A'), true);
assert.equal(routeEligible('/app/class/session-B'), true);
for (const p of ['/app/pass/my-code','/app/bookings/abc','/app/checkout/id?email=demo@example.invalid','/app/pay/product/private','/auth/callback','/app/profile','/staff/checkin','/hub','/app/class/secret/receipt','/app/account']) assert.equal(routeEligible(p), false);
assert.deepEqual(allowedEvent({name:'PageView', url:'private', referrer:'anything'}), {name:'PageView'});
assert.deepEqual(allowedEvent({name:'ViewContent', params:{content_name:'Private client', emails:['name@example.invalid'], content_ids:['paid-ref']}}), classView());
assert.deepEqual(checkoutEvent(35000, classifyProduct('trial')), {name:'InitiateCheckout', params:{value:35000,currency:'COP',content_name:'Trial class'}});
assert.equal(checkoutEvent(0, 'Trial class'), null);
assert.equal(checkoutEvent(3_500_000.5, 'Trial class'), null);
assert.equal(checkoutEvent('35000', 'Trial class'), null);
for (const kind of ['group','gift','private','pack12_smtc','other']) assert.equal(classifyProduct(kind), null);
for (const s of [200,409,422,500]) assert.equal(registrationCreated(s),null);
assert.deepEqual(registrationCreated(201),{name:'CompleteRegistration'});
assert.equal(allowedEvent({name:'Purchase', params:{ status:'APPROVED', source:'review', ref:'wmp_fake', value:35000}}), null);
console.log('measurement policy: strict payload, route, status, and fail-closed Purchase checks passed');
