/**
 * The browser's public settings in the production build (H-2): the Hoy server answers `GET /app-config.json` with the
 * tenant, the API base and the Clerk publishable key of its environment, so one build serves test and production.
 * Read once and cached; a malformed answer is refused rather than half-used (a wrong key or base would send tokens
 * somewhere else).
 */
export interface AppConfig {
  tenant: string;
  /** Same-origin path the Hoy server proxies to Company OS, e.g. `/api/cos`. */
  apiBase: string;
  clerkPublishableKey: string;
  environment: string;
}

export function parseAppConfig(raw: unknown): AppConfig {
  if (!raw || typeof raw !== 'object') throw new Error('app_config_invalid');
  const v = raw as Record<string, unknown>;
  const tenant = typeof v.tenant === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/.test(v.tenant) ? v.tenant : null;
  // A path on this origin only: an absolute or protocol-relative base would carry the session token off-site.
  const apiBase = typeof v.apiBase === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(v.apiBase) && !v.apiBase.startsWith('//') ? v.apiBase.replace(/\/+$/, '') : null;
  const key = typeof v.clerkPublishableKey === 'string' && /^pk_(test|live)_[A-Za-z0-9$=+/_-]+$/.test(v.clerkPublishableKey) ? v.clerkPublishableKey : null;
  const environment = typeof v.environment === 'string' && v.environment.length <= 40 ? v.environment : 'unknown';
  if (!tenant || !apiBase || !key) throw new Error('app_config_invalid');
  return { tenant, apiBase, clerkPublishableKey: key, environment };
}

let pending: Promise<AppConfig> | null = null;

/** Cached; a failed read is forgotten so a retry fetches again. */
export function loadAppConfig(fetchImpl: typeof fetch = fetch): Promise<AppConfig> {
  if (!pending) {
    pending = fetchImpl(new URL('app-config.json', document.baseURI).href, { cache: 'no-store', credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error('app_config_unavailable');
        return parseAppConfig(await res.json());
      });
    pending.catch(() => { pending = null; });
  }
  return pending;
}

/** `/api/cos/t/<tenant><path>`: every Company OS call goes through the Hoy server. */
export const cosPath = (config: AppConfig, path: `/${string}`): string => `${config.apiBase}/t/${config.tenant}${path}`;
