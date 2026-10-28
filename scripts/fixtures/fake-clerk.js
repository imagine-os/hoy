// A fake clerk-js for the H-2 browser tests (scripts/test-auth-production-ui.mjs). The test serves it in place of
// Clerk's CDN script (`…/npm/@clerk/clerk-js@*/dist/clerk.browser.js`), so the production bundle runs unchanged and
// nothing in the bundle can switch to a fake. Fictional accounts only. It implements the classic resources the app
// uses (client.signIn / client.signUp / user / session) and the listener contract @clerk/react reads.
// The test steers it through `window.__fakeClerk` (accounts, the next code, lockout) and reads its call log.
(() => {
  const STORE = 'fake-clerk-state';
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch { return null; } })();
  const cfg = window.__fakeClerkConfig || {};
  const state = saved || { accounts: cfg.accounts || {}, active: null, seq: 0 };
  const control = window.__fakeClerk = { calls: [], code: cfg.code || '424242', lock: false, state };
  const persist = () => sessionStorage.setItem(STORE, JSON.stringify(state));
  const fail = (code, status = 422) => { const e = new Error(code); e.errors = [{ code, message: code, longMessage: code }]; e.status = status; e.clerkError = true; throw e; };
  const listeners = new Set();
  const statusListeners = new Set();

  function userResource(id) {
    const acc = state.accounts[id];
    if (!acc) return null;
    const address = (a) => ({
      id: a.id, emailAddress: a.email, verification: { status: a.verified ? 'verified' : 'unverified' },
      async prepareVerification() { control.calls.push(['email.prepare', a.email]); },
      async attemptVerification({ code }) {
        control.calls.push(['email.attempt', a.email, code]);
        if (code !== control.code) fail('form_code_incorrect');
        a.verified = true; persist(); return { ...address(a), verification: { status: 'verified' } };
      },
      async destroy() { control.calls.push(['email.destroy', a.email]); acc.emails = acc.emails.filter((e) => e.id !== a.id); persist(); emit(); },
    });
    const primary = acc.emails.find((e) => e.id === acc.primary);
    return {
      id, firstName: null, lastName: null, fullName: null, username: null, imageUrl: '', hasImage: false,
      primaryEmailAddressId: acc.primary,
      primaryEmailAddress: primary ? address(primary) : null,
      emailAddresses: acc.emails.map(address),
      phoneNumbers: [], externalAccounts: [], organizationMemberships: [], publicMetadata: {}, unsafeMetadata: {},
      async createEmailAddress({ email }) {
        control.calls.push(['email.create', email]);
        if (Object.values(state.accounts).some((x) => x.emails.some((e) => e.email === email))) fail('form_identifier_exists');
        const a = { id: `ea_${++state.seq}`, email, verified: false }; acc.emails.push(a); persist(); emit(); return address(a);
      },
      async update({ primaryEmailAddressId }) { control.calls.push(['user.primary', primaryEmailAddressId]); acc.primary = primaryEmailAddressId; persist(); emit(); },
      async reload() { return userResource(id); },
    };
  }

  function sessionResource() {
    if (!state.active) return null;
    const user = userResource(state.active.userId);
    return {
      id: state.active.id, status: 'active', user, actor: null, currentTask: null, factorVerificationAge: [0, 0], lastActiveToken: { jwt: { claims: { sub: state.active.userId, sid: state.active.id } } },
      async getToken() { return state.active ? `fake.${state.active.userId}.${state.active.id}` : null; },
      checkAuthorization() { return true; },
    };
  }

  let pending = null; // { mode, email }
  const signIn = {
    status: null, createdSessionId: null, supportedFirstFactors: null,
    async create({ identifier }) {
      control.calls.push(['signIn.create', identifier]);
      const id = Object.keys(state.accounts).find((k) => state.accounts[k].emails.some((e) => e.email === identifier));
      if (!id) fail('form_identifier_not_found');
      pending = { mode: 'sign-in', userId: id };
      return { ...signIn, status: 'needs_first_factor', supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: state.accounts[id].primary }] };
    },
    async prepareFirstFactor(p) { control.calls.push(['signIn.prepare', p.strategy]); return signIn; },
    async attemptFirstFactor({ code }) {
      control.calls.push(['signIn.attempt', code]);
      if (control.lock) fail('user_locked', 403);
      if (code !== control.code) fail('form_code_incorrect');
      return { ...signIn, status: 'complete', createdSessionId: startSession(pending.userId) };
    },
    async authenticateWithRedirect(p) { control.calls.push(['signIn.google', p.redirectUrl, p.redirectUrlComplete]); },
  };
  const signUp = {
    status: null, createdSessionId: null,
    async create({ emailAddress }) { control.calls.push(['signUp.create', emailAddress]); pending = { mode: 'sign-up', email: emailAddress }; return signUp; },
    async prepareEmailAddressVerification(p) { control.calls.push(['signUp.prepare', p.strategy]); return signUp; },
    async attemptEmailAddressVerification({ code }) {
      control.calls.push(['signUp.attempt', code]);
      if (code !== control.code) fail('form_code_incorrect');
      const id = `user_${++state.seq}`;
      state.accounts[id] = { emails: [{ id: `ea_${++state.seq}`, email: pending.email, verified: true }], primary: null };
      state.accounts[id].primary = state.accounts[id].emails[0].id;
      return { ...signUp, status: 'complete', createdSessionId: startSession(id) };
    },
  };
  function startSession(userId) { const id = `sess_${++state.seq}`; control.pendingSession = { id, userId }; return id; }

  function resources() {
    const session = sessionResource();
    return { client: { signIn, signUp, sessions: session ? [session] : [], activeSessions: session ? [session] : [], lastActiveSessionId: session?.id ?? null, signedInSessions: session ? [session] : [] }, session, user: session?.user ?? null, organization: null };
  }
  function emit() {
    clerk.__internal_lastEmittedResources = resources();
    Object.assign(clerk, { client: clerk.__internal_lastEmittedResources.client, session: clerk.__internal_lastEmittedResources.session, user: clerk.__internal_lastEmittedResources.user });
    for (const l of listeners) l(clerk.__internal_lastEmittedResources);
  }

  const clerk = {
    loaded: false, status: 'loading', version: 'fake', sdkMetadata: { name: 'fake', version: '0' }, isSatellite: false, instanceType: 'development',
    frontendApi: 'fake.clerk.accounts.dev', publishableKey: cfg.publishableKey || '',
    __internal_lastEmittedResources: null,
    async load() { control.calls.push(['load']); clerk.loaded = true; clerk.status = 'ready'; emit(); for (const l of statusListeners) l('ready'); },
    addListener(cb, opts) { listeners.add(cb); if (!opts?.skipInitialEmit && clerk.loaded) cb(clerk.__internal_lastEmittedResources); return () => listeners.delete(cb); },
    // clerk-js drives @clerk/react's status: `on('status', cb, { notify })` answers the current one at once.
    on(event, cb, opts) { if (event === 'status') { statusListeners.add(cb); if (opts?.notify) cb(clerk.status); } },
    off(event, cb) { statusListeners.delete(cb); },
    async setActive({ session }) {
      control.calls.push(['setActive', session]);
      if (session && control.pendingSession?.id === session) state.active = control.pendingSession; else if (!session) state.active = null;
      persist(); emit();
    },
    async signOut() { control.calls.push(['signOut']); state.active = null; persist(); emit(); },
    async handleRedirectCallback() { control.calls.push(['handleRedirectCallback']); },
    __internal_getOption() { return undefined; },
    telemetry: { record() {} },
  };
  window.Clerk = clerk;
})();
