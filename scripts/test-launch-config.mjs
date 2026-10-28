// H-8 launch rows, logic level (no browser): the launch config module (SW-06, SW-08), live prices from the product
// master (SW-02), the shared validation helpers (PL-07) and the Q-13 permission split (PL-05). Fictional fixtures only.
// Run: node scripts/test-launch-config.mjs   (esbuild bundles the TS source, like test-expense-ledger.mjs)
import { build } from 'esbuild';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const rejects = async (p, re) => { try { await p; return false; } catch (e) { return re.test(String(e?.message ?? e)); } };

const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
const bundle = await build({
  stdin: { contents: [
    "export * from './src/config/launch';",
    "export { livePrice, livePricing } from './src/data/livePricing';",
    "export { LIMITS, clip, isEmail, safeHttpsUrl } from './src/shared/limits';",
    "export { ROLE_PERMISSIONS, roleCan } from './src/auth/permissions';",
    "export { runExpenseCommand, readExpenseWorkspace } from './src/modules/admin/expenseLedger';",
    "export { MockProvider } from './src/data/MockProvider';",
    "export { contactOf, mergeSettings } from './src/modules/admin/settings';",
    "export { pricing } from './src/tenant/pricing';",
    "export { LAUNCH_ROLE_MATRIX, matrixAccess, matrixAllows } from './src/config/roleMatrix';",
    "export { resolveOperationalQuote } from './src/data/operationalQuotes';",
    "export { dateKey } from './src/i18n/format';",
  ].join('\n'), resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false}' },
});
const M = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

// ── SW-08 — Coming Soon stays at the root until the go-live setting flips ─────────────────────────────────────
const D = M.LAUNCH_DEFAULTS;
check('SW-08 default: Coming Soon at the root (siteLive false, no date)', D.siteLive === false && D.siteLiveAt === null && !M.siteIsLive(D));
check('SW-08 flip: siteLive true puts the website at the root', M.siteIsLive({ ...D, siteLive: true }));
const at = '2026-10-30T00:00:00-05:00';
check('SW-08 dated go-live: before 30 Oct (Bogotá) stays Coming Soon', !M.siteIsLive({ ...D, siteLiveAt: at }, new Date('2026-10-30T04:59:00Z')));
check('SW-08 dated go-live: from 30 Oct 00:00 Bogotá shows the website', M.siteIsLive({ ...D, siteLiveAt: at }, new Date('2026-10-30T05:00:00Z')));
check('SW-08 malformed setting is ignored (stays Coming Soon)', JSON.stringify(M.sanitize({ siteLive: 'yes', siteLiveAt: 'soon' })) === '{}');
check('SW-08 a go-live date without an offset is refused (would read as UTC or device time)', ['2026-11-01', '2026-11-01T00:00:00'].every((v) => !('siteLiveAt' in M.sanitize({ siteLiveAt: v }))) && M.sanitize({ siteLiveAt: at }).siteLiveAt === at);
M.configureLaunch({ siteLive: true });
check('SW-08 configureLaunch (production boot, H-3) updates the live config', M.launchConfig().siteLive === true);
M.configureLaunch({ siteLive: false });

// ── SW-06 — manual and documents require sign-in unless the owner lists them ─────────────────────────────────
check('SW-06 default: no document is public', D.publicDocuments.length === 0 && !M.isPublicDocument(D, '/manual') && !M.isPublicDocument(D, '/docs/changelog'));
const pub = { ...D, publicDocuments: ['/manual/house-rules'] };
check('SW-06 a listed path (and its children) is public', M.isPublicDocument(pub, '/manual/house-rules') && M.isPublicDocument(pub, '/manual/house-rules/'));
check('SW-06 an unlisted sibling stays private', !M.isPublicDocument(pub, '/manual/prices') && !M.isPublicDocument(pub, '/manual'));
check('SW-06 only /manual and /docs paths can be made public', JSON.stringify(M.sanitize({ publicDocuments: ['/manual/a', '/admin', 'javascript:x', '/docs/b'] }).publicDocuments) === '["/manual/a","/docs/b"]');

