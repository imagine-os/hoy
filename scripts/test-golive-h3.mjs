// Hoy go-live, lane H3: the smaller items, logic level (no browser, no network; fictional fixtures only). The browser
// half is scripts/test-golive-h3-ui.mjs (production build).
// - Class type in Class schedule (AD-01): required to publish; a class generated from a typed row can be booked.
// - Plans: a generic card for any active public product (trial, single, pack, gift, no audience limit), with its traps.
// - /coming-soon after go-live: Super Admin keeps it, everyone else goes to the site; before go-live it stays public.
// - class_cancelled copy matches the Company OS recipe.
// - HALL-1: the Dashboard's label.
// Run: node scripts/test-golive-h3.mjs
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
const load = async (contents) => {
  try {
    const out = await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic', loader: { '.css': 'empty', '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl', '.mp4': 'dataurl' }, define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false}' } });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { console.log(`FAIL module does not build: ${String(e.message).split('\n').slice(0, 3).join(' ')}`); failed++; return {}; }
};
const S = await load("export * from './src/modules/classSchedule/live/scheduleOps';");
const R = await load("export { roleCan, ROLE_PERMISSIONS } from './src/auth/permissions';");
const A = await load("export { sessionUnavailableReason } from './src/data/sessionAvailability'; export { adapters, fromRecord } from './src/data/companyos/mapping'; export { modalities } from './src/data/seed/catalog';");
const P = await load("export * from './src/data/livePricing'; export * from './src/modules/customer/genericPlans'; export { purchaseEntry } from './src/auth/purchaseEntry'; export { giftProductsOnSale } from './src/modules/vouchers/production/model'; export { tenant } from './src/tenant/tenant'; export { GIFT_PURCHASE_PATH } from './src/config/launchRoutes';");
const C = await load("export * from './src/modules/coming-soon/entry';");
const T = await load("export { productSoldAlone } from './src/modules/transfers/launch/payments';");
const D = await load("export { strings } from './src/modules/admin/strings';");

// ── Class type in Class schedule ─────────────────────────────────────────────────────────────────────────────────
const draft = (extra = {}) => ({ title: 'Pulso mañana', weekday: 1, start_time: '07:00', resource: 'room', coach: 'c1', capacity: 16, valid_from: '2026-11-09', valid_until: '', active: true, modality: 'pulso', ...extra });
const problems = (d) => S.scheduleProblems?.(d, 16) ?? [];
check('class type: a published class without one is refused', problems(draft({ modality: '' })).includes('modality'), JSON.stringify(problems(draft({ modality: '' }))));
check('class type: a draft (not published) may wait for it', !problems(draft({ modality: '', active: false })).includes('modality'));
check('class type: a published class with one has no problem', problems(draft()).length === 0, JSON.stringify(problems(draft())));
check('class type: a blank-only value counts as none', problems(draft({ modality: '   ' })).includes('modality'));
check('class type: the row sends it, as the select\'s slug', S.createScheduleOps?.(draft())?.[0]?.data?.modality === 'pulso');
check('class type: a new draft without one sends no value', !('modality' in (S.createScheduleOps?.(draft({ modality: '', active: false }))?.[0]?.data ?? { modality: 1 })));
check('class type: editing a draft can clear it (null, so the old one does not stay)', S.updateScheduleOps?.('s1', draft({ modality: '', active: false }))?.[0]?.data?.modality === null);
check('publish: refused for a draft without one', S.schedulePublishBlocked?.({ active: false }) === true && S.schedulePublishBlocked?.({ active: false, modality: '' }) === true && S.schedulePublishBlocked?.({ active: false, modality: null }) === true);
check('publish: allowed for a draft with one', S.schedulePublishBlocked?.({ active: false, modality: 'pulso' }) === false);
check('publish: switching a published row off stays possible whatever it holds', S.schedulePublishBlocked?.({ active: true }) === false);
check('hint: a draft with no type is told how to publish', S.scheduleTypeHint?.({ active: false }) === 'publish');
check('hint: a published row with no type is told its classes can\'t be booked', S.scheduleTypeHint?.({ active: true }) === 'unbookable' && S.scheduleTypeHint?.({ active: true, modality: ' ' }) === 'unbookable' && S.scheduleTypeHint?.({}) === 'unbookable');
check('hint: a row with a type has none', S.scheduleTypeHint?.({ active: true, modality: 'pulso' }) === null && S.scheduleTypeHint?.({ active: false, modality: 'pulso' }) === null);
const RECIPE_SLUGS = ['alineacion', 'centro', 'fuego', 'hibrido', 'ligereza', 'pulso', 'solido'];
check('class type: the frontend\'s list is the recipe\'s seven select options', JSON.stringify((A.modalities ?? []).map((m) => m.slug).sort()) === JSON.stringify(RECIPE_SLUGS), JSON.stringify((A.modalities ?? []).map((m) => m.slug)));
const rowOf = (data) => A.fromRecord?.(A.adapters.class_sessions, { id: 'oc1', data: { starts_at: '2026-11-09T12:00:00.000Z', ends_at: '2026-11-09T12:50:00.000Z', status: 'scheduled', capacity: 16, booked_count: 0, ...data } });
const NOW = Date.parse('2026-11-09T10:00:00Z');
const reasonOf = (session) => A.sessionUnavailableReason?.({ session, modality: (A.modalities ?? []).find((m) => m.id === session.modality_id) }, NOW);
check('bookable: a class generated from a row with the type is open', reasonOf(rowOf({ title: 'Mañana', schedule: 'sch1', schedule_row: { id: 'sch1', modality: 'pulso' } })) === null);
check('bookable: a class from a row without one is not', reasonOf(rowOf({ title: 'Mañana', schedule: 'sch1', schedule_row: { id: 'sch1', modality: null } })) === 'no_class_type');

