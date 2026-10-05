import assert from 'node:assert/strict';
import { cleanHubTarget } from '../src/app/cleanHubEntry.ts';
for (const base of ['https://example.test/','https://imagine-os.github.io/hoy/']) {
  for (const path of ['hub','hub/','hub/index.html']) {
    assert.equal(cleanHubTarget(`${base}${path}`),`${base}#/hub`);
    assert.equal(cleanHubTarget(`${base}${path}?release=check#/site?version=archive`),`${base}?release=check#/site?version=archive`);
  }
  assert.equal(cleanHubTarget(base),null);
  assert.equal(cleanHubTarget(`${base}#/hub`),null);
}
assert.equal(new URL(cleanHubTarget('https://example.test//evil.test/hub')).origin,'https://example.test');
console.log('PASS clean hub aliases preserve deployment root, explicit route and origin');
