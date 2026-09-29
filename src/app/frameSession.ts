/**
 * Per-frame session — how a preview runs as somebody else without touching the tester's own session.
 *
 * A preview iframe is the same app at the same origin, so it would read the same three localStorage
 * keys the providers persist (`hoyos.session`, `hoyos.lang`, `hoyos.theme`) and, worse, write them
 * back. Instead, when the app is framed AND its hash query carries `as` / `lang` / `theme` / `dev`,
 * we shadow exactly those three keys on `Storage.prototype`: reads return the frame's values, writes
 * are swallowed, everything else passes through untouched.
 *
 * `installFrameSession()` must run before React renders (it is the first import in main.tsx), because
 * SessionProvider, I18nProvider and ThemeProvider read their key in the `useState` initialiser.
 */
import { ROLES, type Role } from '../auth/roles';
import { demoUserByRole } from '../auth/demoUsers';

const SESSION_KEY = 'hoyos.session';
const LANG_KEY = 'hoyos.lang';
const THEME_KEY = 'hoyos.theme';

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

const isRole = (s: string): s is Role => (ROLES as readonly string[]).includes(s);

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

let installed = false;

/** Shadows the three session keys when this document is a preview frame. Safe to call twice. */
export function installFrameSession(): void {
  if (installed || typeof window === 'undefined' || !isFramed()) return;
  const q = hashQuery();
  const as = q.get('as');
  const lang = q.get('lang');
  const theme = q.get('theme');
  const dev = q.get('dev');
  if (!as && !lang && !theme && !dev) return;

  // `Object.create(null)`, not `{}`: `key in shadow` is the shadow test, and a plain object would
  // answer true for every Object.prototype member ('constructor', 'toString', …), so a getItem for
  // one of those keys would hand back a function instead of a string.
  const shadow: Record<string, string> = Object.create(null);
  // The session key is always shadowed once we are in frame mode, even when only `lang` or `theme`
  // was passed: otherwise the frame would read — and write back — the tester's own session.
  // A frame never inherits dev tooling unless it explicitly asks for it, and never "view as".
  shadow[SESSION_KEY] = JSON.stringify({
    userId: demoUserByRole(as && isRole(as) ? as : 'public').id,
    devMode: dev === '1',
    viewAs: null,
  });
  if (lang === 'es' || lang === 'en') shadow[LANG_KEY] = lang;
  if (theme === 'light' || theme === 'dark') shadow[THEME_KEY] = JSON.stringify({ theme, skin: 'styled' });

  const proto = Storage.prototype;
  const nativeGet = proto.getItem;
  const nativeSet = proto.setItem;
  const nativeRemove = proto.removeItem;
  proto.getItem = function getItem(key: string): string | null {
    if (key in shadow) return shadow[key];
    return nativeGet.call(this, key);
  };
  proto.setItem = function setItem(key: string, value: string): void {
    if (key in shadow) return; // a frame never writes the tester's session back
    nativeSet.call(this, key, value);
  };
  proto.removeItem = function removeItem(key: string): void {
    if (key in shadow) return;
    nativeRemove.call(this, key);
  };
  installed = true;
}
