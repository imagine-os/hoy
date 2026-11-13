import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'hoy-public-class-'));
try {
 const outfile=join(scratch,'photo.mjs');
 await build({entryPoints:['src/modules/website/classPhotoPresentation.ts'],bundle:true,platform:'node',format:'esm',outfile,define:{'import.meta.env.BASE_URL':'"/"'}});
 const {classPhotoPresentation:photo}=await import(pathToFileURL(outfile));
 for(const slug of ['ligereza','hibrido','fuego','solido','pulso','alineacion','centro']) {
  const p=photo(slug,new Map(),'latest');assert(p.photoUrl?.endsWith('.webp'));assert(!p.photoUrl.includes('undefined'));assert(p.naturalPhoto);
  assert.deepEqual(photo(slug,new Map([[slug,'https://example.test/cms.webp']]),'latest'),{photoUrl:'https://example.test/cms.webp',naturalPhoto:false});
  for(const version of ['classic','archive'])assert.deepEqual(photo(slug,new Map(),version),{photoUrl:undefined,naturalPhoto:false});
 }
 for(const page of ['HomePage','ClassesPage','ClassDetailPage'])assert((await readFile(`src/modules/website/pages/${page}.tsx`,'utf8')).includes('...classPhotoPresentation('));
 const contact=await readFile('src/modules/website/pages/ContactPage.tsx','utf8');
 assert(contact.includes('type="tel"'));assert(contact.includes("phone: form.phone || '—'"));assert(contact.includes("wa.link('frontDesk', text)"));assert(!contact.includes('tenant.dialCode'));
 console.log('PASS shared class photos, CMS priority, historical editions, international visitor field and unchanged destination contract');
}finally{await rm(scratch,{recursive:true,force:true});}
