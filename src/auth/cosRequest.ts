import { cosPath, loadAppConfig } from './appConfig';
import { getSessionToken, onUnauthorized } from './sessionToken';

/**
 * One Company OS call with the current Clerk session, for the auth screens (sign-up). Answers the status and the parsed
 * JSON body instead of throwing on 4xx, so the caller maps refusal codes to copy. A `401` tells the session to re-check.
 */
export async function cosJson(path: `/${string}`, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<{ status: number; body: unknown }> {
  const config = await loadAppConfig();
  const token = await getSessionToken();
  if (!token) return { status: 401, body: { error: 'unauthorized' } };
  const res = await fetch(cosPath(config, path), {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    credentials: 'omit',
  });
  const body: unknown = await res.json().catch(() => null);
  if (res.status === 401) onUnauthorized();
  return { status: res.status, body };
}
