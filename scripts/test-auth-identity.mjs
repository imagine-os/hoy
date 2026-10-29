// H-2 sign-in rows, logic level (no browser): CU-01…CU-04, PL-03, PL-04. The app config the server hands out, the role
// from Company OS `/me`, the sign-up body and its refusal codes, Clerk's errors, the Clerk flows against a fake Clerk,
// the launch route allowlist and the Google return guard. Fictional fixtures only; Clerk is faked, never called.
// Run: node scripts/test-auth-identity.mjs   (esbuild bundles the TS source, like test-launch-config.mjs)
import { build } from 'esbuild';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };

const bundle = await build({
  stdin: { contents: [
    "export * from './src/auth/appConfig';",
    "export * from './src/auth/companyOsIdentity';",
    "export * from './src/auth/clerkFlows';",
    "export { safeAuthBack, visitorSignIn } from './src/auth/visitorSignIn';",
    "export { signInReturn, homeFor, authLink } from './src/auth/signInReturn';",
    "export { LAUNCH_ROUTES, isLaunchRoute } from './src/config/launchRoutes';",
    "export { getSessionToken, setSessionTokenSource } from './src/auth/sessionToken';",
  ].join('\n'), resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { 'import.meta.env': '{"VITE_HOY_BUILD":"review","DEV":false}' },
});
const M = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

// ── App config (the Hoy server's /app-config.json) ─────────────────────────────────────────────────────────────
const good = { tenant: 'hoy-test', apiBase: '/api/cos', clerkPublishableKey: 'pk_test_ZmFrZS5jbGVyay5hY2NvdW50cy5kZXYk', environment: 'test' };
check('config: a well-formed answer is accepted', JSON.stringify(M.parseAppConfig(good)) === JSON.stringify(good));
check('config: the Company OS path is /api/cos/t/<tenant>/…', M.cosPath(M.parseAppConfig(good), '/me') === '/api/cos/t/hoy-test/me');
const refused = [
  ['an absolute API base (token would leave the origin)', { ...good, apiBase: 'https://evil.example/api' }],
  ['a protocol-relative API base', { ...good, apiBase: '//evil.example/api' }],
  // Built at run time so the PL-06 secret scan (test-launch-secrets.mjs) does not see a key shape in the source.
  ['a secret key in place of the publishable key', { ...good, clerkPublishableKey: ['sk', 'test', 'x'.repeat(26)].join('_') }],
  ['a missing publishable key (server not configured)', { ...good, clerkPublishableKey: null }],
  ['a tenant slug with a path in it', { ...good, tenant: 'hoy/../other' }],
];
for (const [what, raw] of refused) check(`config: refuses ${what}`, (() => { try { M.parseAppConfig(raw); return false; } catch { return true; } })());

// ── PL-04: the role comes from /me, never from the browser ──────────────────────────────────────────────────────
const me = (roleKeys, extra = {}) => M.parseMe({ user: { id: 'usr_1', name: 'Ana Prueba', email: 'ana@example.test' }, roleKeys, isSuperAdmin: false, caps: [], ...extra });
check('PL-04 member → customer', M.roleFromMe(me(['member'])) === 'customer');
check('PL-04 front_desk → front_desk', M.roleFromMe(me(['front_desk'])) === 'front_desk');
check('PL-04 administrator → admin', M.roleFromMe(me(['administrator'])) === 'admin');
check('PL-04 several roles: the widest launch role wins', M.roleFromMe(me(['member', 'front_desk'])) === 'front_desk' && M.roleFromMe(me(['member', 'administrator', 'front_desk'])) === 'admin');
check('PL-04 a Company OS super admin works as Administration (no dev tools in production)', M.roleFromMe(me([], { isSuperAdmin: true })) === 'admin');
check('PL-04 a role that is not a launch role opens nothing (fail closed)', M.roleFromMe(me(['coach'])) === null && M.roleFromMe(me([])) === null);
check('PL-04 "super_admin" as a plain role key is not trusted (only isSuperAdmin)', M.roleFromMe(me(['super_admin'])) === null);
check('PL-04 caps are carried from /me', JSON.stringify(me(['member'], { caps: ['x.read', 7] }).caps) === '["x.read"]');
check('/me 200 with a valid body → member', M.classifyMe(200, { user: { id: 'u' }, roleKeys: ['member'] }).kind === 'member');
check('/me 200 with a malformed body → error (no guessed role)', M.classifyMe(200, { roleKeys: 'member' }).kind === 'error');
check('/me 403 no access to this tenant → finish sign-up', M.classifyMe(403, { error: 'no access to this tenant' }).kind === 'not-member');
check('/me 403 account_not_invited → finish sign-up', M.classifyMe(403, { error: 'account_not_invited' }).kind === 'not-member');
check('/me 403 email_not_verified → unverified', M.classifyMe(403, { error: 'email_not_verified' }).kind === 'unverified');
check('/me 401 → unauthorized', M.classifyMe(401, { error: 'unauthorized' }).kind === 'unauthorized');
check('/me 502 → error with the code', JSON.stringify(M.classifyMe(502, null)) === '{"kind":"error","code":"http_502"}');

// ── CU-01 / CU-02: sign-up through Company OS (ADR 0038) ────────────────────────────────────────────────────────
const cfg = M.parseSignupConfig({ enabled: true, consents: [{ document: 'terms', version: '2026-10-01' }, { document: 'privacy', version: '2026-10-01' }], personFields: ['name', 'phone'], facetFields: ['emergency_contact_name', 'emergency_contact_phone'] });
const form = { name: '  Ana Prueba ', whatsapp: '+57 300 555 0101', ecName: 'Luis Prueba', ecPhone: '+57 (300) 555-0102', accepted: true };
check('CU-01 a complete form has no errors', Object.keys(M.signupFormErrors(form, cfg)).length === 0);
const empty = M.signupFormErrors({ name: '', whatsapp: '+57 ', ecName: '', ecPhone: '', accepted: false }, cfg);
check('CU-01 name and WhatsApp are required; no guest account', empty.name === 'required' && empty.whatsapp === 'phone');
check('CU-01 the emergency contact is required when the studio asks for it', empty.ecName === 'required' && empty.ecPhone === 'phone');
check('CU-02 consent is required when the studio lists documents', empty.accepted === 'consent');
check('CU-01 a WhatsApp number needs 10–15 digits', M.isPhoneNumber('+57 300 555 0101') && !M.isPhoneNumber('300 555') && !M.isPhoneNumber('+57 300 555 0101 1234 99') && !M.isPhoneNumber('call me'));
const body = M.signupBody(form, cfg);
check('CU-01 body: person name trimmed and WhatsApp as +digits', body.person.name === 'Ana Prueba' && body.person.phone === '+573005550101');
check('CU-01 body: the email is never sent (Company OS takes the verified one from Clerk)', !('email' in body.person) && !JSON.stringify(body).includes('@'));
check('CU-01 body: emergency contact in the member facet', body.facet.emergency_contact_name === 'Luis Prueba' && body.facet.emergency_contact_phone === '+573005550102');
check('CU-02 body: the accepted documents with their versions', JSON.stringify(body.consents) === JSON.stringify(cfg.consents));
const narrow = M.parseSignupConfig({ enabled: true, consents: [], personFields: ['name', 'phone'], facetFields: [] });
check('CU-01 body: only the fields the tenant allows are sent', JSON.stringify(M.signupBody(form, narrow)) === '{"person":{"name":"Ana Prueba","phone":"+573005550101"},"facet":{},"consents":[]}');
check('CU-01 a tenant that does not accept name and phone cannot sign people up here (fail closed)', M.parseSignupConfig({ enabled: true, consents: [], personFields: ['name'], facetFields: [] }).enabled === false);
check('sign-up config: enabled:false is closed', M.parseSignupConfig({ enabled: false }).enabled === false && M.parseSignupConfig({ enabled: 'yes' }) === null);
check('sign-up 201 → done', M.classifySignup(201, { userId: 'u' }).kind === 'done');
check('sign-up 409 already_registered (a retry) → done', M.classifySignup(409, { error: 'already_registered' }).kind === 'done');
const changed = M.classifySignup(422, { error: 'consent_required', details: { required: [{ document: 'terms', version: '2026-11-01' }] } });
check('CU-02 422 consent_required → the new versions to accept', changed.kind === 'consent-changed' && changed.required[0].version === '2026-11-01');
check('sign-up 403 signup_disabled → closed', M.classifySignup(403, { error: 'signup_disabled' }).kind === 'disabled');
check('sign-up 400 invalid body → invalid with the code', JSON.stringify(M.classifySignup(400, { error: 'invalid body' })) === '{"kind":"invalid","code":"invalid body"}');
check('sign-up 422 duplicate_person_user → invalid (staff fix the link)', M.classifySignup(422, { error: 'duplicate_person_user' }).kind === 'invalid');

// ── CU-03: Clerk errors → copy ──────────────────────────────────────────────────────────────────────────────────
const ce = (code, extra = {}) => ({ errors: [{ code, ...extra }] });
check('CU-03 a wrong code', M.clerkErrorKind(ce('form_code_incorrect')) === 'wrong-code');
check('CU-03 the code expires', M.clerkErrorKind(ce('verification_expired')) === 'expired');
check('CU-03 repeated failures lock the account for a while', M.clerkErrorKind(ce('user_locked')) === 'locked' && M.clerkErrorKind(ce('user_locked_indefinitely')) === 'locked');
check('CU-03 rate limit', M.clerkErrorKind({ status: 429 }) === 'rate-limited' && M.clerkErrorKind(ce('too_many_requests')) === 'rate-limited');
check('anything else → generic (no raw message shown)', M.clerkErrorKind(new Error('boom')) === 'generic' && M.clerkErrorKind(ce('who_knows')) === 'generic');

// ── CU-03 flows against a fake Clerk ────────────────────────────────────────────────────────────────────────────
function fakeClerk({ known = ['ana@example.test'], code = '424242', lock = false } = {}) {
  const calls = [];
  const fail = (c) => { throw { errors: [{ code: c }] }; };
  const attempt = (status) => ({ status, createdSessionId: status === 'complete' ? 'sess_1' : null });
  const clerk = {
    calls, active: null,
    client: {
      signIn: {
        async create({ identifier }) { calls.push(['signIn.create', identifier]); if (!known.includes(identifier)) fail('form_identifier_not_found'); return { ...this, supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'ea_1' }] }; },
        async prepareFirstFactor(p) { calls.push(['signIn.prepare', p.strategy, p.emailAddressId]); return this; },
        async attemptFirstFactor(p) { calls.push(['signIn.attempt', p.code]); if (lock) fail('user_locked'); if (p.code !== code) fail('form_code_incorrect'); return attempt('complete'); },
        async authenticateWithRedirect(p) { calls.push(['signIn.google', p]); },
      },
      signUp: {
        async create({ emailAddress }) { calls.push(['signUp.create', emailAddress]); return this; },
        async prepareEmailAddressVerification(p) { calls.push(['signUp.prepare', p.strategy]); return this; },
        async attemptEmailAddressVerification(p) { calls.push(['signUp.attempt', p.code]); return p.code === code ? attempt('complete') : attempt('missing_requirements'); },
      },
    },
    async setActive({ session }) { calls.push(['setActive', session]); clerk.active = session; },
    async signOut() { calls.push(['signOut']); clerk.active = null; },
  };
  return clerk;
}
let clerk = fakeClerk();
check('CU-03 a known email gets a sign-in code by email', await M.sendEmailCode(clerk, ' ana@example.test ') === 'sign-in' && JSON.stringify(clerk.calls[1]) === '["signIn.prepare","email_code","ea_1"]');
const wrong = await rejects(M.verifyEmailCode(clerk, 'sign-in', '000000'));
check('CU-03 a wrong code is refused and no session starts', M.clerkErrorKind(wrong) === 'wrong-code' && clerk.active === null);
await M.verifyEmailCode(clerk, 'sign-in', ' 424 242 ');
check('CU-03 the right code (spaces ignored) starts the session', clerk.active === 'sess_1');
clerk = fakeClerk();
check('CU-01 a new email gets a sign-up code (same screen)', await M.sendEmailCode(clerk, 'nuevo@example.test') === 'sign-up' && clerk.calls.some((c) => c[0] === 'signUp.prepare'));
const incomplete = await rejects(M.verifyEmailCode(clerk, 'sign-up', '111111'));
check('an incomplete Clerk sign-up does not start a session', incomplete && clerk.active === null);
await M.verifyEmailCode(clerk, 'sign-up', '424242');
check('CU-01 the sign-up code starts the Clerk session (Hoy registration follows)', clerk.active === 'sess_1');
clerk = fakeClerk({ lock: true });
await M.sendEmailCode(clerk, 'ana@example.test');
check('CU-03 a locked account surfaces as locked', M.clerkErrorKind(await rejects(M.verifyEmailCode(clerk, 'sign-in', '424242'))) === 'locked');
clerk = fakeClerk();
await M.signInWithGoogle(clerk, '/auth/sign-in?next=%2Fapp%2Fplans', { origin: 'https://hoy.example', pathname: '/' });
const g = clerk.calls.find((c) => c[0] === 'signIn.google')[1];
check('CU-03 Google returns to this origin\'s #/auth/callback', g.strategy === 'oauth_google' && g.redirectUrl.startsWith('https://hoy.example/#/auth/callback?back=') && g.redirectUrlComplete === 'https://hoy.example/#/auth/sign-in?next=%2Fapp%2Fplans');

