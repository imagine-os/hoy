// The test site's passphrase gate (Company OS playbook rule D5). The test site is on the public internet, with made-up
// data, a development sign-in and real outgoing mail, so everyone who opens it first types the team's passphrase.
// Production never has it. Ported from Between Gigs' lib/security/test-gate.ts.
//
// - On only when TEST_GATE_PASSPHRASE is set, and never when RAILWAY_ENVIRONMENT_NAME is `production`. With the passphrase
//   but no COOKIE_SIGNING_SECRET every gated request answers 503: half a configuration never opens the site.
// - No valid cookie: a 401 passphrase page (plain HTML, Spanish and English, no app bundle), or a 401 JSON answer under
//   /api/, /files/ and /private-docs/.
// - The right passphrase sets a signed cookie for 30 days, bound to the site's origin (APP_URL), the passphrase's hash and
//   the expiry: a new passphrase signs everyone out. It only opens the site: the API still decides by the Clerk session,
//   and the proxy never forwards it (app.mjs, FORWARD_REQUEST_HEADERS).
// - 5 wrong tries in 15 minutes from one address, then 429. The address is the edge's X-Real-IP, as everywhere in this
//   server (the deploy's smoke check proves the edge overwrites it), and for IPv6 its /64, since one customer holds a whole
//   /64. In memory, since test runs one instance.
// - Exempt, exactly: /health, any method (Railway; the route itself answers only GET and HEAD), and POST /webhooks/resend
//   (Resend has no cookie; the API checks its signature).
//   Hoy's emails only link to the site and load no image from it, so unlike Between Gigs no image path is exempt.
// - Every answer while it is on says noindex.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { isIPv6 } from 'node:net';

export const GATE_COOKIE = 'hoy_test_gate';
export const GATE_PATH = '/test-gate';
const MAX_AGE_S = 30 * 86_400;
const MAX_BODY_BYTES = 4096;
const READ_MS = 10_000;
const MAX_NEXT_LENGTH = 2000;
const TRIES = { max: 5, windowMs: 15 * 60_000, maxAddresses: 10_000 };
const JSON_PATH = /^\/(?:api|files|private-docs)(?:\/|$)/;
const COOKIE = new RegExp(`(?:^|;\\s*)${GATE_COOKIE}=(\\d{1,15})\\.([0-9a-f]{64})(?:;|$)`);

/** What the gate reads from the environment. Off is `{ on: false }`, whatever else is set. */
export function gateSettings(env = process.env) {
  // Never on production, whatever reached its variables (the production deploy refuses the secret too).
  const passphrase = env.RAILWAY_ENVIRONMENT_NAME === 'production' ? '' : env.TEST_GATE_PASSPHRASE || '';
  if (!passphrase) return { on: false };
  return { on: true, passphrase, secret: env.COOKIE_SIGNING_SECRET || '', origin: originOf(env.APP_URL) };
}

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

const sha256 = (text) => createHash('sha256').update(text).digest();

/** Where to go after the passphrase: a path on this site only, anything else the home page. */
export function safeNext(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_NEXT_LENGTH) return '/';
  // One slash and then not another or a backslash; printable ASCII only, so nothing can break out of the Location header.
  if (!/^\/(?![/\\])/.test(raw) || /[^\x21-\x7e]|\\/.test(raw)) return '/';
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return '/';
  }
  if (/^\/[/\\]/.test(decoded) || decoded.includes('\\') || /[\x00-\x1f\x7f]/.test(decoded)) return '/';
  return raw;
}

/** What wrong tries are counted under: an IPv6 address's /64, an IPv4 address as it is, anything else cut to 64 characters. */
export function addressKey(raw) {
  const text = String(raw ?? '').trim().slice(0, 64);
  if (!text) return 'unknown';
  const address = text.split('%')[0];
  if (!isIPv6(address)) return text;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return mapped[1];
  // A dotted tail stands for two groups, the last two, so its value never reaches the first four.
  const groups = (part) => (part ? part.split(':').flatMap((g) => (g.includes('.') ? ['0', '0'] : [g])) : []);
  const [head, tail] = address.split('::');
  const before = groups(head);
  const after = groups(tail);
  const full = address.includes('::') ? [...before, ...Array(8 - before.length - after.length).fill('0'), ...after] : before;
  return `${full.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':')}::/64`;
}

/**
 * Wrong tries per address. Bounded: an address holds at most `max` times (nothing is added once it is blocked), and at
 * `maxAddresses` the expired ones go first, then the oldest.
 */
