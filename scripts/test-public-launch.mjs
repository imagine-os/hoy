import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp('/tmp/hoy-launch-');
try {
  const file = `${scratch}/launch.mjs`;
  await build({ entryPoints: ['src/modules/coming-soon/launch.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file });
  const { publicSiteLaunched, PUBLIC_LAUNCH_DATE } = await import(pathToFileURL(file));
  assert.equal(PUBLIC_LAUNCH_DATE, '2026-10-30');
  for (const [time, expected] of [
    ['2026-10-29T23:59:59Z', false], ['2026-10-30T04:59:59.999Z', false],
    ['2026-10-30T05:00:00Z', true], ['2026-10-31T00:00:00Z', true],
    ['2027-01-01T00:00:00Z', true],
  ]) assert.equal(publicSiteLaunched(new Date(time), 'America/Bogota'), expected, time);
  assert.equal(publicSiteLaunched(new Date(NaN), 'America/Bogota'), false);
  assert.equal(publicSiteLaunched(new Date('2026-10-30T00:00:00Z'), 'UTC'), true);
  console.log('PASS SW-08 studio midnight, ±1ms boundary, later dates, invalid clock and timezone');
} finally { await rm(scratch, { recursive: true, force: true }); }
