/**
 * Per-frame session — how a preview runs as somebody else without touching the tester's own session.
 *
 * A preview iframe is the same app at the same origin, so it would read the same three localStorage
 * keys the providers persist (`hoyos.session`, `hoyos.lang`, `hoyos.theme`) and, worse, write them
 * back. Instead, when the app is framed AND its hash query carries `as` / `lang` / `theme` / `dev`,
 * we shadow exactly those three keys on `Storage.prototype`: reads return the frame's values, writes
 * are swallowed, everything else passes through untouched.
 *
 * Review build only (the production build's frames are `productionFrame.ts`).
 *
 * `installFrameSession()` must run before React renders (it is the first import in main.tsx), because
 * SessionProvider, I18nProvider and ThemeProvider read their key in the `useState` initialiser.
 */
import { ROLES, type Role } from '../auth/roles';
import { demoUserByRole } from '../auth/demoUsers';
import { hashQuery, isFramed } from './frameMode';
// The frame helpers moved to frameMode.ts (lane Y3) so the production build can use them without the demo users.
export { frameUrl, hashQuery, isFramed, liveFramesAllowed } from './frameMode';

const SESSION_KEY = 'hoyos.session';
const LANG_KEY = 'hoyos.lang';
const THEME_KEY = 'hoyos.theme';

const isRole = (s: string): s is Role => (ROLES as readonly string[]).includes(s);

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
    viewAsPerson: null,
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
