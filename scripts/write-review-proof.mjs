// Called only after the Pages review build, before uploading that exact artifact. No runtime keys or customer data.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {verifyReviewBundle} from './lib/release-verifier-contracts.mjs';
const dir=process.argv[2]||'dist',expected=process.argv[3],project=process.argv[4]||'hoy';
assert(process.env.VITE_HOY_BUILD!=='production','review_proof_cannot_mark_production_build');
assert(/^[a-f0-9]{40}$/.test(expected||''),'exact_review_commit_required');
const release=JSON.parse(await readFile(join(dir,'release.json'),'utf8'));assert.equal(release.sourceCommit,expected);
const files=(await readdir(join(dir,'assets'))).filter(name=>name.endsWith('.js'));
verifyReviewBundle((await Promise.all(files.map(name=>readFile(join(dir,'assets',name),'utf8')))).join('\n'),project);
await writeFile(join(dir,'qa-review-proof.json'),JSON.stringify({kind:'review',project,sourceCommit:expected})+'\n');