// ── Teachers tab: who edits a teacher (owner, 4 Nov): the recipe's `coach` update, on screen only ───────────────────
const ROLES = ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'marketing', 'developer', 'customer', 'public'];
const editors = ROLES.filter((r) => R.roleCan?.(r, 'teachers.write'));
check('teachers: only Administration and the Super Admin edit them', editors.join() === 'super_admin,admin', editors.join());
check('teachers: the Coordinator can\'t (the recipe gives it `coach` read only), but keeps classes, dates and rooms', R.roleCan?.('coordinator', 'teachers.write') === false && R.roleCan?.('coordinator', 'classes.write') === true && R.roleCan?.('coordinator', 'classes.read') === true);
check('teachers: Marketing holds neither: nothing changes for it', R.roleCan?.('marketing', 'teachers.write') === false && R.roleCan?.('marketing', 'classes.write') === false);
check('teachers: the roles holding classes.write are the ones this decides', ROLES.filter((r) => R.roleCan?.(r, 'classes.write')).join() === 'super_admin,admin,coordinator');

const page_ = readFileSync('src/modules/classSchedule/live/LiveSchedulePage.tsx', 'utf8');
check('teachers: the tab follows teachers.write; classes, dates and rooms keep classes.write', /const canEditTeachers = can\('teachers\.write'\)/.test(page_) && /const canWrite = can\('classes\.write'\)/.test(page_) && /<Teachers rows=\{coaches\} canWrite=\{canEditTeachers\}/.test(page_) && /<Classes [^>]*canWrite=\{canWrite\}/.test(page_) && /<Dates [^>]*canWrite=\{canWrite\}/.test(page_) && /<Rooms [^>]*canWrite=\{canWrite\}/.test(page_));
const spec_ = readFileSync('src/modules/classSchedule/specs.ts', 'utf8');
check('teachers: who opens Class schedule has not changed', /roles: \['super_admin', 'admin'\], layout: \['notice', 'filters', 'sessions'\]/.test(spec_));

