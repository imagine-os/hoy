import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ClerkProvider, useAuth, useClerk } from '@clerk/react';
import { ROLE_LABEL, type Role } from './roles';
import { roleCan, type Permission } from './permissions';
import { SessionContext, type SessionCtx, type SessionStatus, type SessionUser } from './sessionContext';
import { cosPath, loadAppConfig, type AppConfig } from './appConfig';
import { classifyMe, isSuperAdminMe, roleFromMe, rolesFromMe, type MeInfo } from './companyOsIdentity';
import { setSessionTokenSource, subscribeUnauthorized } from './sessionToken';
import { isViewAsFailure, isViewableRole, loadViewAsSample, publishViewAs, readStoredViewAs, storeViewAs, type ViewAsSample, type ViewAsSampleFailure } from './viewAs';
import { failureCopy } from '../data/companyos/refusals';
import { cosJson } from './cosRequest';
import { clearLocalTraces } from './localTraces';
import { useI18n } from '../i18n/I18nProvider';
import { ViewAsBanner } from '../components/molecule/ViewAsBanner/ViewAsBanner';
import { EmptyState } from '../components/molecule/EmptyState/EmptyState';

/**
 * The production session (H-2, PL-04): Clerk proves who the person is; Company OS `GET /t/:t/me` says whether they
 * belong to the studio and with which role. The browser never decides a role. Nothing is kept in localStorage: on
 * sign-out (or a session ended in another tab, which Clerk syncs) the whole tree remounts, so no screen keeps the
 * previous person's data.
 *
 * View-as (Hoy all-roles, lane D; `src/auth/viewAs.ts`): a super admin (`isSuperAdminMe`) may view the studio as any
 * other signed-in role, read-only. The viewed role is kept in this tab's sessionStorage (`hoyos.viewAs`); for anyone
 * else a stored value is removed and ignored. While viewing as, `role` is the viewed role (no super-admin bypass),
 * `user` stays the real person, `viewAsPerson` is a sample person of that role (by membership, read from Company OS),
 * the provider aliases the session user to them and the transport refuses writes. Switching remounts the tree.
 */
export default function ProductionSession({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadAppConfig().then((c) => { if (alive) setConfig(c); }, () => {
      // Without a configuration there is no Clerk session: callers waiting for a token get none instead of hanging.
      setSessionTokenSource(async () => null);
      if (alive) setFailed(true);
    });
    return () => { alive = false; };
  }, [attempt]);
  const retry = useCallback(() => { setFailed(false); setAttempt((n) => n + 1); }, []);

  if (!config) return <SessionContext.Provider value={visitorSession(failed ? 'error' : 'loading', retry)}>{children}</SessionContext.Provider>;
  return (
    <ClerkProvider publishableKey={config.clerkPublishableKey} prefetchUI={false} afterSignOutUrl={`${window.location.pathname}#/auth/sign-in`}
      routerPush={clerkPush} routerReplace={clerkReplace}>
      <ClerkSession config={config}>{children}</ClerkSession>
    </ClerkProvider>
  );
}

/**
 * Clerk navigates through these (sign-out's `afterSignOutUrl`, its redirects). Without a router, clerk-js announces
 * an unload (`clerk:beforeunload`) and leaves its session in the "transitive" state for the reload it expects; a hash
 * change never reloads, so `isLoaded` stayed false and sign-out ended on "service did not answer" (test environment,
 * 30 Oct). A URL that differs only in its hash stays in this page; any other URL is a normal page load.
 */
const clerkPush = (to: string) => window.location.assign(new URL(to, window.location.href).href);
const clerkReplace = (to: string) => window.location.replace(new URL(to, window.location.href).href);

// The signed-out visitor, as the screens expect it (same id as the review build's visitor; no persona data here).
const VISITOR: SessionUser = { id: 'usr_public', role: 'public', name: 'Visitante', initials: '·', email: '', blurb: { es: 'Sin sesión.', en: 'Not signed in.' } };
const noop = () => {};
const visitorCan = (p: Permission) => roleCan('public', p);
const visitorHas = (roles: Role[]) => roles.includes('public');

function visitorSession(status: SessionStatus, refresh: () => void, signOut: () => Promise<void> = async () => {}, signedIn = false): SessionCtx {
  return {
    status, signedIn, user: VISITOR, role: 'public', roles: [], isSuperAdmin: false, canDevMode: false, devMode: false, viewAs: null, viewAsPerson: null, caps: [],
    switchUser: (id) => { if (signedIn && (id === 'public' || id === VISITOR.id)) void signOut(); },
    setDevMode: noop, setViewAs: noop, signOut, refresh, can: visitorCan, hasRole: visitorHas,
  };
}

