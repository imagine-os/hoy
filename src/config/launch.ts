import { useSyncExternalStore } from 'react';

/**
 * Launch settings and flags (H-8). One small module so the production build can fill them from Company OS at boot
 * (`configureLaunch(...)`, lane H-3) without touching the screens that read them. The review build keeps these defaults;
 * a QA fixture may set `localStorage['hoyos.launch']` (review build only).
 *
 * - `siteLive` / `siteLiveAt` (SW-08): Coming Soon stays at `/` until the go-live setting flips. `siteLive: true`, or
 *   `siteLiveAt` reached (studio time, ISO with offset), sends `/` to the public website. `/coming-soon` always stays.
 * - `publicDocuments` (SW-06, Q-14): manual and docs paths a visitor may open without signing in. Empty until the owner
 *   decides which are public; every other `/manual` and `/docs` page requires sign-in.
 * - `reviewTools`: the testing hub link, the version-history link and the concept-imagery note on the public site.
 *   Off in the production build (`VITE_HOY_BUILD=production`).
 */
export interface LaunchConfig {
  siteLive: boolean;
  siteLiveAt: string | null;
  publicDocuments: string[];
  reviewTools: boolean;
}

// Vite replaces `__HOY_BUILD__` with a string literal, so this folds to `true`/`false` at build time and the bundler
// drops the other build's code (Clerk out of the review build, demo data out of production). `import.meta.env?.…`
// did not fold, and Clerk shipped in the review build. `typeof` keeps scripts that bundle the app without Vite working
// (they get the review build) unless they define `import.meta.env.VITE_HOY_BUILD`.
export const PRODUCTION_BUILD = typeof __HOY_BUILD__ === 'string'
  ? __HOY_BUILD__ === 'production'
  : (typeof import.meta.env === 'object' && import.meta.env.VITE_HOY_BUILD === 'production');

export const LAUNCH_DEFAULTS: LaunchConfig = { siteLive: false, siteLiveAt: null, publicDocuments: [], reviewTools: !PRODUCTION_BUILD };

const STORAGE_KEY = 'hoyos.launch';
const listeners = new Set<() => void>();

function fromStorage(): Partial<LaunchConfig> {
  if (PRODUCTION_BUILD) return {};
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch { return {}; }
}

/** Keeps only well-typed fields, so a malformed setting falls back to the default instead of breaking the root page. */
export function sanitize(input: unknown): Partial<LaunchConfig> {
  if (!input || typeof input !== 'object') return {};
  const v = input as Record<string, unknown>, out: Partial<LaunchConfig> = {};
  if (typeof v.siteLive === 'boolean') out.siteLive = v.siteLive;
  // A go-live instant must carry its offset (2026-10-30T00:00:00-05:00): a bare date would be read as UTC or device time.
  if (v.siteLiveAt === null || (typeof v.siteLiveAt === 'string' && /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v.siteLiveAt) && Number.isFinite(Date.parse(v.siteLiveAt)))) out.siteLiveAt = v.siteLiveAt as string | null;
  if (Array.isArray(v.publicDocuments)) out.publicDocuments = v.publicDocuments.filter((p): p is string => typeof p === 'string' && /^\/(manual|docs)(\/[A-Za-z0-9_.-]+)*$/.test(p));
  if (typeof v.reviewTools === 'boolean' && !PRODUCTION_BUILD) out.reviewTools = v.reviewTools;
  return out;
}

let current: LaunchConfig = { ...LAUNCH_DEFAULTS, ...fromStorage() };

export const launchConfig = (): LaunchConfig => current;

/** Production boot (H-3) passes the tenant's Company OS settings here; screens re-render with the new values. */
export function configureLaunch(patch: Partial<LaunchConfig>) {
  current = { ...current, ...sanitize(patch) };
  for (const l of listeners) l();
}

export function useLaunchConfig(): LaunchConfig {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, launchConfig, launchConfig);
}

/** SW-08 — is the public website at the root yet? */
export function siteIsLive(config: LaunchConfig, now: Date = new Date()): boolean {
  if (config.siteLive) return true;
  return config.siteLiveAt != null && now.getTime() >= Date.parse(config.siteLiveAt);
}

/** SW-06 — may a visitor who is not signed in open this manual / docs path? */
export function isPublicDocument(config: LaunchConfig, path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  return config.publicDocuments.some((p) => clean === p || clean.startsWith(`${p}/`));
}
