import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const temp = await mkdtemp(join(tmpdir(), 'hoy-teacher-photos-'));
try {
  const output = join(temp, 'photography.mjs');
  await build({ entryPoints: ['src/modules/website/photography.ts'], bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': JSON.stringify('https://example.test/hoy/') }, outfile: output });
  const { teacherStudioPhoto } = await import(pathToFileURL(output));
  for (const [id, asset] of [['tea_andre', 'teacher-andre-cardona'], ['tea_clara', 'teacher-clara'], ['tea_raghu', 'teacher-raghu'], ['tea_leandro', 'teacher-leandro'], ['tea_carolina', 'teacher-carolina']]) {
    assert.equal(teacherStudioPhoto(id), `https://example.test/hoy/images/studio-2026/${asset}-960.webp`);
    for (const width of [480, 960]) assert((await readFile(`public/images/studio-2026/${asset}-${width}.webp`)).length > 0);
  }
  for (const id of ['tea_andrea', 'tea_jennifer', 'unknown']) assert.equal(teacherStudioPhoto(id), undefined, `${id} stays unassigned`);
  const verified = {tea_raghu:'teacher-raghu',tea_leandro:'teacher-leandro',tea_andre:'teacher-andre-cardona',tea_clara:'teacher-clara',tea_sara_e:'teacher-sara-estrada',tea_sara_c:'teacher-sara-crismatt',tea_maria_camila:'teacher-maria-camila',tea_tatiana:'teacher-tatiana'};
  for (const [id,asset] of Object.entries(verified)) {
    for (const version of ['latest','photos']) assert.equal(teacherStudioPhoto(id,version),`https://example.test/hoy/images/studio-2026/${asset}-960.webp`,`${id}: ${version} gets the exact verified fallback`);
    for (const version of ['classic','archive']) assert.equal(teacherStudioPhoto(id,version),undefined,`${version} remains unchanged`);
  }
  assert.equal(teacherStudioPhoto('tea_carolina','latest'),undefined,'Carolina stays pending in Latest');
  assert(teacherStudioPhoto('tea_carolina','photos').endsWith('teacher-carolina-960.webp'),'Carolina keeps the existing Photos fallback');
  for (const version of ['latest','photos','classic','archive']) for (const id of ['tea_andrea','tea_jennifer']) assert.equal(teacherStudioPhoto(id,version),undefined);
  const before = await readFile('src/data/mediaCatalog.generated.json', 'utf8');
  execFileSync(process.execPath, ['scripts/gen-media-catalog.mjs']);
  assert.equal(await readFile('src/data/mediaCatalog.generated.json', 'utf8'), before, 'generated media catalogue must not drift');
  const catalog = JSON.parse(before);
  for (const [asset, id] of [['teacher-andre-cardona', 'tea_andre'], ['teacher-clara', 'tea_clara']]) {
    const uses = catalog.find(a => a.id === `images/studio-2026/${asset}.webp`).usages;
    for (const path of ['/site?version=photos', '/site/teachers?version=photos']) assert(uses.some(u => u.path === path && u.state === 'draft' && u.evidence.includes(`teachers:${id}:fallback`)));
  }
  const group = catalog.find(a => a.id === 'images/studio-2026/hero-group.webp');
  assert(group.usages.some(u => u.path === '/site?version=photos' && u.state === 'draft'));
  assert(group.usages.some(u => u.path === '/site' && u.state === 'live'));
  for (const [id,asset] of Object.entries(verified)) {
    const uses=catalog.find(a=>a.id===`images/studio-2026/${asset}.webp`).usages;
    assert.deepEqual(uses.filter(u=>u.state==='live').map(u=>u.path).sort(),['/site','/site/teachers']);
    assert(uses.every(u=>u.evidence.includes(`teachers:${id}:fallback`)));
  }
  assert(catalog.find(a=>a.id==='images/studio-2026/teacher-carolina.webp').usages.every(u=>u.state==='draft' && u.path.endsWith('?version=photos')),'Carolina gets no new default placement');
  console.log('Teacher photography passed: stable IDs, distinct Andrea, pending profiles, base-relative assets, placements and catalogue drift');
} finally {
  await rm(temp, { recursive: true, force: true });
}
