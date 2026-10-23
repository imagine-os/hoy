import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp('/tmp/hoy-public-mvp-');
try{
 for(const [name,entry]of [['pricing','src/modules/website/publicHomePricing.ts'],['contacts','src/components/molecule/PublicWhatsappLink/whatsappTarget.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`${dir}/${name}.mjs`,logLevel:'silent'});
 const {publicHomeOffer}=await import(pathToFileURL(`${dir}/pricing.mjs`));
 const {whatsappDigits,publicWhatsappTarget}=await import(pathToFileURL(`${dir}/contacts.mjs`));
 for(const bad of ['', '  ', 'bad', '+1 202 555 0101 ext123', 'https://wa.me/12025550101', '1234567', '0123456789', '1234567890123456', '+12<script>34'])assert.equal(whatsappDigits(bad),null,bad);
 assert.equal(whatsappDigits('+1 (202) 555-0101'),'12025550101');
 assert.equal(whatsappDigits('12345678'),'12345678');assert.equal(whatsappDigits('123456789012345'),'123456789012345');
 assert.deepEqual(publicWhatsappTarget('bad',['+1 202 555 0101'],'Demo & café? #1'),{href:'https://wa.me/12025550101?text=Demo%20%26%20caf%C3%A9%3F%20%231',fallback:true});
 assert.deepEqual(publicWhatsappTarget('bad',['bad','']),{href:null,fallback:false});
 const legacy=publicHomeOffer([],'pack12','2026-10-23');assert(legacy.price>0&&!legacy.published);
 const definition={code:'DEMO_PACKAGE',name:{es:'Paquete ficticio',en:'Fictional package'},type:'paquetes',classes:8,validityDays:45,active:true,prices:[{id:'one',amount:123456,startsOn:'2026-10-01',endsOn:'2026-10-31'},{id:'two',amount:654321,startsOn:'2026-11-01',endsOn:null}]};
 const draft={definition,history:[{revision:1,actorId:'usr_admin',at:'2026-10-23T12:00:00Z',definition:structuredClone(definition)}]};
 const plan={id:'plan_pack12',tenant_id:'ten_hoy',frontend_catalog:structuredClone(draft),frontend_publication:{snapshot:structuredClone(draft),revision:1,actorId:'usr_admin',at:'2026-10-23T12:00:00Z',withdrawnAt:null,history:[]}};
 assert.equal(publicHomeOffer([plan],'pack12','2026-10-23').price,123456);
 assert.equal(publicHomeOffer([plan],'pack12','2026-11-01').price,654321);
 plan.frontend_catalog.definition.prices[0].amount=999999;assert.equal(publicHomeOffer([plan],'pack12','2026-10-23').price,123456,'draft cannot leak');
 for(const id of ['trial','private'])assert.equal(publicHomeOffer([plan],id,'2026-10-23').price,null,'unpublished mapped products do not restore static price');
 assert.equal(publicHomeOffer([plan],'pack12','2026-09-30').price,null,'no dated price');
 plan.frontend_publication.withdrawnAt='2026-10-23T18:00:00Z';assert.equal(publicHomeOffer([plan],'pack12','2026-10-23').price,null,'withdrawal');
 plan.frontend_publication.withdrawnAt=null;plan.frontend_publication.snapshot.definition.prices[0].amount=0;assert.equal(publicHomeOffer([plan],'pack12','2026-10-23').price,0,'free quote is explicit zero');
 plan.frontend_publication.snapshot.definition.type='bienvenida';assert.equal(publicHomeOffer([plan],'pack12','2026-10-23').price,null,'wrong mapped family');
 plan.frontend_publication.snapshot=null;assert.equal(publicHomeOffer([plan],'pack12','2026-10-23').price,null,'corrupt snapshot is unavailable, never a render crash');
 console.log('PASS scoped public WhatsApp valid/invalid/missing/fallback/encoding; published Home quotes, dates, draft isolation, withdrawal, missing publication, zero and family bounds');
}finally{await rm(dir,{recursive:true,force:true});}