export function createAttemptLimiter({ max, windowMs, maxAddresses }) {
  const tries = new Map();
  const recent = (who, at) => (tries.get(who) ?? []).filter((t) => at - t < windowMs);
  return {
    blocked: (who, at) => recent(who, at).length >= max,
    fail(who, at) {
      const kept = recent(who, at);
      tries.delete(who);
      if (tries.size >= maxAddresses) {
        for (const key of [...tries.keys()]) if (recent(key, at).length === 0) tries.delete(key);
        while (tries.size >= maxAddresses) tries.delete(tries.keys().next().value);
      }
      tries.set(who, [...kept, at]);
    },
    clear: (who) => tries.delete(who),
    size: () => tries.size,
  };
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const MESSAGES = {
  wrong: 'Esa frase no es correcta. · That passphrase didn\'t work.',
  blocked: 'Demasiados intentos: espera 15 minutos. · Too many tries: wait 15 minutes.',
};

// System colours only: this page loads nothing (no tokens, no stylesheet, no script) and follows the visitor's light or
// dark mode.
function pageHtml(next, message) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Hoy · pruebas / test</title>
<style>:root{color-scheme:light dark}body{font:16px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:Canvas;color:CanvasText}main{width:min(22rem,calc(100% - 2rem))}h1{font-size:1.25rem;margin:0 0 .25rem}p{margin:0 0 1rem}label{display:block;font-weight:600;margin-bottom:.25rem}input{width:100%;box-sizing:border-box;font:inherit;padding:.6rem .75rem;border:1px solid GrayText;border-radius:.5rem}button{margin-top:.75rem;width:100%;font:inherit;font-weight:600;padding:.6rem;border:0;border-radius:.5rem;background:AccentColor;color:AccentColorText;cursor:pointer}.e{font-weight:600}</style></head>
<body><main><h1>Hoy: sitio de pruebas · test site</h1><p>Este es el entorno de pruebas del equipo. Escribe la frase de acceso para continuar.</p><p lang="en">This is the team's test environment. Enter the passphrase to continue.</p>${message ? `<p class="e" role="alert">${message}</p>` : ''}
<form method="post" action="${GATE_PATH}"><input type="hidden" name="next" value="${escapeHtml(next)}"><label for="p">Frase de acceso · Passphrase</label><input id="p" name="passphrase" type="password" autocomplete="current-password" required autofocus><button type="submit">Continuar · Continue</button></form></main></body></html>`;
}

const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

/**
 * @param {ReturnType<typeof gateSettings>} settings
 * @param {{ now?: () => number, readBody: Function, closeIfUnread: Function }} deps the clock, and app.mjs's body helpers
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, path: string) => Promise<boolean>}
 *   true when the gate answered; false to let the request through. `path` is the path the handler routes on.
 */
export function createTestGate(settings, { now = Date.now, readBody, closeIfUnread }) {
  if (!settings?.on) return async () => false;
  const { passphrase, secret, origin } = settings;
  const passphraseHash = sha256(passphrase);
  const attempts = createAttemptLimiter(TRIES);

  // Bound to the site and to the passphrase (a new one signs everyone out).
  const signature = (exp) => createHmac('sha256', secret).update(`gate|${origin}|${passphraseHash.toString('hex')}|${exp}`).digest('hex');

  function validCookie(req) {
    const match = COOKIE.exec(req.headers.cookie ?? '');
    if (!match) return false;
    const exp = Number(match[1]);
    if (!(exp > now())) return false;
    return timingSafeEqual(Buffer.from(signature(exp)), Buffer.from(match[2]));
  }

  function send(req, res, status, headers, body = '') {
    closeIfUnread(res);
    res.writeHead(status, { 'Cache-Control': 'no-store', ...headers, 'Content-Length': Buffer.byteLength(body) });
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  }
  const sendText = (req, res, status, body) => send(req, res, status, { 'Content-Type': 'text/plain; charset=utf-8' }, body);
  const sendPage = (req, res, status, next, message = '') =>
    send(req, res, status, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': PAGE_CSP }, pageHtml(next, message));

  async function submit(req, res) {
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) return sendText(req, res, 413, 'Too large.');
    const body = await readBody(req, MAX_BODY_BYTES, READ_MS);
    if (body === 'too_large') return sendText(req, res, 413, 'Too large.');
    if (body === 'too_slow') return sendText(req, res, 408, 'Too slow.');
    const form = new URLSearchParams(body.toString('utf8'));
    const next = safeNext(form.get('next'));
    const at = now();
    // The edge's X-Real-IP, as everywhere in this server; never X-Forwarded-For, whose first hop the browser can write.
    const who = addressKey(req.headers['x-real-ip']?.trim() || req.socket.remoteAddress);
    if (attempts.blocked(who, at)) return sendPage(req, res, 429, next, MESSAGES.blocked);
    // Digests, so the comparison takes the same time whatever the length typed.
    if (!timingSafeEqual(sha256(form.get('passphrase') ?? ''), passphraseHash)) {
      attempts.fail(who, at);
      return sendPage(req, res, 401, next, MESSAGES.wrong);
    }
    attempts.clear(who);
    const exp = at + MAX_AGE_S * 1000;
    return send(req, res, 303, {
      // A path on this site (safeNext), so the browser stays on the origin it is on.
      Location: next,
      'Set-Cookie': `${GATE_COOKIE}=${exp}.${signature(exp)}; Max-Age=${MAX_AGE_S}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    });
  }

  return async function testGate(req, res, path) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (path === '/health') return false;
    if (path === '/webhooks/resend' && req.method === 'POST') return false;
    if (!secret) return sendText(req, res, 503, 'This test site is not configured yet.');
    if (path === GATE_PATH && req.method === 'POST') return submit(req, res);
    if (validCookie(req)) {
      if (path === GATE_PATH) return send(req, res, 303, { Location: '/' });
      return false;
    }
    if (JSON_PATH.test(path)) return send(req, res, 401, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify({ error: 'test_gate' }));
    return sendPage(req, res, 401, path === GATE_PATH ? '/' : safeNext(req.url));
  };
}
