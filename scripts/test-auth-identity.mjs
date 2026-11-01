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
    "export { purchaseEntry, enrolsAsCustomer } from './src/auth/purchaseEntry';",
    "export { LAUNCH_ROUTES, isLaunchRoute } from './src/config/launchRoutes';",
    "export { getSessionToken, setSessionTokenSource } from './src/auth/sessionToken';",
    "export * as team from './src/modules/admin/team/teamApi';",
    "export { strings as identityStrings } from './src/modules/identity/strings';",
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
// Hoy all-roles (lane C): one role-key table for every Company OS key; the super-admin rows below changed on purpose
// (a super admin was folded into Administration at launch; it is now its own session role).
const KEYS = { member: 'customer', front_desk: 'front_desk', administrator: 'admin', booking_manager: 'coordinator', treasurer: 'finance', coach: 'teacher', maintenance: 'maintenance', marketing: 'marketing', developer: 'developer' };
for (const [key, role] of Object.entries(KEYS)) check(`PL-04 ${key} → ${role}`, M.roleFromMe(me([key])) === role, String(M.roleFromMe(me([key]))));
check('roles: the table maps every Company OS key to a HoyOS role (and super_admin)', JSON.stringify(Object.fromEntries(Object.entries(M.ROLE_OF_KEY ?? {}).filter(([k]) => k !== 'super_admin'))) === JSON.stringify(Object.fromEntries(Object.keys(M.ROLE_OF_KEY ?? {}).filter((k) => k !== 'super_admin').map((k) => [k, KEYS[k]]))) && Object.keys(KEYS).every((k) => M.ROLE_OF_KEY?.[k] === KEYS[k]) && M.ROLE_OF_KEY?.super_admin === 'super_admin');
check('roles: every signed-in HoyOS role has exactly one Company OS key', ['super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'marketing', 'developer', 'customer'].every((r) => (M.ROLE_KEYS ?? []).filter((x) => x.role === r).length === 1) && !(M.ROLE_KEYS ?? []).some((x) => x.role === 'public'));
check('roles: public_site (the signed-out service identity) is never a user role', M.roleFromMe(me(['public_site'])) === null && M.ROLE_OF_KEY?.public_site === undefined);
check('PL-04 several roles: the documented primary order decides (administrator, super admin, coordinator, finance, front desk, marketing, maintenance, developer, teacher, customer)',
  M.roleFromMe(me(['member', 'front_desk'])) === 'front_desk' && M.roleFromMe(me(['member', 'administrator', 'front_desk'])) === 'admin'
  && M.roleFromMe(me(['coach', 'member'])) === 'teacher' && M.roleFromMe(me(['front_desk', 'treasurer'])) === 'finance' && M.roleFromMe(me(['booking_manager', 'treasurer'])) === 'coordinator'
  && M.roleFromMe(me(['developer', 'maintenance', 'marketing'])) === 'marketing' && M.roleFromMe(me(['coach', 'developer'])) === 'developer');
check('PL-04 the primary role does not depend on the order /me lists the keys', M.roleFromMe(me(['member', 'coach', 'treasurer'])) === M.roleFromMe(me(['treasurer', 'coach', 'member'])));
// Changed on purpose (lane C): super admin is a real session role now.
check('PL-04 a Company OS super admin (isSuperAdmin, no Administration) is the super_admin role', M.roleFromMe(me(['super_admin'], { isSuperAdmin: true })) === 'super_admin' && M.roleFromMe(me([], { isSuperAdmin: true })) === 'super_admin' && M.roleFromMe(me(['operator'], { isSuperAdmin: true })) === 'super_admin');
check('PL-04 super admin outranks every role but Administration', M.roleFromMe(me(['super_admin', 'member', 'booking_manager'], { isSuperAdmin: true })) === 'super_admin');
check('PL-04 Administration keeps its role although it holds the tenant super_admin membership (AD-04)', M.roleFromMe(me(['administrator', 'super_admin'], { isSuperAdmin: true })) === 'admin' && M.isSuperAdminMe?.(me(['administrator', 'super_admin'], { isSuperAdmin: true })) === false);
check('PL-04 the session isSuperAdmin comes from /me (and only for the super_admin role)', M.isSuperAdminMe?.(me(['super_admin'], { isSuperAdmin: true })) === true && M.isSuperAdminMe?.(me(['member'])) === false && M.isSuperAdminMe?.(me(['super_admin'])) === false);
check('PL-04 "super_admin" as a plain role key is not trusted (only with isSuperAdmin)', M.roleFromMe(me(['super_admin'])) === null && M.roleFromMe(me(['super_admin', 'member'])) === 'customer');
check('PL-04 an unknown role key opens nothing (fail closed)', M.roleFromMe(me(['owner'])) === null && M.roleFromMe(me([])) === null && M.roleFromMe(me(['__proto__', 'constructor', 'toString'])) === null);
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
// Changed on purpose (review round 2, r2hoy, with r2co's contract): 409 already_registered is "the login already holds the
// sign-up role" only when /me says so. It is re-checked, never taken as done on its word (a lost answer and a double tap
// go on; anything else is a conflict).
check('sign-up 409 already_registered → re-check /me (not done on its word)', M.classifySignup(409, { error: 'already_registered' }).kind === 'already-registered');
check('r2 sign-up 409 email_linked_to_other_login → its own outcome, never done', M.classifySignup(409, { error: 'email_linked_to_other_login', message: 'a person with this email is linked to another login' }).kind === 'email-linked');
check('r2 sign-up another 409 → an error with its code, never done', JSON.stringify(M.classifySignup(409, { error: 'idempotency_conflict' })) === '{"kind":"error","code":"idempotency_conflict"}');
const meAnswer = (roleKeys, extra = {}) => ({ user: { id: 'u_fict', name: 'Ficticia', email: 'f@example.test' }, roleKeys, isSuperAdmin: false, caps: [], ...extra });
check('r2 after already_registered: /me holding the customer role → it went through (go on)', M.signupHeld(200, meAnswer(['member'])) === true && M.signupHeld(200, meAnswer(['front_desk', 'member'])) === true);
check('r2 after already_registered: /me without the customer role → not held (a conflict)', M.signupHeld(200, meAnswer(['front_desk'])) === false && M.signupHeld(403, { error: 'no access to this tenant' }) === false);
check('r2 after already_registered: a super admin flag alone is not the customer role', M.signupHeld(200, meAnswer([], { isSuperAdmin: true })) === false);
check('r2 after already_registered: /me failing or malformed → unknown (null), never success', M.signupHeld(502, null) === null && M.signupHeld(200, { roleKeys: 'member' }) === null && M.signupHeld(401, { error: 'unauthorized' }) === null);
// Review round 2 (r2hoy, L4): every sign-up refusal has a copy key that fits the screen; the automatic enrolment of a
// studio login never shows a raw code or "create your account".
const key = (status, body, existingLogin, held) => M.signupNoticeKey(M.classifySignup(status, body), { existingLogin, held });
check('r2 enrolment: already_registered not held → the enrolment conflict', key(409, { error: 'already_registered' }, true, false) === 'identity.enrol.conflict');
check('r2 sign-up: already_registered not held → a sign-up conflict line', key(409, { error: 'already_registered' }, false, false) === 'identity.register.conflict');
check('r2 already_registered with /me unknown → a retry line (enrolment and sign-up)', key(409, { error: 'already_registered' }, true, null) === 'identity.enrol.failed' && key(409, { error: 'already_registered' }, false, null) === 'identity.register.failed');
check('r2 email_linked_to_other_login → the "contact the studio" line, on enrolment and on sign-up', key(409, { error: 'email_linked_to_other_login' }, true) === 'identity.signup.emailLinked' && key(409, { error: 'email_linked_to_other_login' }, false) === 'identity.signup.emailLinked');
check('r2 L4 duplicate_person_user → the "studio fixes the link" line, on enrolment and on sign-up', key(422, { error: 'duplicate_person_user' }, true) === 'identity.signup.personLinked' && key(422, { error: 'duplicate_person_user' }, false) === 'identity.signup.personLinked');
check('r2 L4 enrolment: another invalid or failed answer → enrolment lines (no "create your account")', key(400, { error: 'invalid body' }, true) === 'identity.enrol.invalid' && key(500, { error: 'boom' }, true) === 'identity.enrol.failed');
check('r2 sign-up: invalid and failed keep the sign-up lines', key(400, { error: 'invalid body' }, false) === 'identity.register.invalid' && key(500, { error: 'boom' }, false) === 'identity.register.failed');
const idStrings = M.identityStrings ?? {};
check('owner 2026-11-01: no "Join" wording is left in the identity strings', !Object.entries(idStrings).some(([k, v]) => /^identity\.join\./.test(k) || /Únete|Unirme|\bJoin\b/.test(`${v.es} ${v.en}`)), Object.keys(idStrings).filter((k) => k.startsWith('identity.join.')).join(', '));
// The automatic enrolment's body: nothing to fill in, the login's name only when the tenant takes it, consents once accepted.
const ecfg = M.parseSignupConfig({ enabled: true, consents: [{ document: 'terms', version: '2026-10-01' }], personFields: ['name', 'phone'], facetFields: ['emergency_contact_name'] });
check('enrolment body: the login\'s name and the accepted documents, no phone, no facet fields, no email', JSON.stringify(M.enrolmentBody(ecfg, ' Olga Admin ', true)) === '{"person":{"name":"Olga Admin"},"facet":{},"consents":[{"document":"terms","version":"2026-10-01"}]}');
check('enrolment body: not accepted yet sends no consents (Company OS answers consent_required)', JSON.stringify(M.enrolmentBody(ecfg, 'Olga Admin', false).consents) === '[]');
check('enrolment body: an email or a blank name is not sent as the name (Company OS keeps the linked person\'s)', JSON.stringify(M.enrolmentBody(ecfg, 'olga@example.test', true).person) === '{}' && JSON.stringify(M.enrolmentBody(ecfg, ' ', true).person) === '{}');
check('enrolment body: a tenant that does not take the name gets none', JSON.stringify(M.enrolmentBody({ ...ecfg, personFields: ['phone'] }, 'Olga Admin', true).person) === '{}');
const NEW_KEYS = ['identity.register.conflict', 'identity.signup.emailLinked', 'identity.signup.personLinked', 'identity.enrol.invalid', 'identity.enrol.failed', 'identity.enrol.conflict', 'identity.enrol.title', 'identity.enrol.consent', 'identity.enrol.cta', 'identity.enrol.loading', 'identity.enrol.back'];
check('r2 the new lines exist in Spanish and English', NEW_KEYS.every((k) => idStrings[k]?.es && idStrings[k]?.en), NEW_KEYS.filter((k) => !(idStrings[k]?.es && idStrings[k]?.en)).join(', '));
check('r2 L4 the enrolment lines show no code', ['identity.enrol.invalid', 'identity.enrol.failed', 'identity.enrol.conflict', 'identity.signup.emailLinked', 'identity.signup.personLinked'].every((k) => idStrings[k] && !/\{code\}/.test(idStrings[k].es + idStrings[k].en)));
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
const launch = ['/', '/site', '/site/plans', '/auth/sign-in', '/auth/sign-up', '/auth/callback', '/app', '/app/checkout/:id', '/app/access', '/staff', '/staff/checkin', '/staff/expense', '/admin', '/admin/crm/:id', '/admin/settings/hours', '/admin/products', '/no-access', '/teach', '/dev', '/admin/content',
  // The Hub's Construction & testing band, super admin only (lane Y3).
  '/hub', '/docs', '/docs/*', '/docs/source', '/manual', '/manual/:chapter', '/manual/decisions', '/dev/knowledgebase'];
const hidden = ['/hub/promotions', '/dev/tokens', '/dev/api-keys', '/dev/layout/C-01', '/teach/payroll', '/admin/content/media', '/dev/canvas', '/dev/simulator', '/dev/components', '/app/state/empty', '/app/events', '/app/rate/:id', '/app/gift', '/app/practice', '/auth/recover', '/auth/locked', '/admin/tables', '/admin/whatsapp', '/admin/finance/payouts', '/admin/class-pay', '/admin/integrations', '/promotions', '/staff/maintenance', '/admin/marketing'];
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
const bad = ['/staff/transfers?x=1', '/staff/../admin', '/app/receipts/a%2Fb', '/hub/promotions', '/dev/tokens', '/teach/payroll', '/teach/../admin', '/auth/sign-in', '/site', '/', '//evil.example', '/app/receipts/a/b', '/admin/tables', '/staff/maintenance', 'https://evil.example/staff'];
check('return: anything but a strict launch path is dropped', bad.every((p) => M.signInReturn(p) === null), bad.filter((p) => M.signInReturn(p) !== null).join(', '));
check('return: the customer allowlist still applies (query kept)', M.signInReturn('/app/checkout/occ_1?mat=3') === '/app/checkout/occ_1?mat=3');
check('return: staff follow a staff next; a customer is not sent into staff', M.homeFor('front_desk', '/staff/transfers') === '/staff/transfers' && M.homeFor('customer', '/staff/transfers') === '/app' && M.homeFor('customer', '/app/receipts/p1') === '/app/receipts/p1' && M.homeFor('admin', '/app/booking/b1') === '/app/booking/b1' /* owner 2026-11-01: every login follows an /app next */);
check('return: the teacher, hub and dev areas are sign-in returns (their launch routes only)', M.signInReturn('/teach') === '/teach' && M.signInReturn('/dev') === '/dev' && M.signInReturn('/teach/class/occ_1') === (M.isLaunchRoute('/teach/class/:id') ? '/teach/class/occ_1' : null));
check('return: /hub is a return once it is a launch route (lane D)', M.signInReturn('/hub') === (M.isLaunchRoute('/hub') ? '/hub' : null));
const HOMES = { super_admin: '/admin', admin: '/admin', coordinator: '/staff', front_desk: '/staff', finance: '/admin', teacher: '/teach', maintenance: '/staff', marketing: '/admin/content', developer: '/dev', customer: '/app' };
for (const [role, home] of Object.entries(HOMES)) check(`home: ${role} lands on ${home}, a launch route`, M.homeFor(role, null) === home && M.isLaunchRoute(home), M.homeFor(role, null));
check('return: a teacher follows a teacher next; others are not sent into the teacher app', M.homeFor('teacher', '/teach') === '/teach' && M.homeFor('front_desk', '/teach') === '/staff' && M.homeFor('customer', '/teach') === '/app');
check('return: a developer follows /dev; Administration is not sent into dev tools', M.homeFor('developer', '/dev') === '/dev' && M.homeFor('admin', '/dev') === '/admin' && M.homeFor('super_admin', '/dev') === '/dev');
check('return: a staff next outside the role\'s matrix goes home', M.homeFor('marketing', '/admin/finance') === '/admin/content' && M.homeFor('maintenance', '/admin/settings') === '/staff' && M.homeFor('finance', '/admin/finance') === '/admin/finance');
check('return: the Google back link keeps a staff next', M.safeAuthBack('/auth/sign-in?next=/staff/transfers') === '/auth/sign-in?next=%2Fstaff%2Ftransfers');

// ── Test-hoy fixes, lane Y2: one email for staff who are also customers (owner 2026-11-01) ───────────────────
// The session carries every role the login holds (/me), in primary order; the primary is the first one.
const rolesOf = (keys, extra) => M.rolesFromMe?.(me(keys, extra));
check('Y2 roles: every role the login holds, primary first', JSON.stringify(rolesOf(['member', 'administrator'])) === '["admin","customer"]' && JSON.stringify(rolesOf(['member', 'coach', 'front_desk'])) === '["front_desk","teacher","customer"]', JSON.stringify(rolesOf(['member', 'administrator'])));
check('Y2 roles: the first role is always roleFromMe (the primary)', [['member'], ['administrator', 'member'], ['coach', 'member'], ['treasurer', 'booking_manager', 'member'], ['super_admin', 'member']].every((k) => rolesOf(k, k.includes('super_admin') ? { isSuperAdmin: true } : {})?.[0] === M.roleFromMe(me(k, k.includes('super_admin') ? { isSuperAdmin: true } : {}))));
check('Y2 roles: AD-04 Administration\'s technical super_admin membership is not a role it works as', JSON.stringify(rolesOf(['administrator', 'super_admin', 'member'], { isSuperAdmin: true })) === '["admin","customer"]');
check('Y2 roles: a plain "super_admin" key without isSuperAdmin, unknown keys and public_site open nothing', JSON.stringify(rolesOf(['super_admin', 'owner', 'public_site', '__proto__'])) === '[]' && JSON.stringify(rolesOf(['super_admin', 'member'])) === '["customer"]');
check('Y2 roles: a platform operator (isSuperAdmin, no membership) is super_admin only', JSON.stringify(rolesOf([], { isSuperAdmin: true })) === '["super_admin"]');
check('Y2 roles: no duplicates however /me repeats a key', JSON.stringify(rolesOf(['member', 'member', 'administrator', 'administrator'])) === '["admin","customer"]');
// Sign-in return: an /app target is honoured for any login holding the customer role, whatever its primary role.
check('Y2 return: Administration who is also a customer follows an /app next', M.homeFor('admin', '/app/plans?plan=pack12', ['admin', 'customer']) === '/app/plans?plan=pack12' && M.homeFor('front_desk', '/app/receipts/p1', ['front_desk', 'customer']) === '/app/receipts/p1');
check('Y2 return: a staff login that is not a customer yet follows a purchase or booking next (the page enrols it)', M.homeFor('admin', '/app/plans?plan=pack12', ['admin']) === '/app/plans?plan=pack12' && M.homeFor('front_desk', '/app/checkout/occ_1?mat=3') === '/app/checkout/occ_1?mat=3' && M.homeFor('admin', '/app/gift-voucher') === '/app/gift-voucher');
// Changed on purpose (owner 2026-11-01, lane review): every registered login is a customer, so any validated /app next is
// followed for a staff login too; the customer page enrols it.
check('owner: a staff login follows any /app next (the page enrols it)', M.homeFor('admin', '/app/booking/b1', ['admin']) === '/app/booking/b1' && M.homeFor('admin', '/app/receipts/p1') === '/app/receipts/p1' && M.homeFor('teacher', '/app/plans', ['teacher']) === '/app/plans');
check('Y2 return: a hostile next is still dropped for a multi-role login', ['//evil.example', '/app/plans?plan=x&next=//evil', '/app/../admin', 'https://evil.example/app'].every((n) => M.homeFor('admin', n, ['admin', 'customer']) === '/admin'));
check('Y2 return: the held roles never widen a staff next (the matrix of the primary decides)', M.homeFor('marketing', '/admin/finance', ['marketing', 'customer']) === '/admin/content');
// The website's purchase and booking buttons.
check('Y2 entry: signed out → sign-in keeping the return', M.purchaseEntry?.({ role: 'public' }, '/app/plans?plan=pack12') === `/auth/sign-in?next=${encodeURIComponent('/app/plans?plan=pack12')}`);
check('Y2 entry: signed in (any role) → straight to the purchase or booking page', ['customer', 'admin', 'front_desk', 'teacher', 'super_admin'].every((role) => M.purchaseEntry?.({ role }, '/app/checkout/occ_1?mat=3') === '/app/checkout/occ_1?mat=3'));
check('Y2 entry: a target outside the customer allowlist is never followed', M.purchaseEntry?.({ role: 'admin' }, '//evil.example') === '/app' && M.purchaseEntry?.({ role: 'public' }, 'https://evil.example') === '/auth/sign-in');
// Who is enrolled as a customer automatically on a customer page they can't open yet (owner 2026-11-01: every registered
// login is a customer; this replaced Y2's "Join as a customer" offer, same cases).
const joinCase = (o) => M.enrolsAsCustomer?.({ status: 'ready', signedIn: true, viewAs: null, roles: ['admin'], routeRoles: ['customer', 'teacher'], path: '/app/plans', ...o });
check('enrol: a signed-in staff login without the customer role, on a customer page', joinCase({}) === true && joinCase({ roles: ['front_desk'], path: '/app/checkout/occ_1' }) === true);
check('enrol: never while viewing as, signed out, loading or unfinished, or for someone already a customer', joinCase({ viewAs: 'admin' }) === false && joinCase({ signedIn: false }) === false && joinCase({ status: 'loading' }) === false && joinCase({ status: 'needs-signup' }) === false && joinCase({ roles: ['admin', 'customer'] }) === false);
check('enrol: never outside the customer area or on a page customers can\'t open', joinCase({ path: '/admin/settings', routeRoles: ['admin'] }) === false && joinCase({ path: '/staff', routeRoles: ['front_desk'] }) === false && joinCase({ path: '/app/x', routeRoles: ['teacher'] }) === false);
// Review round 1 (r1hoy, M1): a read-only document (a preview frame, or a tab still holding a view-as value) never offers
// a sign-up form whose submit can't succeed: it falls through to the no-access page.
check('r1 M1 enrol: never in a read-only document (a frame or a stored view-as)', joinCase({ readOnly: true }) === false && joinCase({ readOnly: false }) === true);
{
  const prior = globalThis.sessionStorage;
  const kept = new Map([['hoyos.viewAs', 'customer']]);
  globalThis.sessionStorage = { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, String(v)), removeItem: (k) => kept.delete(k) };
  check('r1 M1 enrol: a view-as value kept in the tab (not yet checked by the session) blocks the enrolment, fail closed', joinCase({}) === false);
  globalThis.sessionStorage = prior;
}
check('r1 L5 enrol: a real super admin without the customer role is enrolled on a customer page too', joinCase({ roles: ['super_admin'] }) === true);

// ── AD-06 team panel: every staff role can be granted and changed (Hoy all-roles, lane C) ─────────────────────
{
  const T = M.team;
  const fakeCos = () => { const calls = []; return { calls, request: async (method, path, body) => { calls.push([method, path, body?.roleKey]); return method === 'POST' && path === '/invitations' ? { userId: 'u', invitationId: 'i', url: 'https://clerk.example.invalid/x' } : {}; } }; };
  const safe = async (f) => { try { return await f(); } catch (e) { return e; } };
  const STAFF = ['front_desk', 'administrator', 'super_admin', 'booking_manager', 'treasurer', 'coach', 'maintenance', 'marketing', 'developer'];
  check('team: every staff role key can be chosen (no customer)', STAFF.every((k) => T.TEAM_ROLES.includes(k)) && T.TEAM_ROLES.length === STAFF.length && !T.TEAM_ROLES.includes('member'));
  const u = (id, ...keys) => ({ userId: id, email: `${id}@example.invalid`, name: id, memberships: keys.map((k, i) => ({ membershipId: `${id}_m${i}`, roleKey: k })) });
  for (const k of STAFF.filter((k) => k !== 'super_admin')) check(`team: a ${k} login is on the team with that role`, T.teamMembers([u('x', k)]).length === 1 && T.teamRoleOf(u('x', k)) === k, String(T.teamRoleOf(u('x', k))));
  check('team: Administration with its super_admin membership shows as Administration (AD-04)', T.teamRoleOf(u('a', 'administrator', 'super_admin')) === 'administrator');
  // Changed on purpose (lane C): a super_admin-only login is the Super admin role, not Administration.
  check('team: a super_admin-only login shows as Super admin', T.teamRoleOf(u('s', 'super_admin')) === 'super_admin');
  check('team: a coach who is also a customer shows as Teacher; customers alone are not listed', T.teamRoleOf(u('c', 'member', 'coach')) === 'coach' && T.teamMembers([u('m', 'member')]).length === 0);
  for (const k of STAFF.filter((k) => k !== 'super_admin')) {
    const cos = fakeCos();
    await safe(() => T.invite(cos.request, `${k}@example.invalid`, k, T.inviteRedirect('https://app.example.invalid', k)));
    check(`team: inviting ${k} posts that role key${k === 'administrator' ? ' (and super_admin after it, AD-04)' : ''}`, cos.calls[0]?.[1] === '/invitations' && cos.calls[0][2] === k && (k === 'administrator' ? cos.calls[1][2] === 'super_admin' && cos.calls.length === 2 : cos.calls.length === 1), JSON.stringify(cos.calls));
  }
  const HOME = { front_desk: '/staff', administrator: '/admin', super_admin: '/admin', booking_manager: '/staff', treasurer: '/admin', coach: '/teach', maintenance: '/staff', marketing: '/admin/content', developer: '/dev' };
  check('team: each invitation returns to the role\'s home', Object.entries(HOME).every(([k, h]) => T.inviteRedirect('https://app.example.invalid', k) === `https://app.example.invalid/#/auth/sign-in?next=${h}`), STAFF.map((k) => T.inviteRedirect('', k)).join(' '));
  let cos = fakeCos();
  await safe(() => T.changeRole(cos.request, u('d', 'front_desk', 'member'), 'coach'));
  check('team: changing Front desk to Teacher adds coach first, then removes front_desk (the customer stays)', JSON.stringify(cos.calls) === JSON.stringify([['POST', '/admin/users', 'coach'], ['DELETE', '/admin/memberships/d_m0', null]].map(([a, b, c]) => [a, b, c ?? undefined])), JSON.stringify(cos.calls));
  cos = fakeCos();
  await safe(() => T.changeRole(cos.request, u('t', 'treasurer'), 'administrator'));
  check('team: changing Finance to Administration adds administrator and super_admin, then removes treasurer', JSON.stringify(cos.calls.map((c) => c[2] ?? c[1])) === JSON.stringify(['administrator', 'super_admin', '/admin/memberships/t_m0']), JSON.stringify(cos.calls));
  cos = fakeCos();
  await safe(() => T.removeFromTeam(cos.request, u('r', 'marketing', 'member')));
  check('team: removing a Marketing login removes marketing only', JSON.stringify(cos.calls.map((c) => c[1])) === JSON.stringify(['/admin/memberships/r_m0']));
  const users = [u('a', 'administrator', 'super_admin'), u('s', 'super_admin'), u('d', 'front_desk')];
  check('team: only a super admin grants or changes Super admin (the screen asks first; Company OS decides)', T.teamGuard(users, users[2], 'super_admin', 'a', false) === 'super_admin_only' && T.teamGuard(users, users[1], 'front_desk', 'a', false) === 'super_admin_only' && T.teamGuard(users, users[2], 'super_admin', 's', true) === null && T.teamGuard(users, users[2], 'coach', 'a', false) === null);
  check('team: last administrator and self are still protected', T.teamGuard([users[0], users[2]], users[0], 'coach', 'd', true) === 'last_admin' && T.teamGuard(users, users[2], 'coach', 'd', true) === 'self');
  check('team: an unknown role key is refused before anything is sent', await rejects(T.invite(fakeCos().request, 'x@example.invalid', 'owner', '')) !== null && await rejects(T.changeRole(fakeCos().request, u('z', 'front_desk'), 'member')) !== null);
}

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
