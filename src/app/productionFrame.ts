/**
 * The production build's preview frames (Hoy test-fixes, lane Y3): the Hub's live previews are the same app at the same
 * origin in an iframe, signed in as the same super admin (Clerk's cookies are shared). Without this a frame would read
 * and write the parent tab's own storage: its view-as (`hoyos.viewAs`, sessionStorage is shared by same-origin frames),
 * its drafts, its language. So, when the document is framed:
 *
 * - its view-as is the frame's own `?as=<role>`: fixed for the frame's lifetime, never written back. The session still
 *   decides whether it counts (ProductionSession honours a stored view-as only for a real super admin), so a planted
 *   `?as=` does nothing for anyone else; a top-level document never installs any of this, so `?as=` there is ignored;
 * - every framed document is read-only: a frame with no viewable role (the super admin and public cards, or a planted
 *   value) keeps the sentinel `FRAME_READ_ONLY`, which the session ignores (not a role) and the Company OS transport's
 *   fail-closed check (`viewAsActive`) treats as "viewing as": only reads leave the browser. A same-origin write through
 *   `fetch`, `XMLHttpRequest` or `sendBeacon` is refused unsent as well (defence in depth for any caller outside the
 *   transport);
 * - `lang` / `theme` are the frame's own, the skin is always styled, and every other `hoyos.*` key lives in the frame's
 *   own copy (a frame's draft or sign-out clean-up never touches the parent's);
 * - the view-as banner is hidden (`data-frame` on <html>, productionFrame.css): a preview shows the page, not the bar.
 *
 * `installProductionFrame()` runs in main.tsx before React renders (the providers read their keys in `useState`).
 * No demo data here (the review build's frames are `frameSession.ts`).
 */
import { isViewableRole, VIEW_AS_KEY, VIEW_AS_REFUSAL, viewAsAllows } from '../auth/viewAs';
import { hashQuery, isFramed } from './frameMode';
import './productionFrame.css';

/** The view-as value of a frame that views as nobody: not a role (the session ignores it), but read-only. */
export const FRAME_READ_ONLY = 'frame';
const PREFIX = 'hoyos.';
const LANG_KEY = 'hoyos.lang';
const THEME_KEY = 'hoyos.theme';
const SKIN_KEY = 'hoyos.skin';

/** The keys a frame fixes from its hash query (`as`, `lang`, `theme`); hostile values are refused. */
export function productionFrameShadow(query: URLSearchParams): Record<string, string> {
  // `Object.create(null)`: `key in fixed` must not answer true for Object.prototype members.
  const fixed: Record<string, string> = Object.create(null);
  const as = query.get('as');
  fixed[VIEW_AS_KEY] = isViewableRole(as) ? as : FRAME_READ_ONLY;
  const lang = query.get('lang');
  if (lang === 'es' || lang === 'en') fixed[LANG_KEY] = lang;
  const theme = query.get('theme');
  if (theme === 'light' || theme === 'dark') fixed[THEME_KEY] = JSON.stringify({ theme, skin: 'styled' });
  fixed[SKIN_KEY] = 'styled';
  return fixed;
}

interface StorageMethods {
  getItem(this: object, key: string): string | null;
  setItem(this: object, key: string, value: string): void;
  removeItem(this: object, key: string): void;
}

/**
 * Shadows the storage prototype: a fixed key reads its frame value and ignores writes and removals; any other `hoyos.*`
 * key is read and written in this frame's own copy (per storage object), starting from the parent's value; anything
 * else passes through. Safe to call in a node test with a fake prototype.
 */
