import { cosPath, loadAppConfig } from './appConfig';
import { getSessionToken, onUnauthorized } from './sessionToken';
import { reloadIfTestGate } from './testGateReload';
import { VIEW_AS_REFUSAL, viewAsActive, viewAsAllows } from './viewAs';

/**
 * One Company OS call with the current Clerk session, for the auth screens (sign-up). Answers the status and the parsed
 * JSON body instead of throwing on 4xx, so the caller maps refusal codes to copy. A `401` tells the session to re-check.
 * While a super admin views as another role, only reads go out: a write answers `403 view_as_read_only`, unsent.
 */
export async function cosJson(path: `/${string}`, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<{ status: number; body: unknown }> {
  if (viewAsActive() && !viewAsAllows(init.method ?? 'GET', path)) return { status: 403, body: { error: VIEW_AS_REFUSAL } };
  const config = await loadAppConfig();
  const token = await getSessionToken();
  if (!token) return { status: 401, body: { error: 'unauthorized' } };
  const res = await fetch(cosPath(config, path), {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    credentials: 'same-origin', // carries the test site's gate cookie (server/testGate.mjs); the proxy forwards no cookie
  });
  const body: unknown = await res.json().catch(() => null);
  // The test gate's own 401 says nothing about the session. A read reloads onto the passphrase page; a write keeps the form.
  const read = (init.method ?? 'GET') === 'GET' || path === '/query';
  if (res.status === 401 && !reloadIfTestGate(res.status, body, { read })) onUnauthorized();
  return { status: res.status, body };
}
