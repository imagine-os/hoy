import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const path='src/data/mediaCatalog.generated.json',before=await readFile(path,'utf8');
execFileSync(process.execPath,['scripts/gen-media-catalog.mjs'],{stdio:'pipe'});
assert.equal(await readFile(path,'utf8'),before,'media catalogue must stay synchronized');
const catalogue=JSON.parse(before);
for(const [name,id] of [['warrior-blue','trial'],['pricing-duo','pack12']]){
 const asset=catalogue.find(a=>a.id===`images/studio-2026/${name}.webp`);assert(asset,name);
 assert.deepEqual(asset.variants,[`images/studio-2026/${name}-480.webp`,`images/studio-2026/${name}-960.webp`]);
 const home=asset.usages.filter(u=>u.label==='Home plan card');
 assert.deepEqual(home.map(u=>({path:u.path,state:u.state})),[{path:'/site',state:'live'},{path:'/site?version=photos',state:'draft'}]);
 assert(home.every(u=>u.evidence.includes(`photo_slots:site.plans.${id}:fallback`)),'existing ready CMS selection has priority');
}
assert(!catalogue.find(a=>a.id==='images/studio-2026/warrior-blue.webp').usages.some(u=>u.path.startsWith('/site/plans')));
assert(catalogue.find(a=>a.id==='images/studio-2026/pricing-duo.webp').usages.some(u=>u.path==='/site/plans'&&u.label==='Plan photograph'));
console.log('PASS exact Home media mappings, responsive assets, CMS fallbacks, Plans boundary and catalogue drift');