// ── CU-04: no self-serve email change (review round 1, B1) ──────────────────────────────────────────────────────
check('CU-04 the Clerk flows offer no email change (the studio changes it in Company OS)', !('startEmailChange' in M) && !('finishEmailChange' in M));

// ── Session token seam (H-3) ────────────────────────────────────────────────────────────────────────────────────
check('token seam: the review build has no token', await M.getSessionToken() === null);
M.setSessionTokenSource(async () => 'tok_1');
check('token seam: a registered source answers', await M.getSessionToken() === 'tok_1');
M.setSessionTokenSource(null);

// ── PL-03: launch routes only ───────────────────────────────────────────────────────────────────────────────────
const launch = ['/', '/site', '/site/plans', '/auth/sign-in', '/auth/sign-up', '/auth/callback', '/app', '/app/checkout/:id', '/app/access', '/staff', '/staff/checkin', '/staff/expense', '/admin', '/admin/crm/:id', '/admin/settings/hours', '/admin/products', '/no-access'];
const hidden = ['/hub', '/hub/promotions', '/dev', '/dev/tokens', '/docs', '/docs/*', '/manual', '/manual/:chapter', '/teach', '/app/state/empty', '/app/events', '/app/rate/:id', '/app/gift', '/app/practice', '/auth/recover', '/auth/locked', '/admin/tables', '/admin/whatsapp', '/admin/finance/payouts', '/admin/class-pay', '/admin/integrations', '/admin/content', '/promotions', '/staff/maintenance', '/admin/marketing'];
check(`PL-03 launch routes stay (${launch.length})`, launch.every((p) => M.isLaunchRoute(p)), launch.filter((p) => !M.isLaunchRoute(p)).join(', '));
check(`PL-03 review tools and non-launch routes are gone (${hidden.length})`, hidden.every((p) => !M.isLaunchRoute(p)), hidden.filter((p) => M.isLaunchRoute(p)).join(', '));
check('PL-03 a prefix does not leak into a longer name (/admin/financeX)', !M.isLaunchRoute('/admin/financeX') && !M.isLaunchRoute('/sitemap'));