type MeState = { key: string; status: 'loading' | 'member' | 'not-member' | 'unverified' | 'error'; me?: MeInfo };

/** How long sign-in and private routes wait for Clerk before they show the error state (a blocked or failed script). */
export const CLERK_LOAD_TIMEOUT_MS = 10_000;
/**
 * A Clerk that had loaded and stays unloaded this long is stuck mid-navigation: a fresh page load recovers it. Longer
 * than a slow sign-out request (Clerk is unloaded while it removes the session), and at most one reload a minute, so a
 * Clerk that keeps stalling ends on the error screen instead of reloading forever.
 */
const CLERK_STUCK_RELOAD_MS = 15_000;
const STUCK_RELOAD_KEY = 'clerk-stuck-reload-at';
function reloadOnceIfStuck(): boolean {
  try {
    const last = Number(sessionStorage.getItem(STUCK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(STUCK_RELOAD_KEY, String(Date.now()));
  } catch { return false; }
  // A reload mid sign-out skips the sign-out's own clean-up. Not a sign-out itself: the C-01d deferral stays (review r2).
  clearLocalTraces({ keepConsentDeferral: true });
  window.location.reload();
  return true;
}
/** Clerk can't be started again in place once its script failed: retrying is a fresh page load. */
const reloadPage = () => window.location.reload();

function ClerkSession({ config, children }: { config: AppConfig; children: ReactNode }) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, userId, sessionId } = useAuth();
  const [nonce, setNonce] = useState(0);
  const [me, setMe] = useState<MeState | null>(null);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  // View-as: the role this tab keeps (checked against /me below) and the sample person found for it.
  const [viewAs, setViewAsState] = useState<Role | null>(readStoredViewAs);
  const [sample, setSample] = useState<{ key: string; person: ViewAsSample | ViewAsSampleFailure | null } | null>(null);
  // A failed sample read offers Retry (review round 2, L2): a new attempt reads again.
  const [sampleAttempt, setSampleAttempt] = useState(0);

  // Clerk that never loads (`status: 'error'`, or still loading after the timeout) is an error, not an endless spinner.
  // `'degraded'` counts as loaded (Clerk sets `isLoaded` for it). A Clerk that loads late still recovers on its own.
  const clerkStatus = (clerk as { status?: string }).status;
  // A Clerk that had loaded and then stays unloaded is not a failed script: reload (at most once a minute) first.
  const [timedOut, setTimedOut] = useState(false);
  const everLoaded = useRef(false);
  useEffect(() => {
    if (isLoaded) { everLoaded.current = true; setTimedOut(false); return; }
    const stuck = everLoaded.current;
    const timer = setTimeout(() => { if (!stuck || !reloadOnceIfStuck()) setTimedOut(true); }, stuck ? CLERK_STUCK_RELOAD_MS : CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  const clerkFailed = !isLoaded && (clerkStatus === 'error' || timedOut);

  // Company OS calls (here and in H-3's provider) ask this for a fresh token per request. Once Clerk has failed they
  // are answered as signed out at once, instead of each waiting for a Clerk that won't come.
  useEffect(() => {
    if (clerkFailed) { setSessionTokenSource(async () => null); return () => setSessionTokenSource(null); }
    if (!isLoaded) return;
    setSessionTokenSource(async (options) => (clerk.session ? (await clerk.session.getToken({ skipCache: !!options?.refresh })) ?? null : null));
    return () => setSessionTokenSource(null);
  }, [clerk, isLoaded, clerkFailed]);

  // CU-04: a session that ends without our sign-out (expiry, or sign-out in another tab) leaves no traces either.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (wasSignedIn.current && !isSignedIn) clearLocalTraces();
    wasSignedIn.current = !!isSignedIn;
  }, [isLoaded, isSignedIn]);
  useEffect(() => subscribeUnauthorized(refresh), [refresh]);

  const key = isSignedIn ? `${userId}|${sessionId}|${nonce}` : '';
  // Whoever /me says is signed in (null while loading, signed out or not a member), and whether they are a super admin.
  const memberInfo = me && me.key === key && me.status === 'member' && me.me ? me.me : null;
  const realSuperAdmin = Boolean(memberInfo && isSuperAdminMe(memberInfo));
  const activeViewAs = realSuperAdmin && isViewableRole(viewAs) ? viewAs : null;
  const sampleKey = activeViewAs && memberInfo ? `${key}|${memberInfo.userId}|${activeViewAs}` : '';

  // Signed out (however: our sign-out, another tab, an expired session), another person signed in, or someone who may
  // not view as (a planted value): forget it, in state and in this tab, so nothing stays read-only or comes back.
  const viewAsOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { viewAsOwner.current = null; storeViewAs(null); if (viewAs) setViewAsState(null); return; }
    if (!memberInfo) return;
    if (viewAsOwner.current !== null && viewAsOwner.current !== memberInfo.userId) { storeViewAs(null); setViewAsState(null); }
    viewAsOwner.current = memberInfo.userId;
    if (!realSuperAdmin && (viewAs || readStoredViewAs())) { storeViewAs(null); setViewAsState(null); }
  }, [isLoaded, isSignedIn, memberInfo, realSuperAdmin, viewAs]);

  // The sample person for the viewed role: reads only (GET /admin/users, POST /query), with the super admin's token.
  useEffect(() => {
    if (!sampleKey || !activeViewAs || !memberInfo) return;
    let alive = true;
    const read = async (method: 'GET' | 'POST', path: string, body?: unknown) => {
      const res = await cosJson(path as `/${string}`, { method, body });
      if (res.status !== 200) {
        // The refusal's own code when it is a plain key, else what the status means (the copy comes from the code table).
        const code = (res.body as { error?: unknown } | null)?.error;
        throw Object.assign(new Error(`view_as_sample_${res.status}`), { code: typeof code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : res.status === 401 || res.status === 403 ? 'forbidden' : 'view_as_unavailable' });
      }
      return res.body;
    };
    loadViewAsSample(activeViewAs, read, memberInfo.userId).then((person) => { if (alive) setSample({ key: sampleKey, person }); });
    return () => { alive = false; };
  }, [sampleKey, activeViewAs, memberInfo, sampleAttempt]);
  const sampleAnswer = sample && sample.key === sampleKey ? sample.person : null;
  const sampleFailure = isViewAsFailure(sampleAnswer) ? sampleAnswer : null;
  const samplePerson = isViewAsFailure(sampleAnswer) ? null : sampleAnswer;
  const retrySample = useCallback(() => { setSample(null); setSampleAttempt((n) => n + 1); }, []);
  const sampleLoading = Boolean(sampleKey) && sample?.key !== sampleKey;

  // The transport and the provider read this (read-only, and the alias). A layout effect runs before any screen's
  // effects can send a request; until then the transport refuses writes while this tab keeps a view-as value.
  const samplePersonId = samplePerson?.personId ?? null;
  useLayoutEffect(() => { publishViewAs(activeViewAs ? { personId: samplePersonId } : null); }, [activeViewAs, samplePersonId]);

  const setViewAs = useCallback((role: Role | null) => {
    if (!realSuperAdmin) return;
    if (role !== null && !isViewableRole(role)) return;
    storeViewAs(role);
    setViewAsState(role);
  }, [realSuperAdmin]);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let alive = true;
    setMe({ key, status: 'loading' });
    (async () => {
      try {
        const token = await clerk.session?.getToken();
        if (!token) throw new Error('no_token');
        const res = await fetch(cosPath(config, '/me'), { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store', credentials: 'omit' });
        const body: unknown = await res.json().catch(() => null);
        const result = classifyMe(res.status, body);
        if (!alive) return;
        if (result.kind === 'member') setMe({ key, status: 'member', me: result.me });
        else if (result.kind === 'not-member') setMe({ key, status: 'not-member' });
        else if (result.kind === 'unverified') setMe({ key, status: 'unverified' });
        else setMe({ key, status: 'error' });
      } catch {
        if (alive) setMe({ key, status: 'error' });
      }
    })();
    return () => { alive = false; };
  }, [clerk, config, isLoaded, isSignedIn, key]);

  const signingOut = useRef(false);
  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    storeViewAs(null);
    setViewAsState(null);
    try { await clerk.signOut(); } finally { clearLocalTraces(); signingOut.current = false; }
  }, [clerk]);

  const value = useMemo<SessionCtx>(() => {
    if (!isLoaded) return clerkFailed ? visitorSession('error', reloadPage) : visitorSession('loading', refresh);
    if (!isSignedIn) return visitorSession('ready', refresh);
    const current = me && me.key === key ? me : null;
    if (!current || current.status === 'loading') return visitorSession('loading', refresh, signOut, true);
    if (current.status !== 'member' || !current.me) {
      const status: SessionStatus = current.status === 'not-member' ? 'needs-signup' : current.status === 'unverified' ? 'unverified' : 'error';
      return visitorSession(status, refresh, signOut, true);
    }
    const info = current.me;
    const realRole = roleFromMe(info);
    if (!realRole) return visitorSession('no-role', refresh, signOut, true);
    const name = info.name || info.email;
    const user: SessionUser = { id: info.userId, role: realRole, name, initials: initialsOf(name), email: info.email, blurb: { es: '', en: '' } };
    // Super admin is its own role (Hoy all-roles); like the review build's, it passes every route's role list, except
    // while viewing as (lane D): then the viewed role decides, as for a real holder of that role.
    const role: Role = activeViewAs ?? realRole;
    const isSuperAdmin = isSuperAdminMe(info) && !activeViewAs;
    const viewAsPerson: SessionUser | null = activeViewAs && samplePerson
      ? { id: samplePerson.userId, role: activeViewAs, name: samplePerson.name, initials: initialsOf(samplePerson.name || samplePerson.email), email: samplePerson.email, blurb: { es: '', en: '' } }
      : null;
    return {
      // While the sample person is being looked up, private screens wait (they would read the wrong person's records).
      status: sampleLoading ? 'loading' : 'ready', signedIn: true, user, role, isSuperAdmin, canDevMode: false, devMode: false,
      // Every role the login holds (lane Y2); while viewing as, only the viewed one (no customer area of the real person).
      roles: activeViewAs ? [activeViewAs] : rolesFromMe(info),
      viewAs: activeViewAs, viewAsPerson,
      // Capabilities are the real person's; while viewing as, the viewed role's are not known here: none.
      caps: activeViewAs ? [] : info.caps,
      switchUser: (id) => { if (id === 'public' || id === VISITOR.id) void signOut(); },
      setDevMode: noop, setViewAs, signOut, refresh,
      can: (p) => roleCan(role, p),
      hasRole: (roles) => roles.includes('public') || roles.includes(role) || isSuperAdmin,
    };
  }, [isLoaded, clerkFailed, isSignedIn, me, key, refresh, signOut, activeViewAs, samplePerson, sampleLoading, setViewAs]);

  // A different person (or none), or another viewed role, remounts everything below: no screen state survives a
  // sign-out, a switch, or entering or leaving view-as.
  const exitViewAs = useCallback(() => { setViewAs(null); window.location.hash = '#/hub'; }, [setViewAs]);
  return (
    <SessionContext.Provider key={isSignedIn ? `${userId}|${sessionId}|${activeViewAs ?? ''}` : 'visitor'} value={value}>
      {activeViewAs && <ViewAsBar role={activeViewAs} person={value.viewAsPerson?.name ?? null} loading={sampleLoading} onExit={exitViewAs} />}
      {/* L2 (review round 1): nobody holds the viewed role, so there is no one to show; the screens would read nobody's
          (or, before the provider alias, the super admin's own) records. Say so instead of showing them. */}
      {/* Review round 2, L2: a failed read is said as a failure with Retry, never as "nobody holds this role". */}
      {activeViewAs && !sampleLoading && sampleFailure ? <ViewAsFailed failure={sampleFailure} onRetry={retrySample} onExit={exitViewAs} />
        : activeViewAs && !sampleLoading && !samplePerson ? <ViewAsNobody role={activeViewAs} onExit={exitViewAs} /> : children}
    </SessionContext.Provider>
  );
}

