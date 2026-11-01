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
const P = await tryImport("export * from './src/data/packMemberships';");

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

// ── The other `memberships` readers (lane G's route-connectivity finding): desk/CRM people join, practice and
// studio analytics. In production they read packs: one plan row per person from their active credit lot.
const L = (id, user, delta, extra = {}) => ({ id, tenant_id: 'hoy', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', user_id: user, delta, reason: delta > 0 ? 'purchase' : 'booking', expires_at: null, plan_id: null, purchase_ledger_id: null, ...extra });
const rows = (ledger, today = '2026-10-31') => P.packMemberships?.(ledger, today) ?? null;
const one = rows([L('lot1', 'u1', 8, { plan_id: 'prd_pack', expires_at: '2026-12-31' }), L('b1', 'u1', -1, { purchase_ledger_id: 'lot1' })]);
check('people/analytics: an active pack is the person\'s active plan (product, end date)', one?.length === 1 && one[0].user_id === 'u1' && one[0].plan_id === 'prd_pack' && one[0].status === 'active' && one[0].ends_at === '2026-12-31', JSON.stringify(one));
check('people/analytics: a used-up pack is no plan', rows([L('lot1', 'u1', 2, { expires_at: '2026-12-31' }), L('b1', 'u1', -2, { purchase_ledger_id: 'lot1' })])?.length === 0);
check('people/analytics: an expired pack is no plan', rows([L('lot1', 'u1', 5, { expires_at: '2026-10-30' })])?.length === 0);
const frozen = rows([L('lot1', 'u1', 5, { expires_at: '2027-01-31', frozen_from: '2026-10-20', frozen_until: '2026-11-10' })]);
check('people/analytics: a pack frozen today is a paused plan until the freeze ends', frozen?.length === 1 && frozen[0].status === 'paused' && frozen[0].paused_until === '2026-11-10', JSON.stringify(frozen));
const two = rows([L('lotA', 'u1', 4, { plan_id: 'prd_a', expires_at: '2027-02-01' }), L('lotB', 'u1', 4, { plan_id: 'prd_b', expires_at: '2026-11-15', created_at: '2026-10-05T10:00:00Z' }), L('lotC', 'u2', 1, { plan_id: 'prd_a' })]);
check('people/analytics: one row per person, the pack spent next (earliest expiry); an open-ended pack counts', two?.length === 2 && two.find((r) => r.user_id === 'u1')?.plan_id === 'prd_b' && two.find((r) => r.user_id === 'u2')?.ends_at === null, JSON.stringify(two));

// Review round (lane C): the freeze's last day, when the pause began, product-less lots, several tenants.
const lastDay = rows([L('lot1', 'u1', 5, { expires_at: '2027-01-31', frozen_from: '2026-10-20', frozen_until: '2026-10-31' })]);
check('people/analytics: the freeze\'s last day is still paused (as booking sees it)', lastDay?.[0]?.status === 'paused', JSON.stringify(lastDay));
check('people/analytics: a pause dates from the freeze, not the purchase (no earlier week counts as paused)', frozen?.[0]?.updated_at?.startsWith('2026-10-20'), JSON.stringify(frozen?.[0]));
const comp = rows([L('lotP', 'u1', 4, { plan_id: 'prd_pack', expires_at: '2027-02-01' }), L('lotG', 'u1', 1, { expires_at: '2026-11-05' })]);
check('people/analytics: a lot without a product (comp, gift) does not hide the pack\'s product', comp?.length === 1 && comp[0].plan_id === 'prd_pack', JSON.stringify(comp));
check('people/analytics: a product-less lot alone is still an active plan', rows([L('lotG', 'u1', 1, { expires_at: '2026-11-05' })])?.[0]?.status === 'active');
check('people/analytics: one person in two tenants gets a row per tenant', rows([L('a', 'u1', 2, { tenant_id: 't1' }), L('b', 'u1', 2, { tenant_id: 't2' })])?.length === 2);

// ── review round 2, L3: the dashboard's active-pack count dates "today" by the studio's calendar (America/Bogota) ──
const { readFileSync } = await import('node:fs');
const dash = readFileSync('src/modules/admin/DashboardPage.tsx', 'utf8');
check('M-01 the active-pack count takes the studio\'s today() (src/data/companyos/dates), not a date made in the page', /today:\s*studioToday\(\)/.test(dash) && /import \{[^}]*today as studioToday[^}]*\} from '\.\.\/\.\.\/data\/companyos\/dates'/.test(dash) && !/today:\s*dateKey\(new Date\(\)\)/.test(dash));
const D = await tryImport("export * from './src/data/companyos/dates';");
{
  const RealDate = Date, tz = process.env.TZ;
  // 02:00 UTC on 3 Nov is still 2 Nov in Bogotá: a browser in Tokyo (already 3 Nov there) must count with 2 Nov.
  process.env.TZ = 'Asia/Tokyo';
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : ['2026-11-03T02:00:00Z'])); } static now() { return new RealDate('2026-11-03T02:00:00Z').getTime(); } };
  try { check('M-01 studio today() is the Bogotá day for a browser elsewhere', D.today?.() === '2026-11-02', D.today?.()); }
  finally { globalThis.Date = RealDate; if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz; }
}

console.log(failed ? `\n${failed} pack read check(s) failed` : '\npack reads passed');
process.exitCode = failed ? 1 : 0;
