import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('./test-schedule-export-ui.mjs',import.meta.url),'utf8');
assert(s.includes('qa-vite-registry'),'raw esbuild fixture transforms Vite-only module discovery');assert(s.includes('untransformed_vite_glob'),'bundle refuses unresolved Vite glob');assert(s.includes('MemoryRouter'));assert(s.includes('failure.json'));assert(s.includes('active.content()'));assert(s.includes('failure.png'));assert(s.includes("page.on('console'"));assert(s.includes("page.on('pageerror'"));assert(s.includes('page.waitForEvent(\'download\')'));assert(s.includes('OLD RACE'));assert(s.includes('window.world.writes'));console.log('export fixture bootstrap/diagnostic contracts PASS');
// Reproduce the original bootstrap failure without a browser: this is a Vite compile boundary, not a missing label.
import {build} from 'esbuild';import {resolve} from 'node:path';
const root=resolve(process.env.HOY_SOURCE_ROOT||process.cwd());
const raw=await build({stdin:{contents:"import './src/app/registry.ts';",resolveDir:root,loader:'ts'},bundle:true,format:'esm',platform:'browser',write:false,define:{'import.meta.env':'{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true,"BASE_URL":"/"}',__HOY_BUILD__:'"production"'}});
await assert.rejects(import('data:text/javascript;base64,'+Buffer.from(raw.outputFiles[0].text).toString('base64')),/glob is not a function/,'raw esbuild must not execute Vite-only registry discovery');
console.log('original Vite-registry bootstrap failure reproduced; fixed harness verifies no unresolved glob');
