import { DEFERRED_KEY, clearConsentOnSignOut } from './signupStatus';

/** CU-04: what stays in this browser after a sign-out: the language and the theme. */
const KEEP = new Set(['hoyos.lang', 'hoyos.theme']);

const browserStores = (): Storage[] => {
  const out: Storage[] = [];
  for (const name of ['sessionStorage', 'localStorage'] as const) {
    try { const st = (globalThis as Record<string, unknown>)[name] as Storage | undefined; if (st) out.push(st); } catch { /* blocked */ }
  }
  return out;
};

/**
 * CU-04 / IN-145: nothing of the previous person stays in this browser (pending pass, filters, drafts, the C-01d consent
 * deferral and reads); language and theme stay. `keepConsentDeferral`: the Clerk stuck-reload (`reloadOnceIfStuck`) is
 * not a sign-out, so the person's "Continue for now" survives it; every sign-out path clears it. `stores` is for tests.
 */
export function clearLocalTraces({ keepConsentDeferral = false, stores }: { keepConsentDeferral?: boolean; stores?: Storage[] } = {}): void {
  if (!keepConsentDeferral) { try { clearConsentOnSignOut(); } catch { /* storage blocked: memory is cleared first */ } }
  for (const store of stores ?? browserStores()) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k) keys.push(k); }
      for (const key of keys) if (key.startsWith('hoyos.') && !KEEP.has(key) && !(keepConsentDeferral && key === DEFERRED_KEY)) store.removeItem(key);
    } catch { /* storage blocked: nothing to clear */ }
  }
}
