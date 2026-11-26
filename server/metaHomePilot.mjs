// Home-page-only ads pilot. This switch is independent of login, checkout and Company OS.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const PILOT_FRAME_PATH = '/__hoy/meta-home-pageview';
const HOST = 'hoyhumanclub.com';
const PIXEL_ID = '963759066544104';
const SDK = 'https://connect.facebook.net/en_US/fbevents.js';

export const PILOT_UNLOCK_PATH = '/__hoy/meta-home-unlock';
const GRANT = '__Secure-hoy-meta-smoke';

export function createPilotGate(config, now = Date.now, token = () => randomBytes(32).toString('base64url')) {
  let claimed = false;
  let grant = null;
  const cfg = config.metaHomePilot;
  const deadline = now() + 15 * 60 * 1000;
  const active = req => config.environment === 'production' && Boolean(cfg)
    && now() < deadline && !config.testGate?.on && req.headers.host === HOST;
  const available = req => active(req) && !claimed;
  return {
    available,
    async unlock(req, rawQuery, readBody) {
      if (!available(req) || req.method !== 'POST' || rawQuery
        || req.headers.origin !== 'https://' + HOST || req.headers['sec-fetch-dest'] !== 'empty'
        || req.headers['sec-fetch-site'] !== 'same-origin'
        || req.headers['content-type'] !== 'text/plain;charset=UTF-8') return null;
      const body = await readBody().catch(() => null);
      if (!Buffer.isBuffer(body) || !available(req)) return null;
      const key = body.toString('utf8');
      if (!/^[A-Za-z0-9_-]{43}$/.test(key)) return null;
      const digest = createHash('sha256').update(key).digest();
      if (!timingSafeEqual(digest, Buffer.from(cfg.digest, 'hex'))) return null;
      claimed = true;
      grant = { value: token(), expires: now() + 30_000 };
      return grantCookie(grant.value, 30);
    },
    frame(req, rawQuery) {
      if (!active(req) || !grant || now() >= grant.expires || req.method !== 'GET' || rawQuery
        || req.headers.referer || req.headers['sec-fetch-dest'] !== 'iframe'
        || req.headers['sec-fetch-site'] !== 'same-origin') return null;
      const provided = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(GRANT + '='));
      const value = provided?.slice(GRANT.length + 1) ?? '';
      if (!/^[A-Za-z0-9_-]{43}$/.test(value) || !timingSafeEqual(Buffer.from(value), Buffer.from(grant.value))) return null;
      grant = null;
      const response = pilotFrame();
      response.headers['Set-Cookie'] = grantCookie('', 0);
      return response;
    },
  };
}

function grantCookie(value, seconds) {
  return `${GRANT}=${value}; Max-Age=${seconds}; Path=${PILOT_FRAME_PATH}; Secure; HttpOnly; SameSite=Strict`;
}

// An opaque child can neither read the parent DOM and storage nor learn its URL from Referrer.
// No partner parameters, matching fields, query forwarding, links, noscript fallback or server event.
const bootstrap = `(() => {
  if (window.parent === window || window.origin !== 'null' || document.referrer ||
      window.location.search || window.location.hash) return;
  const fbq = function () {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
    else fbq.queue.push(arguments);
  };
  window.fbq = window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  fbq('set', 'autoConfig', false, '${PIXEL_ID}');
  fbq('init', '${PIXEL_ID}');
  fbq('trackSingle', '${PIXEL_ID}', 'PageView');
  const script = document.createElement('script');
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = '${SDK}';
  document.head.append(script);
})();`;
const hash = createHash('sha256').update(bootstrap).digest('base64');
const csp = [
  "default-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'",
  "frame-ancestors 'self'", "sandbox allow-scripts",
  `script-src 'sha256-${hash}' ${SDK}`,
  "connect-src https://www.facebook.com/tr/", "img-src https://www.facebook.com/tr/",
].join('; ');

export function pilotFrame() {
  return {
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': csp, 'X-Robots-Tag': 'noindex, nofollow',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), storage-access=()',
    },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HOY page measurement</title><script>${bootstrap}</script></head><body></body></html>`,
  };
}