// ── Plans: the generic card ─────────────────────────────────────────────────────────────────────────────────────
const DAY = '2026-11-06';
const plan = (slug, extra = {}) => ({ id: `prod_${slug}`, tenant_id: P.tenant?.id, slug, name_es: `Nombre ${slug}`, name_en: `Nombre ${slug}`, kind: 'pack', price: 300000, classes: 6, validity_days: 60, freezable: false, active: true, audience: null, valid_from: null, valid_until: null, ...extra });
const generic = (rows, day = DAY) => (P.genericPlans?.(rows, day) ?? []);
const keys = (rows, day) => generic(rows, day).map((p) => p.key).join(',');
check('plans: a new public pack gets a card', keys([plan('pack6')]) === 'pack6', keys([plan('pack6')]));
const six = generic([plan('pack6', { freezable: true })])[0];
check('plans: the card carries the master\'s name, price, classes, validity and freeze', six?.name?.es === 'Nombre pack6' && six?.price === 300000 && six?.classes === 6 && six?.validityDays === 60 && six?.freezable === true && six?.kind === 'pack', JSON.stringify(six));
check('plans: each public kind gets one (trial, single with classes, pack, gift)', keys([plan('t2', { kind: 'trial', classes: 1 }), plan('s2', { kind: 'single', classes: 1 }), plan('p2'), plan('g2', { kind: 'gift', classes: 2 })]).split(',').sort().join() === 'g2,p2,s2,t2');
check('plans: a private product stays out', keys([plan('priv2', { kind: 'private' })]) === '');
check('plans: an unknown kind stays out', keys([plan('x2', { kind: 'rental' })]) === '');
check('plans: an inactive product stays out', keys([plan('off2', { active: false })]) === '');
check('plans: an audience-limited product stays out', keys([plan('aff2', { audience: 'affiliate' })]) === '');
check('plans: a price of 0 (quoted) stays out', keys([plan('free2', { price: 0 })]) === '');
check('plans: not on sale yet, or no longer, stays out', keys([plan('late2', { valid_from: '2026-12-01' })]) === '' && keys([plan('old2', { valid_until: '2026-11-05' })]) === '');
check('plans: the fixed list\'s keys keep their own cards, no second one', keys(['trial', 'single', 'pack12', 'pack12_smtc', 'private', 'private_extra', 'gift_single', 'gift_pack12'].map((k) => plan(k))) === '');
check('plans: a price change (two periods of one key) is one card, at today\'s price', (() => { const g = generic([plan('pack6', { price: 100, valid_until: '2026-11-05' }), plan('pack6', { price: 200, valid_from: '2026-11-06' })]); return g.length === 1 && g[0].price === 200; })());
check('plans: another tenant\'s row stays out', keys([plan('other2', { tenant_id: 'someone_else' })]) === '');
check('plans: a hostile key stays out (it goes into a link)', keys([plan('../admin'), plan('a b'), plan('x?y=1'), plan('<img>')]) === '');
check('plans: a hostile name is kept as plain text for React to escape, not dropped or rewritten', generic([plan('pack6', { name_es: '<img src=x onerror=alert(1)>' })])[0]?.name?.es === '<img src=x onerror=alert(1)>');
check('plans: a local (review) catalog is not generic', keys([plan('pack6', { frontend_publication: { revision: 1 } })]) === '');
// trap: Company OS grants nothing for credits 0 (credits/rules.ts grantingProduct): money taken, no class.
check('trap single: a new single with no credits gets no card (paying it would issue nothing)', keys([plan('s0', { kind: 'single', classes: 0 })]) === '' && keys([plan('s00', { kind: 'single', classes: null })]) === '');
check('trap single: a new single with credits gets a card', keys([plan('s1', { kind: 'single', classes: 1 })]) === 's1');
const prod = (data) => ({ id: 'r', data: { key: 'k', name: 'n', price: 1, ...data } });
check('trap single: paying a no-credit single by product alone is refused on the pay page', T.productSoldAlone?.(prod({ kind: 'single', credits: 0 })) === false && T.productSoldAlone?.(prod({ kind: 'single' })) === false);
check('trap single: a single with credits, a pack, a trial and a gift are sold by product', ['single', 'pack', 'trial', 'gift'].every((kind) => T.productSoldAlone?.(prod({ kind, credits: 1 })) === true));
// trap: a second trial product. Company OS allows one trial lot per person, whichever product (`trial_used`).
const t2 = plan('trial_b', { kind: 'trial', classes: 1 }), g2 = plan('gift_b', { kind: 'gift', classes: 2 }), p2 = plan('pack6');
const visible = (offered) => (P.plansForCustomer?.(generic([t2, g2, p2]), { trialOffered: offered }) ?? []).map((p) => p.key).sort().join();
check('trap trial: a second trial shows to someone who has not had one', visible(true) === 'gift_b,pack6,trial_b', visible(true));
check('trap trial: once the trial is used, it is gone from their cards, the rest stays', visible(false) === 'gift_b,pack6', visible(false));
const wantedKey = (key, opts) => P.wantedGenericPlan?.(generic([t2, g2, p2]), key, opts)?.key ?? null;
check('trap trial: ?plan=<second trial> after the trial is used finds nothing: the plans view, no pay form', wantedKey('trial_b', { trialOffered: false, known: true }) === null, wantedKey('trial_b', { trialOffered: false, known: true }));
check('trap trial: ?plan=<second trial> for someone who has not had one goes to it', wantedKey('trial_b', { trialOffered: true, known: true }) === 'trial_b');
check('trap trial: ?plan=<second trial> waits until it is known whether the trial was used', wantedKey('trial_b', { trialOffered: true, known: false }) === null);
check('routing: ?plan=<pack or gift> is found whatever the trial, without waiting', wantedKey('pack6', { trialOffered: false, known: false }) === 'pack6' && wantedKey('gift_b', { trialOffered: false, known: false }) === 'gift_b');
check('routing: no plan asked, or an unknown one, finds nothing', wantedKey(null, { trialOffered: true, known: true }) === null && wantedKey('nope', { trialOffered: true, known: true }) === null);
// trap: a gift is bought for a named recipient (the pay page refuses one opened directly).
const target = (rows, key, next = null) => P.genericPlanTarget?.(generic(rows).find((p) => p.key === key), next);
check('trap gift: a gift card goes to the gift page with that product chosen', target([g2], 'gift_b') === `${P.GIFT_PURCHASE_PATH}?product=gift_b`, target([g2], 'gift_b'));
check('routing: a pack, trial or single card goes to its transfer payment by key', target([p2], 'pack6') === '/app/pay/product/pack6' && target([t2], 'trial_b') === '/app/pay/product/trial_b');
check('routing: a class being booked is kept as the way back', target([p2], 'pack6', '/app/checkout/oc1') === `/app/pay/product/pack6?next=${encodeURIComponent('/app/checkout/oc1')}`);
check('routing: a signed-out visitor goes through sign-in keeping the plan', P.purchaseEntry?.({ role: 'public' }, P.sitePlanPath?.('pack6')) === `/auth/sign-in?next=${encodeURIComponent('/app/plans?plan=pack6')}`, P.purchaseEntry?.({ role: 'public' }, P.sitePlanPath?.('pack6')));
check('routing: a signed-in visitor goes straight to it, gifts too', P.purchaseEntry?.({ role: 'customer' }, P.sitePlanPath?.('pack6')) === '/app/plans?plan=pack6' && P.purchaseEntry?.({ role: 'customer' }, P.sitePlanPath?.('gift_b')) === '/app/plans?plan=gift_b');
// the gift page lists what is on sale today, as the card and the pay page do: Jas's price change makes a second row.
const gift = (id, extra = {}) => ({ id, key: 'gift_b', name: 'Regalo', kind: 'gift', price: 100, credits: 2, active: true, ...extra });
const sale = (rows) => P.giftProductsOnSale?.(rows, DAY) ?? [];
check('gift page: only today\'s row of a key, at today\'s price', (() => { const g = sale([gift('old', { valid_until: '2026-11-05', price: 100 }), gift('new', { valid_from: '2026-11-06', price: 200 })]); return g.length === 1 && g[0].price === 200 && g[0].key === 'gift_b'; })());
check('gift page: an inactive gift is not offered', sale([gift('b', { active: false })]).length === 0);
check('gift page: a gift priced at 0 is not offered (the pay page would ask for nothing)', sale([gift('z', { price: 0 })]).length === 0);
check('gift page: who sees a gift has not changed: one with an audience still shows', sale([gift('a', { audience: 'affiliate' })]).length === 1);
check('gift page: still reads the frontend `plans` row shape', sale([{ id: 'p', slug: 'gift_b', name_es: 'Regalo', family: 'regalos', price: 100, classes: 2, active: true }]).length === 1);