export function shadowStorage(proto: StorageMethods, fixed: Record<string, string>, prefix = PREFIX): void {
  const nativeGet = proto.getItem, nativeSet = proto.setItem, nativeRemove = proto.removeItem;
  // Per storage object: the frame's own writes (a value) and removals (null).
  const copies = new WeakMap<object, Map<string, string | null>>();
  const copyOf = (store: object) => { let c = copies.get(store); if (!c) { c = new Map(); copies.set(store, c); } return c; };
  const own = (key: unknown): key is string => typeof key === 'string' && key.startsWith(prefix);
  proto.getItem = function getItem(key: string): string | null {
    if (typeof key === 'string' && key in fixed) return fixed[key];
    if (own(key)) { const c = copyOf(this); if (c.has(key)) return c.get(key) ?? null; }
    return nativeGet.call(this, key);
  };
  proto.setItem = function setItem(key: string, value: string): void {
    if (typeof key === 'string' && key in fixed) return;
    if (own(key)) { copyOf(this).set(key, String(value)); return; }
    nativeSet.call(this, key, value);
  };
  proto.removeItem = function removeItem(key: string): void {
    if (typeof key === 'string' && key in fixed) return;
    if (own(key)) { copyOf(this).set(key, null); return; }
    nativeRemove.call(this, key);
  };
}

/** Refuses a same-origin `/api/` write through `fetch` (only GET, HEAD and `POST …/t/<tenant>/query` go out). */
export function guardFrameFetch(target: { fetch: typeof fetch }, origin: string): void {
  const native = target.fetch.bind(target);
  target.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const isRequest = typeof Request !== 'undefined' && input instanceof Request;
    const method = (init?.method ?? (isRequest ? (input as Request).method : 'GET')).toUpperCase();
    let url: URL | null = null;
    try { url = new URL(isRequest ? (input as Request).url : String(input), origin); } catch { url = null; }
    if (url && url.origin === origin && url.pathname.startsWith('/api/') && method !== 'HEAD') {
      // The path after `/t/<tenant>` is what the Company OS read rule names (`POST /query`).
      const rest = url.pathname.replace(/^\/api\/cos\/t\/[^/]+/, '');
      if (!viewAsAllows(method, rest)) {
        return new Response(JSON.stringify({ error: VIEW_AS_REFUSAL }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return native(input as RequestInfo, init);
  }) as typeof fetch;
}

/** The same rule for `XMLHttpRequest` and `navigator.sendBeacon` (a beacon is always a POST). */
export function guardFrameXhr(win: { XMLHttpRequest?: typeof XMLHttpRequest; navigator?: Navigator }, origin: string): void {
  const refused = (method: string, raw: string | URL) => {
    let url: URL | null = null;
    try { url = new URL(String(raw), origin); } catch { return false; }
    return url.origin === origin && url.pathname.startsWith('/api/') && method !== 'HEAD' && !viewAsAllows(method, url.pathname.replace(/^\/api\/cos\/t\/[^/]+/, ''));
  };
  const X = win.XMLHttpRequest;
  if (X) {
    const open = X.prototype.open;
    const send = X.prototype.send;
    const blocked = new WeakSet<XMLHttpRequest>();
    X.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
      if (refused(String(method).toUpperCase(), url)) blocked.add(this); else blocked.delete(this);
      return (open as (...a: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof X.prototype.open;
    X.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
      if (blocked.has(this)) { this.abort(); return; }
      return send.call(this, body);
    };
  }
  const nav = win.navigator;
  if (nav && typeof nav.sendBeacon === 'function') {
    const beacon = nav.sendBeacon.bind(nav);
    nav.sendBeacon = (url: string | URL, data?: BodyInit | null) => (refused('POST', url) ? false : beacon(url, data));
  }
}

let installed = false;

/** Applies the frame rules when this document is framed; true when it did. Safe to call twice. */
export function installProductionFrame(): boolean {
  if (installed) return true;
  if (typeof window === 'undefined' || !isFramed()) return false;
  shadowStorage(Storage.prototype, productionFrameShadow(hashQuery()));
  guardFrameFetch(window, window.location.origin);
  guardFrameXhr(window, window.location.origin);
  document.documentElement.dataset.frame = 'preview';
  installed = true;
  return true;
}
