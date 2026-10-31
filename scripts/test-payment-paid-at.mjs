// Hoy all-roles (lane C, found by lane B's seed): a payment's `paid_at` in the production build is the day Company OS
// approved it (`payment.approved_at`, set by the server, payments 2.8.0), not the record's last update: a seeded or
// later-edited payment showed the wrong date. `updatedAt` stays the fallback only when `approved_at` is missing.
// Run: node scripts/test-payment-paid-at.mjs   (esbuild bundles the TS source)
import { build } from 'esbuild';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const out = await build({ stdin: { contents: "export { adapterFor, fromRecord } from './src/data/companyos/mapping';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false}' } });
const M = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const a = M.adapterFor('payments');
const row = (data, updatedAt = '2026-10-30T20:00:00.000Z') => M.fromRecord(a, { id: 'pay_1', data: { person: 'per_1', amount: 100000, status: 'approved', ...data }, createdAt: '2026-10-01T10:00:00.000Z', updatedAt });
const day = (v) => (typeof v === 'string' ? new Date(v).toISOString() : v);
check('paid_at is approved_at when Company OS sends it', day(row({ approved_at: '2026-10-05T15:30:00.000Z' }).paid_at) === '2026-10-05T15:30:00.000Z', String(row({ approved_at: '2026-10-05T15:30:00.000Z' }).paid_at));
check('paid_at falls back to the last update only when approved_at is missing', day(row({}).paid_at) === '2026-10-30T20:00:00.000Z' && day(row({ approved_at: null }).paid_at) === '2026-10-30T20:00:00.000Z', String(row({}).paid_at));
check('a payment that is not approved has no paid_at (even with approved_at)', row({ status: 'pending', approved_at: '2026-10-05T15:30:00.000Z' }).paid_at === null);
check('a malformed approved_at is not shown as a date (falls back)', day(row({ approved_at: 'yesterday' }).paid_at) === '2026-10-30T20:00:00.000Z', String(row({ approved_at: 'yesterday' }).paid_at));
console.log(failed ? `\n${failed} paid_at check(s) failed` : '\npaid_at passed');
process.exitCode = failed ? 1 : 0;
