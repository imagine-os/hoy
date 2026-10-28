// The server's settings, all from environment variables (Railway sets them; see server/README.md).
// No address, domain or organisation is written here: everything that differs per environment is a variable.
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} ServerConfig
 * @property {number} port
 * @property {string} distDir
 * @property {string} companyOsUrl       Company OS on the private network, e.g. http://<api private domain>:4000
 * @property {string} tenant             the Company OS tenant slug this frontend serves
 * @property {string} environment        Railway's environment name (`test`, `production`) or `local`
 * @property {string|undefined} clerkSecretKey
 * @property {string|undefined} clerkJwtKey
 * @property {string|undefined} clerkPublishableKey
 * @property {string[]} authorizedParties origins a session token may have been issued to (its `azp`)
 * @property {number} proxyBodyLimit
 * @property {number} webhookBodyLimit
 * @property {number} upstreamTimeoutMs
 */

/** @returns {ServerConfig} Throws with every problem listed, so a bad deploy fails at start, not on first use. */
export function loadConfig(env = process.env) {
  const problems = [];
  const environment = env.RAILWAY_ENVIRONMENT_NAME || env.HOY_ENV || 'local';
  const production = environment === 'production';

  const companyOsUrl = env.COMPANY_OS_URL ?? '';
  try {
    const u = new URL(companyOsUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') problems.push('COMPANY_OS_URL must be http(s)');
    if (u.search || u.hash || u.username || u.password) problems.push('COMPANY_OS_URL must be a plain origin (optionally with a path)');
  } catch {
    problems.push('COMPANY_OS_URL is missing or not a URL');
  }

  const tenant = env.COMPANY_OS_TENANT ?? '';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(tenant)) problems.push('COMPANY_OS_TENANT must be a tenant slug (a-z, 0-9, -)');

  const clerkSecretKey = env.CLERK_SECRET_KEY || undefined;
  const clerkJwtKey = env.CLERK_JWT_KEY || undefined;
  if (!clerkSecretKey && !clerkJwtKey) problems.push('CLERK_SECRET_KEY (or CLERK_JWT_KEY) is required to check sessions');
  if (clerkSecretKey && !/^sk_(test|live)_/.test(clerkSecretKey)) problems.push('CLERK_SECRET_KEY must be a Clerk secret key (sk_…)');

  // Served to the browser: refuse anything that is not a publishable key, so a secret can't leak through it.
  const clerkPublishableKey = env.CLERK_PUBLISHABLE_KEY || undefined;
  if (clerkPublishableKey && !/^pk_(test|live)_[A-Za-z0-9$=+/_-]+$/.test(clerkPublishableKey)) {
    problems.push('CLERK_PUBLISHABLE_KEY must be a Clerk publishable key (pk_…)');
  }

  const authorizedParties = [];
  for (const raw of [env.APP_URL, ...(env.CLERK_AUTHORIZED_PARTIES ?? '').split(',')]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const origin = new URL(value).origin;
      if (origin === 'null') throw new Error('opaque');
      if (!authorizedParties.includes(origin)) authorizedParties.push(origin);
    } catch {
      problems.push(`not an origin: ${JSON.stringify(value)} (APP_URL / CLERK_AUTHORIZED_PARTIES)`);
    }
  }
  if (production && authorizedParties.length === 0) problems.push('production needs APP_URL (or CLERK_AUTHORIZED_PARTIES): the origins sessions may come from');

  const config = {
    port: int(env.PORT, 3000),
    distDir: env.DIST_DIR || fileURLToPath(new URL('../dist', import.meta.url)),
    companyOsUrl,
    tenant,
    environment,
    clerkSecretKey,
    clerkJwtKey,
    clerkPublishableKey,
    authorizedParties,
    proxyBodyLimit: int(env.PROXY_BODY_LIMIT_BYTES, 10 * 1024 * 1024),
    webhookBodyLimit: int(env.WEBHOOK_BODY_LIMIT_BYTES, 1024 * 1024),
    upstreamTimeoutMs: int(env.UPSTREAM_TIMEOUT_MS, 30_000),
  };
  if (problems.length) throw new Error(`Hoy server configuration:\n  - ${problems.join('\n  - ')}`);
  return config;
}

function int(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
