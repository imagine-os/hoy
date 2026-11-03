// Hoy programme hoy-jas-1nov, lane B (customer and identity), logic level (no browser). Jas's 1 Nov acceptance walkthrough:
// - enrolment name (root cause 1): a login with no usable name is asked for it (2+ characters, no "@", cut at
//   SIGNUP_FORM_LIMITS.name) and the sign-up body carries it; a named login sends its own name without asking (unchanged);
// - C-01d: after "Continue for now" the login passes for viewing, but new bookings and purchases are held until the consent
//   is recorded; Retry runs the consent step again; a recorded consent lifts the hold; the bounded read stays (IN-155);
// - PAG-03: an expired hold is shown released (never "pending") and is re-read until Company OS releases it;
// - PRO-04: the trial offer follows the live trial assessment (pending payment, lot, approved), never hidden from a
//   package holder (R-14 is open);
// - PRO-05: the affiliate-only pack shows in the app only for a member whose facet has price_audience affiliate;
// - PRO-06: each live lot with its source and its expiry, or "no expiry";
// - WEB-03: the website schedule drawer's signed-in copy;
// - RES-01: the calendar day and view kept in the URL query; refetches keep rows; the week grid fits seven columns;
// - RES-02: the greeting names the person, never the email; no demo announcement in production.
// Fixtures are real Company OS /query shapes (`{ id, data: {...}, createdAt }`, docs/integration-guide.md). Fictional only.
// Run: node scripts/test-jas-1nov-customer.mjs   (esbuild bundles the TS source, like test-pack-reads.mjs)
import { build } from 'esbuild';
import { readFileSync, existsSync } from 'node:fs';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const safe = (fn) => { try { return fn(); } catch (e) { return { thrown: String(e?.message ?? e) }; } };
const tryImport = async (contents, build_ = 'review') => {
  try {
    const out = await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', jsx: 'automatic', define: { 'import.meta.env': `{"VITE_HOY_BUILD":"${build_}","DEV":false}` } });
    return await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  } catch (e) { console.log(`FAIL module does not build: ${String(e.message).split('\n')[0]}`); failed++; return {}; }
};
const src = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

const I = await tryImport("export * from './src/auth/companyOsIdentity';");
const S = await tryImport("export * from './src/auth/signupStatus';");
const B = await tryImport("export * from './src/modules/customer/booking/serverBooking';");
const O = await tryImport("export * from './src/modules/customer/offers';");
const T = await tryImport("export { assessLiveTrial } from './src/data/trialEligibility';");
const MAP = await tryImport("export { fromRecord, adapterFor } from './src/data/companyos/mapping'; export { approvedPackageRows } from './src/data/packages';");
const W = await tryImport("export * from './src/modules/website/drawerCopy';");
const Q = await tryImport("export * from './src/components/organism/SessionCalendar/calendarQuery';");
const G = await tryImport("export * from './src/modules/customer/greeting';");
const STR = await tryImport([
  "export { strings as identity } from './src/modules/identity/strings';",
  "export { strings as customer } from './src/modules/customer/strings';",
  "export { strings as website } from './src/modules/website/strings';",
].join('\n'));
const both = (table, key) => !!table?.[key]?.es && !!table?.[key]?.en;

// ── 1 · Enrolment name (root cause 1: nameless email-code logins got a 400 validation) ─────────────────────────────
const cfg = { enabled: true, consents: [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }], personFields: ['name', 'phone'], facetFields: [] };
check('name: a login with no name has no usable name (it is asked for one)', safe(() => I.usableLoginName({ name: '', email: 'sinnombre@example.test' })) === '');
check('name: a login whose name is its email (ProductionSession falls back to the email) has no usable name', safe(() => I.usableLoginName({ name: 'sinnombre@example.test', email: 'sinnombre@example.test' })) === '');
check('name: a one-character or an "@" login name is not usable either', safe(() => I.usableLoginName({ name: 'J', email: 'j@example.test' })) === '' && safe(() => I.usableLoginName({ name: 'jas@studio', email: 'j@example.test' })) === '');
check('name: a named login keeps its name (no question asked, unchanged)', safe(() => I.usableLoginName({ name: ' Rita Recepción ', email: 'recepcion@example.test' })) === 'Rita Recepción');
check('name: an empty or one-character name is refused on screen', safe(() => I.enrolmentNameError('')) === 'required' && safe(() => I.enrolmentNameError(' L ')) === 'required');
check('name: a name with "@" is refused on screen', safe(() => I.enrolmentNameError('lu@example.test')) === 'email');
check('name: two characters or more without "@" are accepted', safe(() => I.enrolmentNameError('Lu')) === null && safe(() => I.enrolmentNameError('Lucía Nueva')) === null);
const typed = safe(() => I.enrolmentBody(cfg, '  Lucía Nueva ', true));
check('name: the POST body carries the typed name (trimmed) and the accepted documents', typed?.person?.name === 'Lucía Nueva' && JSON.stringify(typed?.consents) === JSON.stringify(cfg.consents) && JSON.stringify(typed?.facet) === '{}', JSON.stringify(typed));
const hostile = '<script>alert(1)</script><b>Lu</b>';
check('hostile: a script or HTML name is sent as text, unchanged (React shows it as text)', safe(() => I.enrolmentBody(cfg, hostile, true))?.person?.name === hostile);
const long = 'Ana '.repeat(80);
const cut = safe(() => I.enrolmentBody(cfg, long, true))?.person?.name;
check('hostile: an over-long name is cut at SIGNUP_FORM_LIMITS.name', typeof cut === 'string' && cut.length === I.SIGNUP_FORM_LIMITS?.name && long.trim().startsWith(cut), String(cut?.length));
check('name: Company OS stays strict, a 400 validation is the sign-up\'s "invalid" result (the screen points at the name field)', safe(() => I.classifySignup(400, { error: 'validation', message: 'person.name is required' }))?.kind === 'invalid');
check('name: the field\'s copy exists in es and en', ['identity.name.label', 'identity.name.required', 'identity.name.email', 'identity.name.invalid'].every((k) => both(STR.identity, k)));
const enrolSrc = src('src/auth/CustomerEnrolment.tsx');
check('name: the enrolment and consent step shows a required name field when the login has none', /data-enrol-name/.test(enrolSrc) && /usableLoginName/.test(enrolSrc) && /enrolmentNameError/.test(enrolSrc));
check('name: the field is cut at the limit in the browser too (maxLength SIGNUP_FORM_LIMITS.name)', /maxLength=\{SIGNUP_FORM_LIMITS\.name\}/.test(enrolSrc));

