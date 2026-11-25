import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const out = mkdtempSync(join(tmpdir(), 'hoy-meta-static-'));
const build = (testPixel = '', testOrigin = '') => spawnSync(process.execPath, [
  'node_modules/vite/bin/vite.js', 'build', '--config', 'meta-qa.static.vite.config.ts',
  '--outDir', out, '--emptyOutDir',
], { encoding: 'utf8', env: { ...process.env, HOY_QA_TEST_PIXEL_ID: testPixel, HOY_QA_TEST_ORIGIN: testOrigin } });
const frameFile = () => readFileSync(join(out, 'meta-measurement-frame.html'), 'utf8');
try {
  let result = build();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(out).sort(), ['assets', 'meta-measurement-frame.html', 'meta-qa.html']);
  assert.match(frameFile(), /default-src 'none'/);
  assert.doesNotMatch(frameFile(), /<script|facebook|963759066544104/);
  assert.notEqual(build('963759066544104', 'https://qa.example.invalid').status, 0);
  assert.notEqual(build('123456789012345', 'https://test.hoyhumanclub.com').status, 0);
  assert.notEqual(build('123456789012345', 'http://qa.example.invalid').status, 0);
  assert.notEqual(build('123456789012345', '').status, 0);
  const fakeOrigin = 'https://qa.example.invalid';
  result = build('123456789012345', fakeOrigin);
  assert.equal(result.status, 0, result.stderr);
  const frame = frameFile();
  assert.doesNotMatch(frame, /963759066544104/);
  const script = frame.match(/<script>([\s\S]+)<\/script>/)[1];
  assert.ok(frame.includes("'sha256-" + createHash('sha256').update(script).digest('base64') + "'"));
  const run = origin => {
    let handler;
    let loads = 0;
    const parent = {};
    const window = {};
    runInNewContext(script, {
      parent, window, location: { origin, search: '', hash: '' },
      addEventListener: (_, callback) => { handler = callback; },
      document: { referrer: '', createElement: () => ({}), head: { append: () => { loads++; } } },
    });
    assert.equal(loads, 0);
    handler?.({ origin, source: parent, data: { type: 'hoy.meta.event.v1', event: { name: 'PageView' } } });
    return { loads, queue: JSON.parse(JSON.stringify(window.fbq?.queue.map(args => Array.from(args)) ?? [])) };
  };
  assert.deepEqual(run('https://unrelated.example.invalid'), { loads: 0, queue: [] });
  assert.equal(run(fakeOrigin).loads, 1);
  assert.deepEqual(run(fakeOrigin).queue.at(-1), ['trackSingle', '123456789012345', 'PageView', {}]);
  console.log('PASS: separate static QA build defaults off, rejects HOY hosts and the production destination, and enforces the exact test origin and bridge CSP hash. No vendor requests sent.');
} finally { rmSync(out, { force: true, recursive: true }); }
