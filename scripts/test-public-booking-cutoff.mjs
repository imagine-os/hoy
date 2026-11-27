import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({
  stdin: { contents: `export { publicBookingClosed, publicSessionUnavailableReason } from './src/data/publicBookingCutoff';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const { publicBookingClosed, publicSessionUnavailableReason } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const now = Date.parse('2026-12-01T12:00:00Z');
const row = (starts_at, status = 'scheduled') => ({ session: { status, starts_at, ends_at: new Date(Date.parse(starts_at) + 3600000).toISOString() }, modality: { active: true } });
assert.equal(publicBookingClosed('2026-12-07T04:59:59.999Z'), false, 'December 6 Bogotá remains open');
assert.equal(publicBookingClosed('2026-12-07T05:00:00.000Z'), true, 'first instant December 7 Bogotá closes');
assert.equal(publicBookingClosed('2026-12-08T10:00:00-05:00'), true);
assert.equal(publicBookingClosed('invalid'), false);
assert.equal(publicSessionUnavailableReason(row('2026-12-07T04:59:59.999Z'), now), null);
assert.equal(publicSessionUnavailableReason(row('2026-12-07T05:00:00Z'), now), 'public_booking_closed');
assert.equal(publicSessionUnavailableReason(row('2026-12-08T10:00:00Z', 'cancelled'), now), 'cancelled');
assert.equal(publicSessionUnavailableReason(row('2026-12-08T10:00:00Z', 'completed'), now), 'completed');
assert.equal(publicSessionUnavailableReason(row('2026-12-08T10:00:00Z'), Date.parse('2026-12-09T12:00:00Z')), 'ended');
console.log('9 public booking cutoff checks passed');
