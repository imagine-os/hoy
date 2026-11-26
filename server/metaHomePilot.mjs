// Home-page-only ads pilot. This switch is independent of login, checkout and Company OS.
import { createHash, timingSafeEqual } from 'node:crypto';

export const PILOT_FRAME_PATH = '/__hoy/meta-home-pageview';
const HOST = 'hoyhumanclub.com';
const PIXEL_ID = '963759066544104';
const SDK = 'https://connect.facebook.net/en_US/fbevents.js';

export function createPilotGate(config, now = Date.now) {
  let used = false;
  const cfg = config.metaHomePilot;
  const deadline = now() + 15 * 60 * 1000;
  const available = req => config.environment === 'production' && cfg
    && !used && now() < deadline && !config.testGate?.on && req.headers.host === HOST;
  return {
    available,
    async claim(req, rawQuery, readBody) {
      if (!available(req) || req.method !== 'POST' || rawQuery
        || req.headers.origin !== 'https://' + HOST || req.headers['sec-fetch-dest'] !== 'iframe'
        || req.headers['sec-fetch-site'] !== 'same-origin'
        || req.headers['content-type'] !== 'application/x-www-form-urlencoded') return null;
      const body = await readBody().catch(() => null);
      if (!Buffer.isBuffer(body) || !available(req)) return null;
      const match = /^key=([A-Za-z0-9_-]{43})$/.exec(body.toString('utf8'));
      if (!match) return null;
      const digest = createHash('sha256').update(match[1]).digest();
      if (!timingSafeEqual(digest, Buffer.from(cfg.digest, 'hex'))) return null;
      used = true;
      return pilotFrame();
    },
  };
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