// ── 2 · C-01d: "Continue for now" keeps viewing open and holds new bookings and purchases ─────────────────────────────
if (S.resetConsentReads) {
  S.resetConsentReads();
  const id = 'usr_fict_hold';
  check('C-01d: a login that never deferred is not held', safe(() => S.consentDeferred(id)) === false);
  safe(() => S.deferConsent(id));
  const after = S.peekConsent?.(id);
  check('C-01d: "Continue for now" passes the customer area (existing bookings, balance, account open)', after?.step === 'pass', JSON.stringify(after));
  check('C-01d: …but new bookings and purchases are held', safe(() => S.consentDeferred(id)) === true);
  let reads = 0;
  const fetcher = async () => { reads++; return { status: 200, body: { enabled: true, registered: false, consents: cfg.consents, personFields: ['name', 'phone'], facetFields: [] } }; };
  safe(() => S.retryConsent(id));
  check('C-01d: Retry forgets the deferral so the consent step runs again', S.peekConsent?.(id) === undefined && safe(() => S.consentDeferred(id)) === false);
  const again = await S.readConsent?.(id, fetcher, { log: () => {} });
  check('C-01d: …and the consent read asks again (one GET /signup)', again?.step === 'ask' && reads === 1, JSON.stringify(again));
  safe(() => S.deferConsent(id)); safe(() => S.settleConsent(id));
  check('C-01d: a recorded consent (sign-up 201) lifts the hold', safe(() => S.consentDeferred(id)) === false && S.peekConsent?.(id)?.step === 'pass');
  S.resetConsentReads();
  const slow = await S.readConsent?.('usr_fict_slow', () => new Promise(() => {}), { timeoutMs: 30, log: () => {} });
  check('C-01d: the bounded read stays (IN-155): no answer → pass after the wait, not held', slow?.step === 'pass' && safe(() => S.consentDeferred('usr_fict_slow')) === false, JSON.stringify(slow));
  // Review: a re-read after Retry that can't tell (fails, times out, an older Company OS) keeps the hold.
  const deferredThenRead = async (fetch, opts = {}) => { S.resetConsentReads(); safe(() => S.deferConsent(id)); safe(() => S.retryConsent(id)); const r = await S.readConsent?.(id, fetch, { log: () => {}, ...opts }); return { r, held: safe(() => S.consentDeferred(id)) }; };
  let out = await deferredThenRead(async () => { throw new Error('network'); });
  check('C-01d review: defer → Retry → GET /signup throws → still held (never fails open for purchases)', out.held === true && out.r?.step === 'pass', JSON.stringify(out));
  out = await deferredThenRead(() => new Promise(() => {}), { timeoutMs: 30 });
  check('C-01d review: defer → Retry → GET /signup times out → still held', out.held === true, JSON.stringify(out));
  out = await deferredThenRead(async () => ({ status: 503, body: { error: 'unavailable' } }));
  check('C-01d review: defer → Retry → an error status → still held', out.held === true, JSON.stringify(out));
  out = await deferredThenRead(async () => ({ status: 200, body: { enabled: true, consents: [], personFields: ['name'], facetFields: [] } }));
  check('C-01d review: defer → Retry → an older Company OS without registered → still held', out.held === true, JSON.stringify(out));
  out = await deferredThenRead(async () => ({ status: 200, body: { enabled: true, registered: true, consents: [], personFields: ['name'], facetFields: [] } }));
  check('C-01d review: defer → Retry → registered → the hold lifts', out.held === false && out.r?.reason === 'registered', JSON.stringify(out));
  out = await deferredThenRead(async () => ({ status: 200, body: { enabled: false } }));
  check('C-01d review: defer → Retry → sign-up closed → the hold lifts (nothing to accept)', out.held === false, JSON.stringify(out));
  out = await deferredThenRead(fetcher);
  safe(() => S.passAfterRead(id, 'timeout'));
  check('C-01d review: the step\'s own Retry read timing out keeps a deferred login held', safe(() => S.consentDeferred(id)) === true);
  safe(() => S.passAfterRead(id, { step: 'pass', reason: 'failed' }));
  check('C-01d review: …and a failed one too', safe(() => S.consentDeferred(id)) === true);
  safe(() => S.settleConsent(id)); safe(() => S.passAfterRead(id, 'timeout'));
  check('C-01d review: once recorded, a later unclear read does not bring the hold back', safe(() => S.consentDeferred(id)) === false);
  S.resetConsentReads();
  safe(() => S.passAfterRead('usr_fict_never', 'timeout'));
  check('C-01d review: a login that never deferred still fails open (IN-155 unchanged)', safe(() => S.consentDeferred('usr_fict_never')) === false && S.peekConsent?.('usr_fict_never')?.step === 'pass');
  S.resetConsentReads();
} else check('C-01d: signupStatus exports the consent hold', false);
// ── C-01d (owner 2026-11-03, review round 2): the deferral lasts for the browser, a reload AND a new tab (localStorage) ─
{
  const KEY = 'hoyos.consent.deferred';
  const mapStore = () => { const v = new Map(); return { v, getItem: (k) => (v.has(k) ? v.get(k) : null), setItem: (k, x) => v.set(k, String(x)), removeItem: (k) => v.delete(k), key: (i) => [...v.keys()][i] ?? null, get length() { return v.size; } }; };
  const throwing = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); }, removeItem() { throw new Error('SecurityError'); }, key() { throw new Error('SecurityError'); }, get length() { throw new Error('SecurityError'); } };
  const saved = ['localStorage', 'sessionStorage'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  const setGlobal = (name, st) => Object.defineProperty(globalThis, name, { value: st, configurable: true, writable: true });
  let n = 0;
  /**
   * A reload or a NEW TAB: the module starts with no state, the tab's sessionStorage starts empty (a new tab), and the
   * browser's localStorage stays. Each call is a new bundle text, so a new module instance.
   */
  const fresh = () => { setGlobal('sessionStorage', mapStore()); return tryImport(`export * from './src/auth/signupStatus'; export { clearLocalTraces } from './src/auth/localTraces'; export const reloadNo = ${++n};`); };
  const asks = async () => ({ status: 200, body: { enabled: true, registered: false, consents: cfg.consents, personFields: ['name', 'phone'], facetFields: [] } });
  const id = 'usr_fict_session', other = 'usr_fict_other';
  const listed = (store) => { try { return JSON.parse(store.v.get(KEY)); } catch { return null; } };
  try {
    let store = mapStore(); setGlobal('localStorage', store);
    let S1 = await fresh();
    safe(() => S1.deferConsent(id));
    check('C-01d session: "Continue for now" stores the deferral in localStorage under hoyos.consent.deferred', typeof store.v.get(KEY) === 'string', JSON.stringify([...store.v.keys()]));
    check('C-01d session: …holding only the login id, no personal data', JSON.stringify(listed(store)) === JSON.stringify([id]), String(store.v.get(KEY)));
    check('C-01d session: …and nothing in the tab\'s sessionStorage (a new tab would not see it)', globalThis.sessionStorage.v.size === 0);
    let S2 = await fresh();
    check('C-01d session: a new tab (fresh module, empty sessionStorage, same localStorage) is held before any read', safe(() => S2.consentDeferred?.(id)) === true);
    let r = await S2.readConsent?.(id, async () => { throw new Error('network'); }, { log: () => {} });
    check('C-01d session: …and a failed GET /signup there keeps the hold (no fail open)', r?.step === 'pass' && safe(() => S2.consentDeferred(id)) === true, JSON.stringify(r));
    S2 = await fresh();
    r = await S2.readConsent?.(id, () => new Promise(() => {}), { timeoutMs: 30, log: () => {} });
    check('C-01d session: …and so does one that times out', safe(() => S2.consentDeferred(id)) === true, JSON.stringify(r));
    S2 = await fresh();
    r = await S2.readConsent?.(id, asks, { log: () => {} });
    check('C-01d session: in a new tab, "not registered" keeps the hold (no consent step until Retry)', r?.step === 'pass' && r?.reason === 'deferred' && safe(() => S2.consentDeferred(id)) === true, JSON.stringify(r));
    safe(() => S2.retryConsent(id));
    r = await S2.readConsent?.(id, asks, { log: () => {} });
    check('C-01d session: …the hold notice\'s Retry still shows the consent step', r?.step === 'ask', JSON.stringify(r));
    check('C-01d session: …and the step knows the login had deferred (it offers "Continue for now" again)', safe(() => S2.hasDeferred?.(id)) === true);
    S2 = await fresh();
    r = await S2.readConsent?.(id, async () => ({ status: 200, body: { enabled: true, registered: true } }), { log: () => {} });
    check('C-01d session: a registered answer lifts the hold and clears the stored entry', safe(() => S2.consentDeferred(id)) === false && !store.v.has(KEY), String(store.v.get(KEY)));
    check('C-01d session: …and the step no longer counts the login as deferred', safe(() => S2.hasDeferred?.(id)) === false);
    S1 = await fresh(); safe(() => S1.deferConsent(id));
    S2 = await fresh();
    await S2.readConsent?.(id, async () => ({ status: 200, body: { enabled: false } }), { log: () => {} });
    check('C-01d session: sign-up closed lifts it and clears the entry', safe(() => S2.consentDeferred(id)) === false && !store.v.has(KEY));
    S1 = await fresh(); safe(() => S1.deferConsent(id)); safe(() => S1.deferConsent(other)); safe(() => S1.settleConsent(id));
    check('C-01d session: settleConsent (consent recorded) clears that login\'s entry; another login\'s stays', JSON.stringify(listed(store)) === JSON.stringify([other]), String(store.v.get(KEY)));
    S2 = await fresh();
    check('C-01d session: …so in a new tab the settled login is not held', safe(() => S2.consentDeferred(id)) === false && safe(() => S2.consentDeferred(other)) === true);
    // The Clerk stuck-reload (ProductionSession reloadOnceIfStuck) clears traces but keeps the deferral; a sign-out drops it.
    check('C-01d session: localTraces exports clearLocalTraces', typeof S2.clearLocalTraces === 'function');
    const tab = globalThis.sessionStorage;
    store.v.set('hoyos.pendingPass', 'x'); store.v.set('hoyos.lang', 'es'); tab.setItem('hoyos.filter', 'y');
    safe(() => S2.clearLocalTraces({ keepConsentDeferral: true, stores: [tab, store] }));
    check('C-01d session: the stuck reload\'s clean-up keeps the deferral (and the language), drops other traces', JSON.stringify(listed(store)) === JSON.stringify([other]) && store.v.get('hoyos.lang') === 'es' && !store.v.has('hoyos.pendingPass') && !tab.v.has('hoyos.filter'), JSON.stringify([...store.v.keys(), ...tab.v.keys()]));
    S2 = await fresh();
    check('C-01d session: …so after the stuck reload the login is still held', safe(() => S2.consentDeferred(other)) === true);
    safe(() => S2.clearLocalTraces({ stores: [globalThis.sessionStorage, store] }));
    check('C-01d session: a sign-out\'s clean-up clears the hold (memory) and the stored entry, the language stays', safe(() => S2.consentDeferred(other)) === false && !store.v.has(KEY) && store.v.get('hoyos.lang') === 'es');
    check('C-01d session: …so a new tab after sign-out is not held', (await fresh()).consentDeferred?.(other) === false);
    const sessionSrc = src('src/auth/ProductionSession.tsx');
    check('C-01d session: ProductionSession uses the shared clean-up; the stuck reload keeps the deferral, the sign-out paths do not', /from '\.\/localTraces'/.test(sessionSrc) && /reloadOnceIfStuck[\s\S]{0,400}clearLocalTraces\(\{ keepConsentDeferral: true \}\)/.test(sessionSrc) && (sessionSrc.match(/clearLocalTraces\(\)/g) ?? []).length >= 2 && !/function clearLocalTraces/.test(sessionSrc));
    // Hostile storage contents: not JSON, not a list, a list with non-strings.
    for (const junk of ['not json', '{"x":1}', '[1,{"a":2}]']) {
      store = mapStore(); store.v.set(KEY, junk); setGlobal('localStorage', store);
      const S3 = await fresh();
      check(`C-01d session hostile: stored ${junk} is ignored (no throw, not held)`, safe(() => S3.consentDeferred(id)) === false);
    }
    // Storage that throws (private mode, blocked): the flow works from memory.
    setGlobal('localStorage', throwing);
    const S4 = await fresh();
    const thrown = safe(() => S4.deferConsent(id));
    check('C-01d session: storage that throws doesn\'t break "Continue for now"', !(thrown && thrown.thrown) && safe(() => S4.consentDeferred(id)) === true, JSON.stringify(thrown));
    r = await S4.readConsent?.(id, async () => { throw new Error('network'); }, { log: () => {} }).catch((e) => ({ thrown: String(e) }));
    check('C-01d session: …a failed read keeps the hold from memory', r?.step === 'pass' && safe(() => S4.consentDeferred(id)) === true, JSON.stringify(r));
    const settled = safe(() => S4.settleConsent(id));
    check('C-01d session: …and settle lifts it without throwing', !(settled && settled.thrown) && safe(() => S4.consentDeferred(id)) === false);
    const cleared = safe(() => S4.clearLocalTraces({ stores: [throwing] }));
    check('C-01d session: …and the sign-out clean-up doesn\'t throw either', !(cleared && cleared.thrown), JSON.stringify(cleared));
    setGlobal('localStorage', undefined);
    const S5 = await fresh();
    check('C-01d session: no localStorage at all (Node, an old browser) works from memory', !(safe(() => S5.deferConsent(id))?.thrown) && safe(() => S5.consentDeferred(id)) === true);
  } finally {
    for (const [k, d] of saved) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; }
  }
}
// ── review round 2: the consent step shown to a deferred login offers "Continue for now" again (a way back) ────────
check('C-01d r2: the consent form offers "Continue for now" to a login that had deferred (re-defers)', /hasDeferred\(user\.id\)[\s\S]{0,300}data-consent-later[^\n]*deferConsent\(user\.id\)/.test(enrolSrc) && /data-enrol-customer="consent"/.test(enrolSrc));
// ── review round 2: a 400 validation points at the name only when its details name the name field ─────────────────
{
  // Company OS: HttpError(400, "validation", undefined, errors) → { error: 'validation', details: ['missing required field "name"', …] }.
  const named = (d) => safe(() => I.validationNamesField?.({ error: 'validation', details: d }, 'name'));
  check('name r2: details naming the name field (missing, required, coercion) → the name error', named(['missing required field "name"']) === true && named(['field "name" is required']) === true && named(['field "name": expected a string']) === true);
  check('name r2: details about other fields only → not the name error (the generic notice)', named(['missing required field "phone"']) === false && named(['field "nickname" is required']) === false && named([]) === false);
  check('name r2 hostile: no details, or details not a list of strings → not the name error', named(undefined) === false && named('field "name" is required') === false && named([{ field: 'name' }]) === false && safe(() => I.validationNamesField?.(null, 'name')) === false);
  check('name r2: the step uses it for the name error', /validationNamesField\(body, 'name'\)/.test(enrolSrc));
}
// ── review round 2: an existing pending product payment is not held; a new purchase is ──────────────────────────
{
  const R = await tryImport("export * from './src/modules/identity/consentHoldRules';");
  check('C-01d r2: a held login buying a product with no pending payment is held', safe(() => R.consentHoldsPay?.({ held: true, what: 'product', pending: false })) === true);
  check('C-01d r2: …but re-sending or finishing its existing pending payment is not', safe(() => R.consentHoldsPay?.({ held: true, what: 'product', pending: true })) === false);
  check('C-01d r2: a held booking\'s payment and a login not held are never held', safe(() => R.consentHoldsPay?.({ held: true, what: 'booking', pending: false })) === false && safe(() => R.consentHoldsPay?.({ held: false, what: 'product', pending: false })) === false);
  const paySrc = src('src/modules/transfers/launch/TransferPayPage.tsx');
  check('C-01d r2: the payment page decides after its read (consentHoldsPay with v.pending), not before loading', /consentHoldsPay\(\{[^}]*pending: !!v\.pending/.test(paySrc) && !/if \(consentHeld\) return <ConsentHoldNotice \/>;\s*\n\s*if \(state\.status === 'loading'\)/.test(paySrc));
}
// ── C-01d (owner 2026-11-03): a move counts as a new booking; cancelling stays allowed ─────────────────────────────
{
  const parts = src('src/modules/customer/pages/ServerBookingParts.tsx');
  check('C-01d move: the change sheet reads the consent hold', /useConsentHeld\(\)/.test(parts) && /ConsentHoldNotice/.test(parts));
  check('C-01d move: while held, the move mode shows the hold notice and offers no class (no alternatives, no send)', /mode === 'move'[\s\S]{0,400}consentHeld \? <ConsentHoldNotice \/>/.test(parts) && /const move = \(\) => !consentHeld && chosen/.test(parts));
  check('C-01d move: cancelling is not gated by the hold', !/const cancel = \(\) => !consentHeld/.test(parts) && !/consentHeld[^\n]*cancelOnServer/.test(parts));
  check('C-01d move: the review build\'s reschedule sheet is unchanged (no hold in BookedPage\'s ChangeSheet)', !/useConsentHeld/.test(src('src/modules/customer/pages/BookedPage.tsx')));
}
check('C-01d review: the consent step\'s Retry read keeps the hold (passAfterRead, not settleConsent)', /passAfterRead\(user\.id, 'timeout'\)/.test(enrolSrc) && /passAfterRead\(user\.id, read\)/.test(enrolSrc));
check('C-01d review: the product payment page holds; a held booking\'s payment stays open', /consentHoldsPay\(\{ held: consentHeld, what,/.test(src('src/modules/transfers/launch/TransferPayPage.tsx')));
check('name review: only a 400 validation points at the name field; other refusals keep their notice', /result\.kind === 'invalid' && result\.code === 'validation'/.test(enrolSrc));
check('name review: asked only when the tenant takes a name at sign-up', /personFields\.includes\('name'\)/.test(enrolSrc));
check('C-01d: "Continue for now" defers the consent instead of settling it', /data-consent-later[^\n]*deferConsent\(/.test(enrolSrc) && !/data-consent-later[^\n]*settleConsent\(/.test(enrolSrc));
check('C-01d: the hold notice copy exists in es and en ("record your consent to book", Retry)', ['identity.hold.title', 'identity.hold.body', 'identity.hold.retry'].every((k) => both(STR.identity, k)));
const holdUsers = { checkout: 'src/modules/customer/pages/ServerCheckoutPage.tsx', 'website Book CTA': 'src/modules/website/pages/SchedulePage.tsx', 'gift purchase': 'src/modules/vouchers/production/pages.tsx', 'app Plans': 'src/modules/customer/pages/PlansPage.tsx' };
for (const [what, file] of Object.entries(holdUsers)) check(`C-01d: the ${what} entry shows the consent hold notice`, /ConsentHoldNotice/.test(src(file)) && /useConsentHeld/.test(src(file)), file);

// ── 3 · PAG-03: an expired hold re-reads and shows released, never pending ───────────────────────────────────────
const now = Date.parse('2026-11-02T15:00:00Z');
const held = (extra = {}) => ({ id: 'bk_1', tenant_id: 'hoy', created_at: '2026-11-02T14:00:00Z', updated_at: '', user_id: 'usr_c', session_id: 'occ_1', paid_with: 'single', ledger_id: null, payment_id: null, checked_in_at: null, cancelled_at: null, rated: false, status: 'held', payment_method: 'transfer', hold_until: '2026-11-02T14:45:00Z', hold_frozen_at: null, ...extra });
check('PAG-03: a hold whose time ran out reads "released", never "pending"', safe(() => B.serverPaymentStatus(held(), now)) === 'released');
check('PAG-03: a running hold is still pending', safe(() => B.serverPaymentStatus(held({ hold_until: '2026-11-02T15:30:00Z' }), now)) === 'pending');
check('PAG-03: a frozen hold (receipt with reception) is still pending', safe(() => B.serverPaymentStatus(held({ hold_frozen_at: '2026-11-02T14:30:00Z' }), now)) === 'pending');
check('PAG-03: a released booking (cancel_reason hold_expired) reads released', safe(() => B.serverPaymentStatus(held({ status: 'cancelled', cancel_reason: 'hold_expired' }), now)) === 'released');
check('PAG-03: an expired hold not yet released by the server is re-read', safe(() => B.awaitingRelease(held(), now)) === true);
check('PAG-03: …and stops once released, or when the hold is running or frozen', safe(() => B.awaitingRelease(held({ status: 'cancelled', cancel_reason: 'hold_expired' }), now)) === false
  && safe(() => B.awaitingRelease(held({ hold_until: '2026-11-02T15:30:00Z' }), now)) === false && safe(() => B.awaitingRelease(held({ hold_frozen_at: '2026-11-02T14:30:00Z' }), now)) === false);
{
  const P = { rescheduleHours: 12, holdMinutesTransfer: 15, holdMinutesDesk: 60 };
  const startsAt = '2026-11-03T12:00:00Z';
  const views = [held({ hold_until: null }), held({ hold_until: undefined }), held({ hold_until: 'not-a-date' })].map((b) => safe(() => B.holdView(b, startsAt, P, now)));
  check('PAG-03 r2: holdView reads a missing or unreadable hold_until as pending, like awaitingRelease (never expired)', views.every((v) => v?.phase === 'pending' && v.until === null), JSON.stringify(views));
  check('PAG-03 r2: …and the payment status agrees (pending)', [null, 'not-a-date'].every((h) => safe(() => B.serverPaymentStatus(held({ hold_until: h }), now)) === 'pending'));
  check('PAG-03 r2: a hold_until in the past is still expired; a future one still running', safe(() => B.holdView(held(), startsAt, P, now))?.phase === 'expired' && safe(() => B.holdView(held({ hold_until: '2026-11-02T15:10:00Z' }), startsAt, P, now))?.phase === 'running');
  const BS = await tryImport("export { bookingStrings } from './src/modules/customer/booking/strings';");
  const tbl = BS.bookingStrings ?? {};
  check('PAG-03 r2: the pending hold has es and en copy (title, transfer, desk)', ['customer.srv.hold.pending.title', 'customer.srv.hold.pending.transfer', 'customer.srv.hold.pending.desk'].every((k) => both(tbl, k)));
}
check('PAG-03: the re-read is bounded (polls for a few minutes, the server releases every 5)', Number.isInteger(B.RELEASE_RECHECK_MS) && B.RELEASE_RECHECK_MS >= 5000 && Number.isInteger(B.RELEASE_RECHECK_TRIES) && B.RELEASE_RECHECK_MS * B.RELEASE_RECHECK_TRIES >= 5 * 60_000 && B.RELEASE_RECHECK_MS * B.RELEASE_RECHECK_TRIES <= 15 * 60_000);
const booked = src('src/modules/customer/pages/BookedPage.tsx');
check('PAG-03: the booking page re-reads the booking and the class while a hold awaits release (place count refreshed)', /awaitingRelease/.test(booked) && /sessionsRead\.retry/.test(booked) && /bookingsRead\.retry/.test(booked));

// ── 4 · PRO-04: the trial offer follows the live assessment ──────────────────────────────────────────────────────
const plans = [{ id: 'prd_trial', kind: 'trial', slug: 'trial' }, { id: 'prd_pack', kind: 'pack', slug: 'pack12' }];
const pay = (status, product = 'prd_trial') => ({ id: `pay_${status}`, tenant_id: 'hoy', user_id: 'per_c', plan_id: product, status });
const lotRow = (source, product) => ({ id: `lot_${source}`, tenant_id: 'hoy', user_id: 'per_c', delta: 1, reason: 'purchase', purchase_ledger_id: null, plan_id: product, payment_id: null, lot_source: source, created_at: '2026-10-01T10:00:00Z' });
const live = (ledger, payments) => T.assessLiveTrial?.({ ledger, payments, plans });
const offered = (assessment) => safe(() => O.trialOffered({ trialUsed: false, trial: assessment }));
check('PRO-04: a pending trial payment → not offered again', offered(live([], [pay('pending')])) === false);
check('PRO-04: an approved trial payment → not offered again', offered(live([], [pay('approved')])) === false);
check('PRO-04: a trial lot → not offered again', offered(live([lotRow('trial', 'prd_trial')], [])) === false);
check('PRO-04: a new customer is still offered the trial', offered(live([], [])) === true);
check('PRO-04: a package holder is still offered it (R-14 is open, no change)', offered(live([{ ...lotRow('purchase', 'prd_pack'), delta: 12 }], [pay('approved', 'prd_pack')])) === true);
check('PRO-04: the review build\'s own flag still hides it (unchanged)', safe(() => O.trialOffered({ trialUsed: true, trial: { status: 'eligible', reasons: [] } })) === false);
const checkout = src('src/modules/customer/pages/ServerCheckoutPage.tsx');
check('PRO-04: checkout reads trialOffered (ent.trial), not trialUsed', /trialOffered\(ent\)/.test(checkout) && !/ent\.trialUsed/.test(checkout));
check('PRO-04: the home card and the day-one home read trialOffered', /trialOffered\(/.test(src('src/modules/customer/HomePage.tsx')) && /trialOffered\(/.test(src('src/modules/customer/pages/blocks.tsx')));
check('PRO-04: the no-trial nudge exists in es and en', both(STR.customer, 'customer.home.membership.nudge.noTrial'));

// ── 5 · PRO-05: the affiliate pack in the app ─────────────────────────────────────────────────────────────────────
const member = (audience) => ({ id: 'mem_1', data: { person: 'per_c', status: 'active', price_audience: audience, joined_at: '2026-10-01' }, createdAt: '2026-10-01T10:00:00Z' });
check('PRO-05: a member facet with price_audience affiliate is an affiliate', safe(() => O.affiliateFromMembers([member('affiliate')])) === true);
check('PRO-05: general, empty, missing facet or a hostile shape is not', safe(() => O.affiliateFromMembers([member('general')])) === false && safe(() => O.affiliateFromMembers([member(null)])) === false
  && safe(() => O.affiliateFromMembers([])) === false && safe(() => O.affiliateFromMembers([null, { data: null }, { id: 'x' }, { data: { price_audience: ['affiliate'] } }])) === false);
const smtc = { id: 'pack12_smtc', audience: { es: 'Afiliados', en: 'Affiliates' } }, pack = { id: 'pack12' };
check('PRO-05: the app hides the affiliate pack from a non-affiliate (production)', safe(() => O.audienceVisible(smtc, { live: true, affiliate: false })) === false && safe(() => O.audienceVisible(pack, { live: true, affiliate: false })) === true);
check('PRO-05: …and while the facet is still unknown', safe(() => O.audienceVisible(smtc, { live: true, affiliate: null })) === false);
check('PRO-05: an affiliate sees it', safe(() => O.audienceVisible(smtc, { live: true, affiliate: true })) === true);
check('PRO-05: the review build is unchanged (shows it)', safe(() => O.audienceVisible(smtc, { live: false, affiliate: null })) === true);
check('PRO-05: the app checkout and Plans filter by it; the public site is unchanged', /audienceVisible/.test(checkout) && /audienceVisible/.test(src('src/modules/customer/pages/PlansPage.tsx')) && !/audienceVisible/.test(src('src/modules/website/pages/PlansPage.tsx')));

// ── 6 · PRO-06: each live lot with its source and expiry ─────────────────────────────────────────────────────────
const A = MAP.adapterFor?.('class_ledger');
const ce = (id, data, createdAt = '2026-10-01T10:00:00Z') => ({ id, data: { person: 'per_c', ...data }, createdAt, updatedAt: createdAt });
const records = [
  ce('ce_1', { delta: 12, reason: 'grant', lot: { id: 'lot_pack', source: 'purchase', valid_until: '2026-12-31', product: 'prd_pack', payment: 'pay_pack' } }),
  ce('ce_2', { delta: -1, reason: 'booking', booking: 'bk_9', lot: { id: 'lot_pack', source: 'purchase', valid_until: '2026-12-31', product: 'prd_pack', payment: 'pay_pack' } }, '2026-10-05T10:00:00Z'),
  ce('ce_3', { delta: 1, reason: 'grant', lot: { id: 'lot_trial', source: 'trial', valid_until: '2026-11-20', product: 'prd_trial', payment: null } }),
  ce('ce_4', { delta: 2, reason: 'grant', lot: { id: 'lot_courtesy', source: 'courtesy', valid_until: null } }),
  ce('ce_5', { delta: 1, reason: 'grant', lot: { id: 'lot_gift_old', source: 'gift', valid_until: '2026-10-15' } }),
  ce('ce_6', { delta: 1, reason: 'grant', lot: { id: 'lot_used', source: 'gift', valid_until: '2026-12-31' } }),
  ce('ce_7', { delta: -1, reason: 'booking', lot: { id: 'lot_used', source: 'gift', valid_until: '2026-12-31' } }, '2026-10-06T10:00:00Z'),
];
const rows = A ? records.map((r) => MAP.fromRecord(A, r)) : [];
const payments = [{ id: 'pay_pack', tenant_id: rows[0]?.tenant_id, user_id: 'per_c', plan_id: 'prd_pack', status: 'approved' }];
const lots = safe(() => O.liveLots(MAP.approvedPackageRows(rows, payments), '2026-11-02'));
const byId = (id) => Array.isArray(lots) ? lots.find((l) => l.id === id) : undefined;
check('PRO-06: every live lot is listed, used-up and expired ones are not', Array.isArray(lots) && lots.length === 3 && !byId('lot_gift_old') && !byId('lot_used'), JSON.stringify(lots));
check('PRO-06: the bought pack with its classes left, source and expiry', byId('lot_pack')?.source === 'purchase' && byId('lot_pack')?.left === 11 && byId('lot_pack')?.expires === '2026-12-31', JSON.stringify(byId('lot_pack')));
check('PRO-06: the trial lot is named as the trial (lot_source)', byId('lot_trial')?.source === 'trial' && byId('lot_trial')?.expires === '2026-11-20');
check('PRO-06: a lot without an expiry says so (expires null → "no expiry")', byId('lot_courtesy')?.source === 'courtesy' && byId('lot_courtesy')?.expires === null);
check('PRO-06: soonest expiry first, no expiry last', Array.isArray(lots) && lots.map((l) => l.id).join() === 'lot_trial,lot_pack,lot_courtesy', Array.isArray(lots) ? lots.map((l) => l.id).join() : '');
check('PRO-06: a source the app does not know reads as plain classes (no raw key on screen)', safe(() => O.lotSourceKey({ lot_source: 'migrated_x', reason: 'comp' })) === 'other' && safe(() => O.lotSourceKey({ lot_source: null, reason: 'gift' })) === 'gift');
check('PRO-06: source, expiry and "no expiry" copy in es and en', ['customer.lot.source.purchase', 'customer.lot.source.trial', 'customer.lot.source.gift', 'customer.lot.source.courtesy', 'customer.lot.source.comp', 'customer.lot.source.voucher', 'customer.lot.source.other', 'customer.lot.expires', 'customer.lot.noExpiry', 'customer.lot.left.one', 'customer.lot.left.other'].every((k) => both(STR.customer, k)));
check('PRO-06: the home card and the balance list the lots (LotList, with its library meta)', /LotList/.test(src('src/modules/customer/HomePage.tsx')) && /LotList/.test(src('src/modules/customer/pages/PassesPage.tsx')) && existsSync('src/components/molecule/LotList/LotList.meta.ts'));

// ── 7 · WEB-03: the schedule drawer speaks to a signed-in visitor ─────────────────────────────────────────────────
const signedIn = safe(() => W.drawerCopy(true)), signedOut = safe(() => W.drawerCopy(false));
check('WEB-03: signed out keeps the sign-in copy (unchanged)', signedOut?.title === 'site.schedule.loginTitle' && signedOut?.body === 'site.schedule.loginBody', JSON.stringify(signedOut));
check('WEB-03: signed in gets its own title and body', signedIn?.title === 'site.schedule.bookTitle' && signedIn?.body === 'site.schedule.bookBody' && both(STR.website, 'site.schedule.bookTitle') && both(STR.website, 'site.schedule.bookBody'), JSON.stringify(signedIn));
check('WEB-03: the website drawer reads drawerCopy', /drawerCopy\(/.test(src('src/modules/website/pages/SchedulePage.tsx')));

// ── 8 · RES-01: day and view in the URL, rows kept on refetch, seven columns ─────────────────────────────────────
const q = (s) => new URLSearchParams(s);
check('RES-01: the calendar reads its day and view from the query', JSON.stringify(safe(() => Q.readCalendarQuery(q('day=2026-11-05&cv=day')))) === '{"day":"2026-11-05","view":"day"}');
check('RES-01: a missing, malformed or hostile value is ignored', JSON.stringify(safe(() => Q.readCalendarQuery(q('day=2026-13-40&cv=javascript:alert(1)')))) === '{"day":null,"view":null}' && JSON.stringify(safe(() => Q.readCalendarQuery(q('')))) === '{"day":null,"view":null}');
const written = safe(() => Q.writeCalendarQuery(q('modality=yoga'), '2026-11-05', 'week'));
check('RES-01: writing the query keeps the other parameters', written?.get?.('day') === '2026-11-05' && written?.get?.('cv') === 'week' && written?.get?.('modality') === 'yoga');
check('RES-01: the query never uses ?view= (the schedule redirects ?view=week to the week route)', !String(written?.toString?.() ?? '').includes('view='));
check('RES-01: the customer schedule keeps the calendar in the URL', /syncUrl/.test(src('src/modules/customer/pages/SchedulePage.tsx')) && /syncUrl/.test(src('src/components/organism/SessionCalendar/SessionCalendar.tsx')));
const rowsHook = src('src/modules/customer/useCustomerRows.ts');
check('RES-01: a refetch keeps the rows on screen (no reset to empty/loading before the answer)', !/const load = async \(\) => \{[^}]*setState\(null\)/s.test(rowsHook) && rowsHook.length > 0);
const css = src('src/components/organism/SessionCalendar/SessionCalendar.css');
check('RES-01: the week grid has no fixed minimum width (Sunday is not cut)', css.length > 0 && !/\.calendar-week \.calendar-grid\{min-width:(?!0)/.test(css));

// ── 9 · RES-02: greeting and demo announcement ───────────────────────────────────────────────────────────────────
check('RES-02: the greeting uses the person row\'s first name', safe(() => G.greetingName({ person: 'Anita Persona', login: 'Ana Prueba', email: 'ana@example.test' })) === 'Anita');
check('RES-02: …falling back to the login\'s name', safe(() => G.greetingName({ person: '', login: 'Ana Prueba', email: 'ana@example.test' })) === 'Ana');
check('RES-02: never the email (a nameless login, or a name that is the email)', safe(() => G.greetingName({ person: null, login: 'sinnombre@example.test', email: 'sinnombre@example.test' })) === '' && safe(() => G.greetingName({ person: 'x@y.test', login: '', email: 'x@y.test' })) === '');
check('RES-02: a hostile name is returned as text (React escapes it)', safe(() => G.greetingName({ person: '<b>Lu</b> Nueva', login: '', email: '' })) === '<b>Lu</b>');
check('RES-02: the greeting without a name exists in es and en', both(STR.customer, 'customer.home.greeting.anon'));
const home = src('src/modules/customer/HomePage.tsx'), blocks = src('src/modules/customer/pages/blocks.tsx');
check('RES-02: the home greets with greetingName (never user.name split)', /greetingName\(/.test(home) && /greetingName\(/.test(blocks) && !/user\.name\.split/.test(home + blocks));
check('RES-02: the fixed demo announcement is left out of the production home', /PRODUCTION_BUILD[^\n]*announcement|announcement[^\n]*PRODUCTION_BUILD/.test(home) && /PRODUCTION_BUILD[^\n]*announcement|announcement[^\n]*PRODUCTION_BUILD/.test(blocks));

console.log(failed ? `\n${failed} hoy-jas-1nov customer check(s) failed` : '\nhoy-jas-1nov customer passed');
process.exitCode = failed ? 1 : 0;
