import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ClerkProvider, useAuth, useClerk } from '@clerk/react';
import type { Role } from './roles';
import { roleCan, type Permission } from './permissions';
import { SessionContext, type SessionCtx, type SessionStatus, type SessionUser } from './sessionContext';
import { cosPath, loadAppConfig, type AppConfig } from './appConfig';
import { classifyMe, roleFromMe, type MeInfo } from './companyOsIdentity';
import { setSessionTokenSource, subscribeUnauthorized } from './sessionToken';

/**
 * The production session (H-2, PL-04): Clerk proves who the person is; Company OS `GET /t/:t/me` says whether they
 * belong to the studio and with which role. The browser never decides a role. Nothing is kept in localStorage: on
 * sign-out (or a session ended in another tab, which Clerk syncs) the whole tree remounts, so no screen keeps the
 * previous person's data.
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
    <ClerkProvider publishableKey={config.clerkPublishableKey} prefetchUI={false} afterSignOutUrl={`${window.location.pathname}#/auth/sign-in`}>
      <ClerkSession config={config}>{children}</ClerkSession>
    </ClerkProvider>
  );
}

// The signed-out visitor, as the screens expect it (same id as the review build's visitor; no persona data here).
const VISITOR: SessionUser = { id: 'usr_public', role: 'public', name: 'Visitante', initials: '·', email: '', blurb: { es: 'Sin sesión.', en: 'Not signed in.' } };
const noop = () => {};
const visitorCan = (p: Permission) => roleCan('public', p);
const visitorHas = (roles: Role[]) => roles.includes('public');

function visitorSession(status: SessionStatus, refresh: () => void, signOut: () => Promise<void> = async () => {}, signedIn = false): SessionCtx {
  return {
    status, signedIn, user: VISITOR, role: 'public', isSuperAdmin: false, canDevMode: false, devMode: false, viewAs: null, caps: [],
    switchUser: (id) => { if (signedIn && (id === 'public' || id === VISITOR.id)) void signOut(); },
    setDevMode: noop, setViewAs: noop, signOut, refresh, can: visitorCan, hasRole: visitorHas,
  };
}

type MeState = { key: string; status: 'loading' | 'member' | 'not-member' | 'unverified' | 'error'; me?: MeInfo };

function ClerkSession({ config, children }: { config: AppConfig; children: ReactNode }) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, userId, sessionId } = useAuth();
  const [nonce, setNonce] = useState(0);
  const [me, setMe] = useState<MeState | null>(null);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Company OS calls (here and in H-3's provider) ask this for a fresh token per request.
  useEffect(() => {
    if (!isLoaded) return;
    setSessionTokenSource(async () => (clerk.session ? (await clerk.session.getToken()) ?? null : null));
    return () => setSessionTokenSource(null);
  }, [clerk, isLoaded]);
  useEffect(() => subscribeUnauthorized(refresh), [refresh]);

  const key = isSignedIn ? `${userId}|${sessionId}|${nonce}` : '';
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
    try { await clerk.signOut(); } finally { clearLocalTraces(); signingOut.current = false; }
  }, [clerk]);

  const value = useMemo<SessionCtx>(() => {
    if (!isLoaded) return visitorSession('loading', refresh);
    if (!isSignedIn) return visitorSession('ready', refresh);
    const current = me && me.key === key ? me : null;
    if (!current || current.status === 'loading') return visitorSession('loading', refresh, signOut, true);
    if (current.status !== 'member' || !current.me) {
      const status: SessionStatus = current.status === 'not-member' ? 'needs-signup' : current.status === 'unverified' ? 'unverified' : 'error';
      return visitorSession(status, refresh, signOut, true);
    }
    const info = current.me;
    const role = roleFromMe(info);
    if (!role) return visitorSession('no-role', refresh, signOut, true);
    const name = info.name || info.email;
    const user: SessionUser = { id: info.userId, role, name, initials: initialsOf(name), email: info.email, blurb: { es: '', en: '' } };
    return {
      status: 'ready', signedIn: true, user, role, isSuperAdmin: false, canDevMode: false, devMode: false, viewAs: null, caps: info.caps,
      switchUser: (id) => { if (id === 'public' || id === VISITOR.id) void signOut(); },
      setDevMode: noop, setViewAs: noop, signOut, refresh,
      can: (p) => roleCan(role, p),
      hasRole: (roles) => roles.includes('public') || roles.includes(role),
    };
  }, [isLoaded, isSignedIn, me, key, refresh, signOut]);

  // A different person (or none) remounts everything below: no screen state survives a sign-out or a switch.
  return <SessionContext.Provider key={isSignedIn ? `${userId}|${sessionId}` : 'visitor'} value={value}>{children}</SessionContext.Provider>;
}

/** CU-04: nothing of the previous person stays in this browser (pending pass, filters, drafts); language and theme stay. */
const KEEP = new Set(['hoyos.lang', 'hoyos.theme']);
function clearLocalTraces() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      for (const key of Object.keys(store)) if (key.startsWith('hoyos.') && !KEEP.has(key)) store.removeItem(key);
    } catch { /* storage blocked: nothing to clear */ }
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '·';
}