// ── /coming-soon ────────────────────────────────────────────────────────────────────────────────────────────────
const entry = (live, session, production = true, settled = true) => C.comingSoonEntry?.({ production, live, settled, session });
const VISITOR = { status: 'ready', signedIn: false, isSuperAdmin: false, viewAs: null };
const MEMBER = { status: 'ready', signedIn: true, isSuperAdmin: false, viewAs: null };
const OWNER = { status: 'ready', signedIn: true, isSuperAdmin: true, viewAs: null };
check('coming soon: before go-live it is public, whoever opens it', [VISITOR, MEMBER, OWNER].every((s) => entry(false, s) === 'show') && entry(false, { ...VISITOR, status: 'loading' }) === 'show');
check('coming soon: once live, a visitor goes to the site', entry(true, VISITOR) === 'redirect');
check('coming soon: once live, a signed-in non-admin goes to the site', entry(true, MEMBER) === 'redirect');
check('coming soon: once live, a settled session with no role goes to the site', entry(true, { ...MEMBER, status: 'no-role' }) === 'redirect');
check('coming soon: once live, the Super Admin still sees it', entry(true, OWNER) === 'show');
check('coming soon: once live, the Super Admin viewing as another role is still the Super Admin (the Hub\'s rule)', entry(true, { ...MEMBER, viewAs: 'customer' }) === 'show');
check('coming soon: while the session loads it waits, so the Super Admin is not sent away', entry(true, { ...VISITOR, status: 'loading' }) === 'wait');
check('coming soon: a session that failed is not left blank', entry(true, { ...VISITOR, status: 'error' }) === 'redirect');
check('coming soon: the review build is unchanged, live or not', entry(true, VISITOR, false) === 'show');
check('coming soon: until the launch settings are read it waits, whoever opens it, so the landing never flashes', [VISITOR, MEMBER, OWNER].every((s) => entry(false, s, true, false) === 'wait'));
check('coming soon: the review build never waits for them', entry(false, VISITOR, false, false) === 'show');
const root = (live, settled, production = true) => C.rootEntry?.({ production, live, settled });
check('root: until the launch settings are read it waits', root(false, false) === 'wait' && root(true, false) === 'wait');
check('root: then the site if live, the landing if not', root(true, true) === 'site' && root(false, true) === 'landing');
check('root: the review build never waits', root(false, false, false) === 'landing');

