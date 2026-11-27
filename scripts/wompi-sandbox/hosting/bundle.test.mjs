import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {bundle} from './bundle.mjs';

test('bundle uses the exact source commit and contains only the checkout harness',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'hoy-wompi-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const commit='1234567890abcdef1234567890abcdef12345678';
  const dest=join(dir,'test-artifact');
  await assert.rejects(bundle({sourceCommit:'main',dest}),/invalid source identity/);
  await bundle({sourceCommit:commit,dest});
  const files=(await readdir(dest,{recursive:true})).sort();
  assert.deepEqual(files,[
    'package.json','scripts','scripts/wompi-sandbox','scripts/wompi-sandbox/hosting',
    'scripts/wompi-sandbox/hosting/entry.mjs','scripts/wompi-sandbox/hosting/host.mjs',
    'scripts/wompi-sandbox/hosting/static','scripts/wompi-sandbox/hosting/static/index.html',
    'scripts/wompi-sandbox/hosting/static/release.json','server','server/app.mjs','server/docsGate.mjs',
    'server/pageMeta.mjs','server/seo.mjs','server/testGate.mjs','server/wompi-sandbox.mjs',
    'server/wompi-test-pilot.mjs'
  ].sort());
  assert.deepEqual(JSON.parse(await readFile(join(dest,'scripts/wompi-sandbox/hosting/static/release.json'),'utf8')),{version:'wompi-isolated-probe',sourceCommit:commit});
  assert.equal(JSON.parse(await readFile(join(dest,'package.json'),'utf8')).engines.node,'24.22.3');
  await assert.rejects(bundle({sourceCommit:commit,dest}),/EEXIST/);
});
