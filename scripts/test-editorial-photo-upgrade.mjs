import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'hoy-editorial-upgrade-'));
const storage=new Map(),listeners=[];
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
globalThis.window={addEventListener:(type,listener)=>{if(type==='storage')listeners.push(listener);}};
try{
 const outfile=join(scratch,'upgrade.mjs');
 await build({stdin:{contents:"export {MockProvider,SEED_VERSION} from './src/data/MockProvider';export {editorialPhotoSlots} from './src/data/studioPhotography';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':'"/"'},outfile,logLevel:'silent'});
 const {MockProvider,SEED_VERSION,editorialPhotoSlots}=await import(pathToFileURL(outfile));
 // Start with a real persisted provider database, then remove only the five rows absent before this release.
 new MockProvider();
 const old=JSON.parse(storage.get('hoyos.db.v1')),keys=editorialPhotoSlots.map(s=>s.key);
 old.db.media_assets=old.db.media_assets.filter(r=>!keys.includes(r.slot_key));
 old.db.media_assets[0].label={es:'Edición existente',en:'Existing edit'};
 old.db.content_articles[0].title={es:'Contenido conservado',en:'Preserved content'};
 old.db.users[0].upgrade_canary='keep-user-data';
 assert.equal(old.version,SEED_VERSION);
 const before=structuredClone(old.db);
 storage.set('hoyos.db.v1',JSON.stringify(old));
 const provider=new MockProvider(),onStorage=listeners.at(-1);
 const read=()=>JSON.parse(storage.get('hoyos.db.v1'));
 const upgraded=read();
 for(const key of keys){const rows=upgraded.db.media_assets.filter(r=>r.slot_key===key);assert.equal(rows.length,1,`existing same-day cache must gain ${key}`);assert.equal(rows[0].status,'pending');assert.equal(rows[0].url,null);}
 assert.equal(upgraded.db.media_assets.length,before.media_assets.length+5);
 for(const [table,rows] of Object.entries(before))assert.deepEqual(upgraded.db[table].filter(r=>rows.some(old=>old.id===r.id)),rows,`${table}: existing rows preserved`);
 const stable=JSON.stringify(upgraded.db);
 new MockProvider();new MockProvider();assert.equal(JSON.stringify(read().db),stable,'repeated loads must be idempotent');
 // A pre-existing custom-ID slot is an edit, not a missing seed row. Preserve ready and pending edits alike.
 const edited=read();
 const slot=edited.db.media_assets.find(r=>r.slot_key===keys[0]);Object.assign(slot,{id:'custom_editorial_slot',url:'https://example.test/edited.webp',status:'ready',credit:'Existing credit',alt:{es:'Texto existente',en:'Existing alt'}});
 const pending=edited.db.media_assets.find(r=>r.slot_key===keys[1]);Object.assign(pending,{status:'pending',url:'https://example.test/draft.webp',label:{es:'Borrador',en:'Draft'}});
 storage.set('hoyos.db.v1',JSON.stringify(edited));new MockProvider();assert.deepEqual(read().db.media_assets,edited.db.media_assets,'CMS edits must remain byte-for-byte unchanged');
 // Cross-tab snapshots from an older tab must not remove the newly available checklist slots.
 const changed=[];provider.subscribe('media_assets',event=>changed.push(event));
 onStorage({key:'hoyos.db.v1',newValue:JSON.stringify(old)});
 assert.equal(provider.peek('media_assets').filter(r=>keys.includes(r.slot_key)).length,5,'storage reload backfills the same five slots');
 assert.equal(read().db.media_assets.filter(r=>keys.includes(r.slot_key)).length,5,'cross-tab upgrade persisted');
 const once=JSON.stringify(read().db.media_assets);
 onStorage({key:'hoyos.db.v1',newValue:JSON.stringify(old)});assert.equal(JSON.stringify(read().db.media_assets),once,'repeated cross-tab snapshots remain idempotent');
 assert(changed.some(e=>e.type==='reset'));
 console.log('Editorial photo upgrade passed: old same-day database, exactly five additions, all existing rows preserved, custom CMS IDs/edits, repeated-load and cross-tab idempotency');
}finally{await rm(scratch,{recursive:true,force:true});}