// ── the launch settings' read settles, whatever happens to it ─────────────────────────────────────────────────────
let fresh = 0;
const launchModule = async (build_) => {
  try {
    const out = await build({ stdin: { contents: `export * from './src/config/launch'; export const fresh = ${++fresh};`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { __HOY_BUILD__: JSON.stringify(build_) } });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { console.log(`FAIL launch module: ${String(e.message).split('\n')[0]}`); failed++; return {}; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
{
  const review = await launchModule('review');
  check('settled: the review build starts settled', review.launchSettled?.() === true);
  let L = await launchModule('production');
  check('settled: production starts unsettled', L.launchSettled?.() === false);
  await L.loadLaunchSettings?.(async () => ({ siteLive: true }));
  check('settled: a read that answers applies the settings, then settles', L.launchSettled?.() === true && L.launchConfig?.().siteLive === true);
  L = await launchModule('production');
  const applied = await L.loadLaunchSettings?.(async () => null);
  check('settled: no settings in the answer settles on the defaults', L.launchSettled?.() === true && L.launchConfig?.().siteLive === false && applied === false);
  L = await launchModule('production');
  let threw = false;
  try { await L.loadLaunchSettings?.(async () => { throw new Error('service_unavailable'); }); } catch { threw = true; }
  check('settled: a failed read settles on the defaults and does not throw', !threw && L.launchSettled?.() === true && L.launchConfig?.().siteLive === false);
  await L.loadLaunchSettings?.(async () => ({ siteLive: true }));
  check('settled: a retry that answers after a failure still applies', L.launchConfig?.().siteLive === true);
  L = await launchModule('production');
  void L.loadLaunchSettings?.(() => new Promise(() => {}));
  L.settleLaunchWithin?.(10);
  await sleep(40);
  check('settled: a read that never answers settles at the time limit', L.launchSettled?.() === true);
  L = await launchModule('production');
  let notified = 0;
  L.onLaunchChange?.(() => { notified++; });
  L.markLaunchSettled?.(); L.markLaunchSettled?.();
  check('settled: screens are told once', notified === 1);
}

// ── class_cancelled matches the recipe (Company OS deploy/recipes/hoy.json) ─────────────────────────────────────────
const RECIPE_BODY = 'Hola {{person.name}}:\n\nTuvimos que cancelar la clase del {{record.start|datetime}}. Lo sentimos.\n\nSi la reservaste con una clase de tu paquete, la clase vuelve a tu paquete. Si la pagaste aparte y ya aprobamos tu pago, la clase vuelve a tu saldo para que reserves otra; si tu comprobante estaba en revisión, vuelve cuando recepción lo apruebe.\n\nVer horario: {{links.base}}/#/app/schedule\n\nEquipo HOY\ninfo@humanclub.com';
const doc = JSON.parse(readFileSync('deploy/comms/hoy-templates.json', 'utf8'));
const fileRow = doc.records?.flatMap((b) => b.rows ?? []).find((r) => r.key === 'class_cancelled');
check('class_cancelled: hoy-templates.json has the recipe\'s body', fileRow?.body === RECIPE_BODY, fileRow?.body);
const src = readFileSync('src/notifications/launchEmails.ts', 'utf8');
check('class_cancelled: launchEmails.ts no longer promises a call back', !src.includes('te escribimos para reprogramarla') && src.includes('la clase vuelve a tu saldo para que reserves otra'));

// ── HALL-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────
const label = D.strings?.['admin.dashboard.members'];
check('HALL-1: the Dashboard says what it counts', label?.es === 'Con paquete activo' && label?.en === 'With an active pack', JSON.stringify(label));
check('HALL-1: Analytics keeps "Miembros activos": it counts people who came', D.strings?.['admin.analytics.kpi.active']?.es === 'Miembros activos');

console.log(failed ? `\n${failed} FAILED` : '\nPASS lane H3 (logic)');
process.exit(failed ? 1 : 0);