// ── SW-02 — prices come from the product master ──────────────────────────────────────────────────────────────
const T = 'ten_hoy';
const row = (id, price, extra = {}) => ({ id: `plan_${id}`, tenant_id: T, price, active: true, ...extra });
const rows = M.pricing.map((p) => row(p.id, p.price));
check('SW-02 every launch item reads its amount from the plans row', M.livePricing(rows, '2026-10-28').every((p) => p.price === rows.find((r) => r.id === `plan_${p.id}`).price));
const changed = rows.map((r) => (r.id === 'plan_trial' ? { ...r, price: 39000 } : r));
check('SW-02 a price change in the product master changes the website price', M.livePrice(changed, 'trial', '2026-10-28') === 39000);
check('SW-02 an inactive or missing product is not shown at a stale amount', M.livePrice(rows.map((r) => (r.id === 'plan_single' ? { ...r, active: false } : r)), 'single', '2026-10-28') === null && M.livePrice([], 'pack12', '2026-10-28') === null);
const plansRows = rows.map((r) => ({ ...r, slug: r.id.slice(5), family: M.pricing.find((p) => `plan_${p.id}` === r.id).family }));
check('SW-02 checkout charges the same product-master price the website shows', M.resolveOperationalQuote(plansRows.map((r) => (r.id === 'plan_trial' ? { ...r, price: 39000 } : r)), 'trial', '2026-10-28').amount === 39000);
check('SW-02 another tenant\'s row is ignored', M.livePrice([{ ...row('trial', 1), tenant_id: 'ten_other' }], 'trial', '2026-10-28') === null);
const definition = { code: 'TRIAL', name: { es: 'Clase de prueba', en: 'Trial class' }, type: 'bienvenida', classes: 1, validityDays: 30, active: true, prices: [{ id: 'p1', amount: 35000, startsOn: '2026-10-01', endsOn: '2026-10-31' }, { id: 'p2', amount: 40000, startsOn: '2026-11-01', endsOn: null }] };
const draft = { definition, history: [{ revision: 1, actorId: 'usr_admin', at: '2026-10-20T12:00:00Z', definition }] };
const published = [row('trial', 0, { frontend_catalog: draft, frontend_publication: { snapshot: draft, revision: 1, actorId: 'usr_admin', at: '2026-10-20T12:00:00Z', withdrawnAt: null, history: [] } }), ...rows.filter((r) => r.id !== 'plan_trial')];
check('SW-02 published catalog: the dated price for today (October)', M.livePrice(published, 'trial', '2026-10-28') === 35000);
check('SW-02 published catalog: the next price period from its start date', M.livePrice(published, 'trial', '2026-11-01') === 40000);
check('SW-02 published catalog: an unpublished item is not priced from the static list', M.livePrice(published, 'single', '2026-10-28') === null);

// ── PL-07 — validation helpers ───────────────────────────────────────────────────────────────────────────────
check('PL-07 safeHttpsUrl keeps an https link', M.safeHttpsUrl('https://www.instagram.com/hoyhumanclub') === 'https://www.instagram.com/hoyhumanclub');
check('PL-07 safeHttpsUrl refuses javascript:, data:, http: and junk', ['javascript:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>', 'http://x.co', 'not a url', ''].every((u) => M.safeHttpsUrl(u) === null));
check('PL-07 isEmail accepts a normal address and refuses markup or spaces', M.isEmail('info@humanclub.com') && !M.isEmail('<script>@x.co') && !M.isEmail('a b@x.co') && !M.isEmail('nope'));
check('PL-07 clip bounds pasted text', M.clip('x'.repeat(900), M.LIMITS.note).length === M.LIMITS.note);
const hostile = M.contactOf(M.mergeSettings({ profile: { instagramUrl: 'javascript:alert(document.cookie)', mapLink: 'javascript:alert(1)', email: '"><img src=x onerror=alert(1)>' } }));
check('PL-07 Settings: a javascript: Instagram or map link never becomes a public link', /^https:/.test(hostile.instagramUrl) && (hostile.location.link === null || /^https:/.test(hostile.location.link)));
check('PL-07 Settings: an invalid contact email falls back to the configured one', hostile.email === 'info@humanclub.com');
check('SW-04 / PL-07 a WhatsApp number without enough digits falls back to the configured one', M.contactOf(M.mergeSettings({ profile: { whatsapp: 'escríbenos' } })).whatsapp === '+57 312 776 5000' && M.contactOf(M.mergeSettings({ profile: { whatsapp: '+57 300 123 4567' } })).whatsapp === '+57 300 123 4567');

