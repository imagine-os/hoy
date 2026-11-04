/**
 * The test site's passphrase gate (server/testGate.mjs, Company OS playbook rule D5) answers `401 { error: 'test_gate' }`
 * when its cookie has ended (30 days, or a new passphrase). That is not a dead Clerk session: signing out would solve
 * nothing. A reload makes the server show the passphrase page. Production never gets this answer.
 *
 * The guard: the server shows that page to any request without the cookie, so a reload normally ends here. If the page
 * still came back with the app (a cookie the API paths don't get), it must not reload for ever: once a minute per tab,
 * and never without storage to remember it in.
 */
const RELOADED_AT = 'hoyos.testGateReloadedAt';
const GUARD_MS = 60_000;

/** True when this answer was the gate's (the caller must not treat it as a dead session). */
export function reloadIfTestGate(status: number, body: unknown): boolean {
  if (status !== 401 || (body as { error?: unknown } | null)?.error !== 'test_gate') return false;
  try {
    const storage = globalThis.sessionStorage;
    const last = Number(storage.getItem(RELOADED_AT) ?? 0);
    if (Date.now() - last >= GUARD_MS) {
      storage.setItem(RELOADED_AT, String(Date.now()));
      globalThis.location.reload();
    }
  } catch { /* no storage to guard with: no reload */ }
  return true;
}
