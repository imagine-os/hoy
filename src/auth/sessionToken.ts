import { PRODUCTION_BUILD } from '../config/launch';
/**
 * The seam between the production session (Clerk) and anything that calls Company OS (H-3's CompanyOSProvider).
 * Callers never touch Clerk: they ask for a fresh session token per request and report a `401` back. The review
 * build never registers a source, so `getSessionToken()` answers null there.
 */
type TokenSource = (options?: { refresh?: boolean }) => Promise<string | null>;

let source: TokenSource | null = null;
let waiters: ((s: TokenSource) => void)[] = [];
/** How long a caller waits for Clerk to load before it is answered as signed out (a blocked Clerk script never loads). */
export const TOKEN_WAIT_MS = 5000;
const unauthorizedListeners = new Set<() => void>();

/** Called by the production session once Clerk has loaded; `null` on unmount. */
export function setSessionTokenSource(next: TokenSource | null) {
  source = next;
  if (next) { const ready = waiters; waiters = []; for (const w of ready) w(next); }
}

/**
 * A fresh Clerk session token, or null when nobody is signed in. Waits for Clerk to load (production only), at most
 * `TOKEN_WAIT_MS`: then it answers null, so signed-out reads (the website catalogue) never hang. A later call waits again.
 */
export async function getSessionToken(options?: { refresh?: boolean }): Promise<string | null> {
  if (!PRODUCTION_BUILD) return source ? source(options) : null;
  const s = source ?? await new Promise<TokenSource | null>((resolve) => {
    const waiter = (next: TokenSource) => { clearTimeout(timer); resolve(next); };
    const timer = setTimeout(() => { waiters = waiters.filter((w) => w !== waiter); resolve(null); }, TOKEN_WAIT_MS);
    waiters.push(waiter);
  });
  return s ? s(options) : null;
}

/** The server answered `401 unauthorized`: the session re-checks Clerk and `/me`. */
export function onUnauthorized() { for (const l of unauthorizedListeners) l(); }

export function subscribeUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}