// ── Google return guard (no open redirect) ──────────────────────────────────────────────────────────────────────
check('return: sign-in with a valid next is kept', M.safeAuthBack('/auth/sign-in?next=/app/plans') === '/auth/sign-in?next=%2Fapp%2Fplans');
check('return: an outside URL falls back to sign-in', ['https://evil.example', '//evil.example', '/admin', 'javascript:alert(1)', null].every((v) => M.safeAuthBack(v) === '/auth/sign-in'));
check('return: an unsafe next is dropped', M.safeAuthBack('/auth/sign-up?next=https://evil.example') === '/auth/sign-up');

// ── Deep links survive sign-in (F3): any internal launch route, as a strict path ────────────────────────────────
const deep = ['/staff/transfers', '/staff/checkin', '/app/receipts/pay_123', '/app/booking/bk-1', '/app/pay/class/occ_9', '/admin/crm/per_1', '/admin/finance/expenses'];
check('return: launch deep links are kept as next', deep.every((p) => M.visitorSignIn(p) === `/auth/sign-in?next=${encodeURIComponent(p)}`), deep.filter((p) => !M.visitorSignIn(p).includes('next')).join(', '));
const bad = ['/staff/transfers?x=1', '/staff/../admin', '/app/receipts/a%2Fb', '/hub', '/dev/tokens', '/auth/sign-in', '/site', '/', '//evil.example', '/app/receipts/a/b', '/admin/tables', '/staff/maintenance', 'https://evil.example/staff'];
check('return: anything but a strict launch path is dropped', bad.every((p) => M.signInReturn(p) === null), bad.filter((p) => M.signInReturn(p) !== null).join(', '));
check('return: the customer allowlist still applies (query kept)', M.signInReturn('/app/checkout/occ_1?mat=3') === '/app/checkout/occ_1?mat=3');
check('return: staff follow a staff next; a customer is not sent into staff', M.homeFor('front_desk', '/staff/transfers') === '/staff/transfers' && M.homeFor('customer', '/staff/transfers') === '/app' && M.homeFor('customer', '/app/receipts/p1') === '/app/receipts/p1' && M.homeFor('admin', '/app/booking/b1') === '/admin');
check('return: the Google back link keeps a staff next', M.safeAuthBack('/auth/sign-in?next=/staff/transfers') === '/auth/sign-in?next=%2Fstaff%2Ftransfers');

// ── Token wait: a Clerk that never loads answers null (production build) ────────────────────────────────────────
{
  const prod = await build({
    stdin: { contents: "export { getSessionToken, setSessionTokenSource, TOKEN_WAIT_MS } from './src/auth/sessionToken';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false}' },
  });
  const P = await import('data:text/javascript;base64,' + Buffer.from(prod.outputFiles[0].text).toString('base64'));
  const started = Date.now();
  const none = await P.getSessionToken();
  const waited = Date.now() - started;
  check('token seam: no Clerk → null after the wait, not a hang', none === null && waited >= P.TOKEN_WAIT_MS - 50 && waited < P.TOKEN_WAIT_MS + 2000, `${waited} ms`);
  const late = P.getSessionToken();
  P.setSessionTokenSource(async () => 'tok_late');
  check('token seam: a source registered while waiting answers', await late === 'tok_late');
}

console.log(failed ? `\n${failed} H-2 identity check(s) failed` : '\nH-2 identity passed');
process.exitCode = failed ? 1 : 0;