// ── PL-05 / Q-13 — reception records an expense but sees no income ──────────────────────────────────────────
check('PL-05 Q-13 front desk has expenses.create only (no ledger read, no write)', M.roleCan('front_desk', 'expenses.create') && !M.roleCan('front_desk', 'expenses.read') && !M.roleCan('front_desk', 'expenses.write'));
check('PL-05 Q-13 front desk has no revenue.read; admin and finance do', !M.roleCan('front_desk', 'revenue.read') && M.roleCan('admin', 'revenue.read') && M.roleCan('finance', 'revenue.read'));
check('PL-05 customer has no staff, income or expense permission', ['payments.write', 'members.read', 'expenses.create', 'revenue.read', 'settings.write', 'bookings.write_any'].every((p) => !M.roleCan('customer', p)));
check('PL-05 no role can refund (approved no-refunds rule)', Object.values(M.ROLE_PERMISSIONS).every((ps) => !ps.includes('payments.refund')));
const fresh = () => { values.clear(); return new M.MockProvider(); };
const desk = { actorId: 'usr_desk', role: 'front_desk' };
const today = M.dateKey(new Date());
const create = { type: 'create', requestId: 'qa_desk_create', id: 'qa_desk_expense', draft: { kind: 'variable', category: 'supplies', concept: 'FICTIONAL desk expense', amount: 12000, incurred_on: today, paid_on: today, method: 'cash', vendor: null, note: null } };
let d = fresh();
let outcome; try { outcome = await M.runExpenseCommand(d, { ...desk, ...create }); } catch (e) { outcome = String(e); }
check('PL-05 Q-13 front desk records an expense through the ledger command', outcome?.created === 1 && d.peek('expenses').some((e) => e.id === 'qa_desk_expense' && e.created_by === 'usr_desk'), String(outcome));
check('PL-05 Q-13 front desk cannot read the expense ledger', await rejects(M.readExpenseWorkspace(d, desk), /denied/));
check('PL-05 Q-13 a caller-shaped {type:"create"} identity cannot read the ledger', await rejects(M.readExpenseWorkspace(d, { ...desk, type: 'create' }), /denied/));
for (const [label, patch] of [['over 5.000.000 COP', { amount: 5_000_001 }], ['dated another day', { incurred_on: '2026-01-02', paid_on: '2026-01-02' }], ['left unpaid', { paid_on: null }]])
  check(`PL-05 Q-13 the command refuses a desk expense ${label}`, await rejects(M.runExpenseCommand(fresh(), { ...desk, ...create, requestId: 'qa_' + label, draft: { ...create.draft, ...patch } }), /validation/));
d = fresh(); await M.runExpenseCommand(d, { ...desk, ...create });
await M.runExpenseCommand(d, { ...desk, ...create });
check('PL-05 Q-13 a retried desk entry with the same request is stored once', d.peek('expenses').filter((e) => e.id === 'qa_desk_expense').length === 1);
const before = await d.get('expenses', 'qa_desk_expense');
check('PL-05 Q-13 front desk cannot pay or delete an expense', await rejects(M.runExpenseCommand(d, { ...desk, type: 'pay', requestId: 'qa_pay', id: 'qa_desk_expense', before, paidOn: '2026-10-28' }), /denied/) && await rejects(M.runExpenseCommand(d, { ...desk, type: 'delete', requestId: 'qa_del', id: 'qa_desk_expense', before }), /denied/));
check('PL-05 Q-13 front desk cannot generate fixed expenses', await rejects(M.runExpenseCommand(d, { ...desk, type: 'generate', requestId: 'qa_gen', period: { start: '2026-10-01', end: '2026-10-31' }, templates: [] }), /denied/));
for (const role of ['customer', 'teacher', 'marketing', 'public']) { d = fresh(); check(`PL-05 ${role} cannot record an expense`, await rejects(M.runExpenseCommand(d, { actorId: 'usr_admin', role, ...create }), /denied/)); }

