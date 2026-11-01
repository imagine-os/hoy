/**
 * Frame mode, shared by both builds: is this document a preview frame, may it mount live previews, and the URL a
 * preview iframe loads. No session or demo data here: the review build's demo-user session for frames is
 * `frameSession.ts`, the production build's read-only shadow is `productionFrame.ts` (Hoy test-fixes, lane Y3), so the
 * production bundle never imports a demo user.
 */
import type { Role } from '../auth/roles';

/** Query of the hash location (`#/app?as=customer&lang=en`), which is where HashRouter keeps it. */
export function hashQuery(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash;
  const q = hash.indexOf('?');
  return new URLSearchParams(q === -1 ? '' : hash.slice(q + 1));
}

/** True inside any iframe (a cross-origin parent throws, which also means framed). */
export function isFramed(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.self !== window.top; } catch { return true; }
}

/**
 * Whether this page may mount live preview iframes: never inside a frame (no frames in frames),
 * never when the URL opts out with `live=0`, and never under automation (`navigator.webdriver`), so
 * `npm run screenshots` always captures the deterministic static-thumbnail hub — a capture must not
 * depend on how many frames happened to finish loading.
 */
export function liveFramesAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (isFramed()) return false;
  if (navigator.webdriver) return false;
  return hashQuery().get('live') !== '0';
}

/** Builds the hash a preview iframe loads: the route plus the session it should run under. */
export function frameUrl(route: string, opts: { as?: Role; lang?: string; theme?: string; dev?: boolean }): string {
  const q = new URLSearchParams();
  // Same order as the hub map's embed pattern (src/hub/hubMap.data.ts EMBED_PATTERN).
  if (opts.as) q.set('as', opts.as);
  if (opts.lang) q.set('lang', opts.lang);
  if (opts.theme) q.set('theme', opts.theme);
  q.set('dev', opts.dev ? '1' : '0');
  q.set('live', '0');
  const base = typeof window === 'undefined' ? '' : `${window.location.pathname}${window.location.search}`;
  return `${base}#${route}?${q.toString()}`;
}