/** View-as of a role nobody holds: an explicit empty state with the way out, never another person's screens. */
function ViewAsNobody({ role, onExit }: { role: Role; onExit: () => void }) {
  const { t, bi } = useI18n();
  return (
    <main className="page" data-view-as-empty>
      <EmptyState icon="users" title={t('hub.viewAs.empty.title', { role: bi(ROLE_LABEL[role]) })} body={t('hub.viewAs.empty.body')}
        action={<button type="button" className="btn btn-secondary btn-sm" onClick={onExit}>{t('hub.viewAs.empty.exit')}</button>} />
    </main>
  );
}

/** View-as whose sample person could not be read: the reason in words, Retry, and the way out. */
function ViewAsFailed({ failure, onRetry, onExit }: { failure: ViewAsSampleFailure; onRetry: () => void; onExit: () => void }) {
  const { t, lang } = useI18n();
  return (
    <main className="page" data-view-as-failed>
      <EmptyState tone="error" title={t('hub.viewAs.failed.title')} body={failureCopy({ code: failure.error }, lang, t('hub.viewAs.failed.body'))}
        action={<div className="row wrap">
          <button type="button" className="btn btn-primary btn-sm" data-view-as-retry onClick={onRetry}>{t('hub.viewAs.failed.retry')}</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onExit}>{t('hub.viewAs.empty.exit')}</button>
        </div>} />
    </main>
  );
}

/** The view-as banner, in the current language (the label, then the sample person once found). */
function ViewAsBar({ role, person, loading, onExit }: { role: Role; person: string | null; loading: boolean; onExit: () => void }) {
  const { bi } = useI18n();
  return <ViewAsBanner role={bi(ROLE_LABEL[role])} person={loading ? '…' : person} onExit={onExit} />;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '·';
}
