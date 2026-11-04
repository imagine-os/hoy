/**
 * The test site's passphrase gate (server/testGate.mjs, Company OS playbook rule D5) answers `401 { error: 'test_gate' }`
 * when its cookie has ended (30 days, or a new passphrase). That is not a dead Clerk session: signing out would solve
 * nothing. Production never gets this answer.
 *
 * A read reloads the page, so the server shows the passphrase page. A write does not: a reload would lose what the person
 * typed, so the caller keeps the form and shows the `test_gate` copy, which says to reload.
 *
 * Inside a same-origin frame (the Hub's DeviceFrame) the top page reloads: the gate page says `frame-ancestors 'none'`, so
 * a frame must never land on it. A cross-origin parent throws on reading its location: then the frame reloads itself.
 *
 * The guard: the server shows that page to any request without the cookie, so a reload normally ends here. If the page
 * still came back with the app (a cookie the API paths don't get), it must not reload for ever: once a minute per tab,
 * and never without storage to remember it in.
 */
const RELOADED_AT = 'hoyos.testGateReloadedAt';
const GUARD_MS = 60_000;

export function isTestGate(status: number, body: unknown): boolean {
  return status === 401 && (body as { error?: unknown } | null)?.error === 'test_gate';
}

function reloadTarget(): Location {
  try {
    const top = globalThis.top as Window;
    void top.location.href; // throws when the top page is on another origin
    return top.location;
  } catch {
    return globalThis.location;
  }
}

/**
 * `false`: not the gate's answer, so the caller goes on as usual. Otherwise it was, and the caller must not treat it as a
 * dead session: `'reloading'`, the page is going away; `'copy'`, it stays (a write, the guard, no storage), so show the
 * `test_gate` copy.
 */
export function reloadIfTestGate(status: number, body: unknown, { read = true }: { read?: boolean } = {}): false | 'reloading' | 'copy' {
  if (!isTestGate(status, body)) return false;
  if (!read) return 'copy';
  try {
    const storage = globalThis.sessionStorage;
    const last = Number(storage.getItem(RELOADED_AT) ?? 0);
    if (Date.now() - last < GUARD_MS) return 'copy';
    storage.setItem(RELOADED_AT, String(Date.now()));
    reloadTarget().reload();
    return 'reloading';
  } catch {
    return 'copy'; // no storage to guard with: no reload
  }
}
