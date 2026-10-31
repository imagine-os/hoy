// Hoy all-roles (lane C) · memberships → packs, logic level (no browser). Hoy sells class packs (decision R-05); two
// screens read the recurring `memberships` table, which has no Company OS adapter, so in production they showed
// nothing. Now:
// - C-01 the customer home's plan card shows the active pack (classes left, expiry) from the credits ledger;
// - M-01 the admin dashboard's members tile counts customers with an active pack (credit lots with classes left).
// The review build's membership rows still show where they exist (nothing removed). Fictional fixtures only.
// Run: node scripts/test-pack-reads.mjs   (esbuild bundles the TS source, like test-launch-config.mjs)
import { build } from 'esbuild';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const tryImport = async (contents) => {
  try {
    const out = await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false}' } });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { console.log(`FAIL module does not build: ${String(e.message).split('\n')[0]}`); failed++; return {}; }
};
const C = await tryImport("export * from './src/modules/customer/planCard';");
const A = await tryImport("export * from './src/modules/admin/activePacks';");

// ── C-01 plan card ──────────────────────────────────────────────────────────────────────────────────────────────
const pkg = (left, extra = {}) => ({ balance: left, left, purchase: null, expiresAt: null, frozen: false, frozenUntil: null, freezeUsed: false, ...extra });
const card = (ent) => C.planCard?.(ent) ?? null;
check('C-01 an active pack shows its classes left and its expiry', JSON.stringify(card({ membership: null, pkg: pkg(8, { expiresAt: '2026-12-31' }) })) === JSON.stringify({ kind: 'pack', left: 8, expires: '2026-12-31', frozenUntil: null }), JSON.stringify(card({ membership: null, pkg: pkg(8, { expiresAt: '2026-12-31' }) })));
check('C-01 a frozen pack says until when', card({ membership: null, pkg: pkg(5, { balance: 0, frozen: true, frozenUntil: '2026-11-15', expiresAt: '2027-01-10' }) })?.frozenUntil === '2026-11-15');
check('C-01 no pack and no membership: the nudge to buy one', card({ membership: null, pkg: pkg(0) })?.kind === 'none');
check('C-01 a pack used up is not an active pack', card({ membership: null, pkg: pkg(0, { expiresAt: '2026-12-31' }) })?.kind === 'none');
check('C-01 the review build\'s active membership still shows (nothing removed)', card({ membership: { status: 'active', renews_at: '2026-11-30', starts_at: '2026-10-30' }, pkg: pkg(0) })?.kind === 'membership' && card({ membership: { status: 'active', renews_at: null, starts_at: '2026-10-30' }, pkg: pkg(0) })?.date === '2026-10-30');
check('C-01 a paused membership is not shown as active', card({ membership: { status: 'paused', renews_at: null, starts_at: '2026-10-01' }, pkg: pkg(0) })?.kind === 'none');
check('C-01 a pack wins over a membership row (packs are what Hoy sells)', card({ membership: { status: 'active', renews_at: '2026-11-30', starts_at: '2026-10-30' }, pkg: pkg(3, { expiresAt: '2026-12-01' }) })?.kind === 'pack');
check('C-01 hostile values do not show as classes (negative, NaN)', card({ membership: null, pkg: pkg(-2) })?.kind === 'none' && card({ membership: null, pkg: pkg(Number.NaN) })?.kind === 'none');

// ── M-01 members tile: customers with an active pack ───────────────────────────────────────────────────────────
const lot = (id, person, extra = {}) => ({ id, person, source: 'purchase', product: 'prd_pack', valid_from: '2026-10-01', valid_until: '2026-12-31', frozen_from: null, frozen_until: null, voucher: null, ...extra });
const count = (lots, left, today = '2026-10-31') => A.activePackCustomers?.({ lots, left, today });
check('M-01 one customer with classes left counts once, however many lots', count([lot('l1', 'p1'), lot('l2', 'p1')], [{ lot: 'l1', left: 3 }, { lot: 'l2', left: 12 }]) === 1);
check('M-01 a used-up pack does not count', count([lot('l1', 'p1')], [{ lot: 'l1', left: 0 }]) === 0);
check('M-01 an expired pack does not count', count([lot('l1', 'p1', { valid_until: '2026-10-30' })], [{ lot: 'l1', left: 4 }]) === 0);
check('M-01 a pack that starts later does not count yet', count([lot('l1', 'p1', { valid_from: '2026-11-05' })], [{ lot: 'l1', left: 4 }]) === 0);
check('M-01 a pack frozen today still counts (the customer still holds it)', count([lot('l1', 'p1', { frozen_from: '2026-10-20', frozen_until: '2026-11-10' })], [{ lot: 'l1', left: 4 }]) === 1);
check('M-01 three customers, one without classes: 2', count([lot('l1', 'p1'), lot('l2', 'p2'), lot('l3', 'p3')], [{ lot: 'l1', left: 1 }, { lot: 'l2', left: 9 }, { lot: 'l3', left: 0 }]) === 2);
check('M-01 a lot without a person or with a hostile balance is ignored', count([lot('l1', ''), lot('l2', 'p2')], [{ lot: 'l1', left: 5 }, { lot: 'l2', left: 'x' }]) === 0);
check('M-01 the queries read credit lots and the per-lot balance (server aggregate), not memberships', JSON.stringify(A.ACTIVE_PACK_QUERIES ?? null).includes('"credit_lot"') && JSON.stringify(A.ACTIVE_PACK_QUERIES ?? null).includes('"sum"') && !JSON.stringify(A.ACTIVE_PACK_QUERIES ?? null).includes('membership'));

console.log(failed ? `\n${failed} pack read check(s) failed` : '\npack reads passed');
process.exitCode = failed ? 1 : 0;