// ── PL-05 — the approved Role Matrix tab (launch columns), in src/config/roleMatrix.ts ───────────────────────
// [path, admin, front_desk, customer, public] exactly as the tab states (Q-13 for the expense entry).
const TAB = [
  ['/site', 'full', 'full', 'full', 'full'], ['/manual', 'full', 'full', 'none', 'none'], ['/docs/changelog', 'full', 'full', 'none', 'none'],
  ['/app', 'none', 'none', 'own', 'none'], ['/app/schedule', 'none', 'none', 'own', 'none'],
  ['/staff', 'full', 'full', 'none', 'none'], ['/staff/checkin', 'full', 'full', 'none', 'none'], ['/staff/register', 'full', 'full', 'none', 'none'], ['/staff/transfers', 'full', 'full', 'none', 'none'],
  ['/staff/inbox', 'full', 'full', 'none', 'none'], ['/staff/rooms', 'full', 'full', 'none', 'none'], ['/staff/expense', 'full', 'limited', 'none', 'none'],
  ['/admin/crm', 'full', 'full', 'none', 'none'], ['/admin/crm/usr_c01', 'full', 'full', 'none', 'none'],
  ['/admin/content', 'full', 'none', 'none', 'none'], ['/admin/class-schedule', 'full', 'none', 'none', 'none'], ['/admin/vouchers', 'full', 'none', 'none', 'none'],
  ['/admin/products', 'full', 'read', 'none', 'none'], ['/admin/settings', 'full', 'none', 'none', 'none'], ['/admin/settings/hours', 'full', 'none', 'none', 'none'],
  ['/admin', 'full', 'none', 'none', 'none'], ['/admin/analytics', 'full', 'none', 'none', 'none'], ['/admin/activity', 'full', 'none', 'none', 'none'],
  ['/admin/emails', 'full', 'none', 'none', 'none'], ['/admin/whatsapp', 'full', 'none', 'none', 'none'],
  ['/admin/finance', 'full', 'none', 'none', 'none'], ['/admin/finance/expenses', 'full', 'none', 'none', 'none'], ['/admin/finance/payouts', 'full', 'none', 'none', 'none'],
  ['/admin/integrations', 'full', 'none', 'none', 'none'], ['/dev', 'none', 'none', 'none', 'none'],
];
const ROLES4 = ['admin', 'front_desk', 'customer', 'public'];
const off = TAB.flatMap(([path, ...want]) => ROLES4.map((r, i) => [r, path, want[i], M.matrixAccess(r, path)]).filter(([, , w, got]) => w !== got).map(([r, p, w, got]) => `${r} ${p}: ${got} ≠ ${w}`));
check(`PL-05 the config matrix matches the Role Matrix tab (${TAB.length} areas × 4 launch roles)`, off.length === 0, off.join('; '));
check('PL-05 super admin and non-launch roles are not restricted by the matrix', M.matrixAccess('super_admin', '/admin/finance') === null && M.matrixAccess('finance', '/admin/finance') === null && M.matrixAllows('teacher', '/staff'));
check('PL-05 paths outside the matrix keep their route roles (/, /auth, /hub)', ['/', '/auth/sign-in', '/coming-soon', '/no-access'].every((p) => M.matrixAccess('customer', p) === null));

console.log(failed ? `\n${failed} launch config check(s) failed` : '\nlaunch config passed');
process.exit(failed ? 1 : 0);
