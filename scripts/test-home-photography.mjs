import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'hoy-home-photos-'));
try{
 const outfile=join(dir,'photos.mjs');
 await build({stdin:{contents:"export * from './src/modules/website/photography';export * from './src/data/studioPhotography';export {mediaAssets} from './src/data/seed/media';export {buildMediaLibrary} from './src/data/mediaLibrary';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':JSON.stringify('/hoy/')},outfile});
 const {practicePhotos,planPhotos,practiceStudioPhoto,planStudioPhoto,philosophyStudioPhoto,mediaAssets,buildMediaLibrary}=await import(pathToFileURL(outfile));
 const expected={ligereza:'practice-ligereza',hibrido:'practice-hibrido',fuego:'practice-fuego',solido:'practice-solido',centro:'practice-centro',alineacion:'practice-alineacion',pulso:'practice-pulso'};
 assert.deepEqual(practicePhotos,expected);
 assert.deepEqual(planPhotos,{pack12:'pricing-duo',pack12_smtc:undefined,trial:'plan-trial',single:'plan-single'});
 for(const version of ['latest','photos']){
  for(const [slug,name] of Object.entries(expected))assert.equal(practiceStudioPhoto(slug,version),`/hoy/images/studio-2026/${name}-960.webp`);
  assert.equal(philosophyStudioPhoto(version),'/hoy/images/sanctuary/mountains.webp');
  assert.equal(planStudioPhoto('pack12_smtc',version),undefined,'unmatched original stays held');
  for(const [id,name] of Object.entries(planPhotos))if(name)assert.equal(planStudioPhoto(id,version),`/hoy/images/studio-2026/${name}-960.webp`);
 }
 for(const version of ['classic','archive']){
  for(const slug of Object.keys(expected))assert.equal(practiceStudioPhoto(slug,version),undefined);
  assert.equal(philosophyStudioPhoto(version),undefined);assert.equal(planStudioPhoto('pack12',version),undefined);
 }
 for(const key of ['site.home.philosophy','site.plans.pack12','site.plans.pack12_smtc','site.plans.trial','site.plans.single']){
  const row=mediaAssets.find(a=>a.slot_key===key);assert(row);assert.equal(row.id,`med_${key.replace(/\./g,'_')}`);assert.equal(row.status,'pending');assert.equal(row.url,null);
 }
 const before=await readFile('src/data/mediaCatalog.generated.json','utf8');execFileSync(process.execPath,['scripts/gen-media-catalog.mjs']);assert.equal(await readFile('src/data/mediaCatalog.generated.json','utf8'),before,'catalogue drift');
 const catalog=JSON.parse(before);
 for(const [slug,name] of Object.entries(expected)){
  const a=catalog.find(a=>a.id===`images/studio-2026/${name}.webp`);assert(a);assert.equal(a.width,960);assert(a.height>=1430&&a.height<=1445);
  assert(a.usages.some(u=>u.path==='/site'&&u.state==='live'&&u.evidence.includes(`photo_slots:site.classes.${slug}:fallback`)));
  assert(a.usages.some(u=>u.path==='/site?version=photos'&&u.state==='draft'));
  for(const width of [480,960])assert((await readFile(`public/images/studio-2026/${name}-${width}.webp`)).length>0);
 }
 for(const name of ['finale-red-slats','facility-equipment']){
  const a=catalog.find(a=>a.id===`images/studio-2026/${name}.webp`);assert(a);
  assert.deepEqual(a.usages.map(u=>[u.path,u.state]).sort(),[['/site','live'],['/site?version=photos','draft']]);
 }
 const finale=catalog.find(a=>a.id==='images/studio-2026/finale-red-slats.webp');assert.equal(finale.width/finale.height,2/3);assert.equal(finale.variants.length,3);
 const base={id:'qa_photo' ,tenant_id:'hoy',created_at:'2026-10-26',updated_at:'2026-10-26',slot_key:'site.classes.fuego',kind:'photo',ratio:'2 / 3',label:{es:'QA',en:'QA'},alt:{es:'QA',en:'QA'},brief:{es:'',en:''},tone:null,url:'https://example.test/override.jpg',credit:null,status:'ready',sort:0};
 const get=(slots,id)=>buildMediaLibrary(slots,[],[]).find(a=>a.id===id);
 const id='images/studio-2026/practice-fuego.webp';
 assert(get([base],id).usages.every(u=>u.state==='inactive'),'ready photo deactivates packaged fallback');
 assert(get([{...base,status:'pending'}],id).usages.some(u=>u.state==='live'),'pending CMS draft does not hide fallback');
 assert(get([{...base,kind:'video'}],id).usages.some(u=>u.state==='live'),'non-photo does not hide photo-only fallback');
 const plans=buildMediaLibrary([{...base,slot_key:'site.plans.trial'}],[],[]);
 const override=plans.find(a=>a.url===base.url);assert.deepEqual(override.usages.map(u=>u.path).sort(),['/site/plans','/site/plans?version=photos']);
 assert(plans.find(a=>a.id==='images/studio-2026/plan-trial.webp').usages.every(u=>u.state==='inactive'));
 console.log('Home photography passed: exact maps, held source, editions, stable CMS slots, override/draft/kind projection, catalogue and responsive assets');
}finally{await rm(dir,{recursive:true,force:true});}
