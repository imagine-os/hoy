/**
 * The seam between the production session (Clerk) and anything that calls Company OS (H-3's CompanyOSProvider).
 * Callers never touch Clerk: they ask for a fresh session token per request and report a `401` back. The review
 * build never registers a source, so `getSessionToken()` answers null there.
 */
type TokenSource = () => Promise<string | null>;

let source: TokenSource | null = null;
let waiters: ((s: TokenSource) => void)[] = [];
const unauthorizedListeners = new Set<() => void>();

/** Called by the production session once Clerk has loaded; `null` on unmount. */
export function setSessionTokenSource(next: TokenSource | null) {
  source = next;
  if (next) { const ready = waiters; waiters = []; for (const w of ready) w(next); }
}

/** A fresh Clerk session token, or null when nobody is signed in. Waits for Clerk to load (production only). */
export async function getSessionToken(): Promise<string | null> {
  if (!import.meta.env || import.meta.env.VITE_HOY_BUILD !== 'production') return source ? source() : null;
  const s = source ?? await new Promise<TokenSource>((resolve) => waiters.push(resolve));
  return s();
}

/** The server answered `401 unauthorized`: the session re-checks Clerk and `/me`. */
export function onUnauthorized() { for (const l of unauthorizedListeners) l(); }

export function subscribeUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}
