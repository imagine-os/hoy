import assert from 'node:assert/strict';
import {test} from 'node:test';
import {partnerSettings,makePartnerRoute} from '../../server/partner-reporting.mjs';

const sample={HOY_PARTNER_TEST_ENABLE:'true',HOY_PARTNER_TEST_KEY:'p_test_abcdefghijk123456789012345678901234567890',
 HOY_PARTNER_TEST_EXPIRES_AT:'2026-12-03T00:00:00Z',
 HOY_PARTNER_TEST_UPSTREAM_KEY:'cos_svc_44f44444-4444-4444-4444-444444444444_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ',
 HOY_PARTNER_TEST_HISTORY_FROM:'2026-10-01',HOY_PARTNER_TEST_PRODUCTS:'{"product-1":"trial"}'};
test('off in production and without the existing test gate',()=>{
 assert.equal(partnerSettings(sample,'production',true),null);
 assert.equal(partnerSettings(sample,'test',false),null);
 assert.equal(partnerSettings({},'test',true),null);
 assert.equal(makePartnerRoute({environment:'production',testGate:{on:true},partnerReport:sample}),null);
});
test('fails closed on invalid configuration or reused public-site credential',()=>{
 assert.throws(()=>partnerSettings({...sample,HOY_PARTNER_TEST_KEY:'short'},'test',true));
 assert.throws(()=>partnerSettings(sample,'test',true,sample.HOY_PARTNER_TEST_UPSTREAM_KEY));
 const cfg=partnerSettings(sample,'test',true);
 assert.equal(cfg.products.get('product-1'),'trial');
 assert.equal(cfg.historyFrom,'2026-10-01');
});
