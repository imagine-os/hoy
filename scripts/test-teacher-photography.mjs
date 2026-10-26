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
  console.log('Teacher photography passed: stable IDs, distinct Andrea, pending profiles, base-relative assets, placements and catalogue drift');
} finally {
  await rm(temp, { recursive: true, force: true });
}
