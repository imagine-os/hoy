// The Hoy server's request handler. These jobs, nothing else:
//   /health              liveness for Railway (and the release it is running);
//   /app-config.json     the browser's public settings (tenant, API base, Clerk publishable key, the go-live switch);
//   /api/cos/*           a signed-in user's call, checked against Clerk, forwarded to Company OS on the
//                        private network with the same token as the bearer;
//   GET /files/<id>      a stored file (e.g. a transfer receipt), streamed from storage after the API has
//                        checked the user may read it; the signed storage link never reaches the browser;
//   POST /webhooks/resend Resend's delivery webhook, forwarded byte for byte to the API, which checks
//                        the signature;
//   everything else      the built frontend in dist/ (website + app; HashRouter, so no SPA fallback).
// No framework: node:http only. Clerk verification is injected (see clerk.mjs) so tests can fake it.
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { extname, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

/**
 * Company OS routes a visitor without a session may reach (method + path after `/t/<tenant>`), e.g.
 * `{ method: 'GET', path: '/signup' }`. Only routes the API itself serves without a session belong here.
 * Today there are none: even `GET /signup` authenticates first (ADR 0038, so tenant slugs can't be
 * enumerated), so every call needs a verified Clerk session here before it reaches the private network.
 */
export const ANONYMOUS_ROUTES = [];

/** Never forwarded, signed in or not (first segment after `/t/<tenant>`): the API's dev login hands out tokens. */
const BLOCKED_SECTIONS = new Set(['auth']);

const PROXY_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
/** The only browser headers that reach Company OS. Authorization is set by us, from the verified token. */
const FORWARD_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'content-length', 'idempotency-key', 'if-match', 'if-none-match'];
/** The webhook's signature headers (Svix) plus what describes the body. */
const WEBHOOK_HEADERS = ['content-type', 'content-length', 'svix-id', 'svix-timestamp', 'svix-signature', 'user-agent'];
/** Upstream response headers that never reach the browser. */
const DROP_RESPONSE_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
  'set-cookie', 'access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-headers',
  'access-control-allow-methods', 'access-control-expose-headers', 'access-control-max-age',
]);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf', '.csv': 'text/csv; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.md', '.txt', '.xml', '.webmanifest', '.svg', '.csv']);

/**
 * @param {import('./config.mjs').ServerConfig} config
 * @param {{ verifySession: (token: string) => Promise<{ userId: string }> , log?: (entry: object) => void }} deps
 *   verifySession resolves for a valid Clerk session token and rejects otherwise.
 */
export async function createHandler(config, deps) {
  const distDir = resolve(config.distDir);
  const release = await readFile(resolve(distDir, 'release.json'), 'utf8').then(JSON.parse, () => null);
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)));
  const appConfig = JSON.stringify({
    tenant: config.tenant,
    apiBase: '/api/cos',
    clerkPublishableKey: config.clerkPublishableKey ?? null,
    environment: config.environment,
    launch: config.launch,
  });

  return async function handle(req, res) {
    const started = Date.now();
    const [rawPath, rawQuery] = splitUrl(req.url ?? '/');
    securityHeaders(req, res);
    try {
      if (rawPath === '/health') return health(req, res, release);
      if (rawPath === '/app-config.json') {
        if (req.method !== 'GET' && req.method !== 'HEAD') return sendError(res, 405, 'method_not_allowed');
        return sendJson(res, 200, null, appConfig, req.method === 'HEAD');
      }
      if (rawPath === '/webhooks/resend') {
        await webhook(req, res, config);
        return log({ event: 'webhook.resend', status: res.statusCode, ms: Date.now() - started });
      }
      if (rawPath === '/api/cos' || rawPath.startsWith('/api/cos/')) {
        const route = await proxy(req, res, config, deps, rawPath.slice('/api/cos'.length), rawQuery);
        return log({ event: 'api.cos', method: req.method, route, status: res.statusCode, ms: Date.now() - started });
      }
      if (rawPath === '/files' || rawPath.startsWith('/files/')) {
        const outcome = await file(req, res, config, deps, rawPath.slice('/files'.length));
        return log({ event: 'file', outcome, status: res.statusCode, ms: Date.now() - started });
      }
      if (rawPath.startsWith('/api/') || rawPath.startsWith('/webhooks/')) return sendError(res, 404, 'not_found');
      return await serveStatic(req, res, distDir, rawPath, rawQuery);
    } catch (err) {
      log({ event: 'server.error', message: err instanceof Error ? err.message : String(err) });
      if (!res.headersSent) sendError(res, 500, 'server_error');
      else res.destroy();
    }
  };
}

// ---------------------------------------------------------------------------------------------
// /health and shared response helpers
// ---------------------------------------------------------------------------------------------

function health(req, res, release) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendError(res, 405, 'method_not_allowed');
  const body = JSON.stringify({ ok: true, version: release?.version ?? null, commit: release?.sourceCommit ?? null });
  return sendJson(res, 200, null, body, req.method === 'HEAD');
}

function securityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // The hub's DeviceFrame shows the app in a same-origin iframe; nobody else may frame it.
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (header(req.headers['x-forwarded-proto']) === 'https') res.setHeader('Strict-Transport-Security', 'max-age=15552000');
}

function sendJson(res, status, error, body = JSON.stringify({ error }), headOnly = false) {
  closeIfUnread(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(headOnly ? undefined : body);
}

const sendError = (res, status, error) => sendJson(res, status, error);

/** After an early answer, how much of the unread body is still discarded so the client can read it. */
const LINGER_BYTES = 1024 * 1024;
const LINGER_MS = 1000;

/**
 * Answering before the request body has been read: Node would otherwise read (and throw away) the rest,
 * which a client could make endless. A bounded linger instead: whatever still arrives is discarded up
 * to LINGER_BYTES (then reading stops), and the connection is closed after LINGER_MS. (No
 * `Connection: close` header: Node then tears the socket down as soon as the answer is flushed, and a
 * client still sending gets a reset instead of the answer.)
 */
function closeIfUnread(res) {
  const req = res.req;
  if (!req || req.complete) return;
  res.once('finish', () => {
    const socket = req.socket;
    let discarded = 0;
    req.on('data', (chunk) => {
      discarded += chunk.length;
      if (discarded > LINGER_BYTES) req.pause();
    });
    req.resume();
    setTimeout(() => socket.destroy(), LINGER_MS).unref();
  });
}

const header = (v) => (Array.isArray(v) ? v[0] : v);

function splitUrl(url) {
  const q = url.indexOf('?');
  return q === -1 ? [url, ''] : [url.slice(0, q), url.slice(q)];
}

// ---------------------------------------------------------------------------------------------
// /api/cos/* → Company OS
// ---------------------------------------------------------------------------------------------

/** Returns the route shape for the log (`/t/<tenant>/<first segment>`), never ids or the query. */
async function proxy(req, res, config, deps, rest, query) {
  const segments = safeSegments(rest);
  const tenantPrefix = `/t/${config.tenant}`;
  if (!segments || segments[0] !== 't' || segments[1] !== config.tenant || segments.length < 3) {
    sendError(res, 404, 'not_found');
    return 'refused';
  }
  const route = `${tenantPrefix}/${segments[2]}`;
  const tail = rest.slice(tenantPrefix.length);
  // The private download link stays on this server (IN-028): the browser gets the bytes from /files/<id>.
  if (BLOCKED_SECTIONS.has(segments[2]) || (segments[2] === 'files' && segments[4] === 'url')) {
    sendError(res, 404, 'not_found');
    return route;
  }
  if (!PROXY_METHODS.has(req.method)) {
    sendError(res, 405, 'method_not_allowed');
    return route;
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && (Number(header(req.headers['content-length']) ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined)) {
    sendError(res, 400, 'body_not_allowed');
    return route;
  }
  const declared = Number(header(req.headers['content-length']) ?? 0);
  if (declared > config.proxyBodyLimit) {
    sendError(res, 413, 'payload_too_large');
    return route;
  }

  const token = bearer(req.headers.authorization);
  if (token === undefined) {
    // No session: only the routes the API itself serves to anyone.
    if (!ANONYMOUS_ROUTES.some((r) => r.method === req.method && r.path === tail)) {
      sendError(res, 401, 'unauthorized');
      return route;
    }
  } else {
    try {
      await deps.verifySession(token);
    } catch {
      sendError(res, 401, 'unauthorized');
      return route;
    }
  }

  const headers = pick(req.headers, FORWARD_REQUEST_HEADERS);
  if (req.method === 'GET' || req.method === 'HEAD') delete headers['content-length'];
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  Object.assign(headers, clientHeaders(req));

  await forward(res, config, { method: req.method, path: rest + query, headers, body: req, limit: config.proxyBodyLimit });
  return route;
}

/**
 * The visitor's address as Railway's edge saw it (it sets X-Real-IP); never the browser's own
 * X-Forwarded-For, which anyone can write.
 */
function clientHeaders(req) {
  const client = header(req.headers['x-real-ip']) ?? req.socket.remoteAddress ?? '';
  return { 'x-forwarded-for': client, 'x-real-ip': client, 'x-forwarded-proto': header(req.headers['x-forwarded-proto']) ?? 'http' };
}

/** `Bearer <token>` → token; no header → undefined; anything else → '' (fails verification). */
function bearer(value) {
  const v = header(value);
  if (v === undefined) return undefined;
  const m = /^Bearer ([A-Za-z0-9._~+/=-]+)$/i.exec(v.trim());
  return m ? m[1] : '';
}

/**
 * The path's segments, decoded, or null when any could escape the tenant once the API (or anything
 * between) normalises it: empty segments, `.`/`..`, encoded or literal slashes and backslashes, NUL.
 */
function safeSegments(rest) {
  if (!rest.startsWith('/')) return null;
  const parts = rest.slice(1).split('/');
  const out = [];
  for (const part of parts) {
    let decoded;
    try {
      decoded = decodeURIComponent(part);
    } catch {
      return null;
    }
    if (decoded === '' || decoded === '.' || decoded === '..' || /[/\\\0]/.test(decoded) || part.includes('\\')) return null;
    out.push(decoded);
  }
  return out;
}

function pick(source, names) {
  const out = {};
  for (const n of names) {
    const v = header(source[n]);
    if (v !== undefined && v !== '') out[n] = v;
  }
  return out;
}

/**
 * One request to Company OS. `body` is a stream (piped with a byte limit) or a Buffer. The answer is
 * streamed back with hop-by-hop, cookie and CORS headers removed; user data is never cacheable.
 */
function forward(res, config, { method, path, headers, body, limit }) {
  return new Promise((done) => {
    const target = new URL(config.companyOsUrl.replace(/\/+$/, '') + path);
    const client = target.protocol === 'https:' ? https : http;
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        done();
      }
    };
    const upstream = client.request(target, { method, headers, timeout: config.upstreamTimeoutMs }, (answer) => {
      const out = {};
      for (const [k, v] of Object.entries(answer.headers)) if (!DROP_RESPONSE_HEADERS.has(k)) out[k] = v;
      // A signed-in user's data: never stored by the browser or anything in between, whatever the API says.
      out['cache-control'] = 'private, no-store';
      res.writeHead(answer.statusCode ?? 502, out);
      answer.pipe(res);
      answer.on('end', finish);
      answer.on('error', () => {
        res.destroy();
        finish();
      });
    });
    upstream.on('timeout', () => upstream.destroy(Object.assign(new Error('upstream timeout'), { code: 'UPSTREAM_TIMEOUT' })));
    upstream.on('error', (err) => {
      if (!res.headersSent) {
        if (err.code === 'PAYLOAD_TOO_LARGE') sendError(res, 413, 'payload_too_large');
        else if (err.code === 'UPSTREAM_TIMEOUT') sendError(res, 504, 'upstream_timeout');
        else sendError(res, 502, 'upstream_unavailable');
      } else {
        res.destroy();
      }
      finish();
    });
    // The browser went away: stop the upstream call too.
    res.on('close', () => {
      if (!res.writableFinished) upstream.destroy();
      finish();
    });

    if (Buffer.isBuffer(body)) {
      upstream.end(body);
      return;
    }
    if (method === 'GET' || method === 'HEAD') {
      body.resume();
      upstream.end();
      return;
    }
    let seen = 0;
    body.on('data', (chunk) => {
      seen += chunk.length;
      if (seen > limit && !upstream.destroyed) {
        body.unpipe(upstream);
        body.pause();
        upstream.destroy(Object.assign(new Error('payload too large'), { code: 'PAYLOAD_TOO_LARGE' }));
      }
    });
    body.pipe(upstream);
  });
}

// ---------------------------------------------------------------------------------------------
// GET /files/<id> → the API's download link → the bytes (IN-028: this server serves every file)
// ---------------------------------------------------------------------------------------------

const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The API's `{ url, expiresIn }` answer is tiny; anything bigger is not it. */
const LINK_ANSWER_LIMIT = 16 * 1024;
/** Shown in the browser. Anything else (SVG, HTML, PDF, unknown) is downloaded, never rendered on this origin. */
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
const REFUSAL_CODES = { 400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 409: 'conflict' };

/**
 * Asks the API for the file's download link with the user's own token (so the API's read permission
 * decides, and audits it), then streams the bytes from storage. The link, the storage host's headers and
 * its error bodies stay on this server. One deadline (FILE_TIMEOUT_MS) covers both calls and the stream;
 * a file over FILE_SIZE_LIMIT_BYTES is refused, or cut off if storage didn't declare its size.
 * Returns the outcome for the log (never the id or the link).
 */
async function file(req, res, config, deps, rest) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(res, 405, 'method_not_allowed');
    return 'refused';
  }
  const id = rest.slice(1);
  if (!rest.startsWith('/') || !FILE_ID.test(id)) {
    sendError(res, 404, 'not_found');
    return 'refused';
  }
  if (Number(header(req.headers['content-length']) ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined) {
    sendError(res, 400, 'body_not_allowed');
    return 'refused';
  }
  const token = bearer(req.headers.authorization);
  if (!token) {
    sendError(res, 401, 'unauthorized');
    return 'refused';
  }

  // One deadline from here on, the session check included; the browser leaving aborts everything.
  const deadline = Date.now() + config.fileTimeoutMs;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), config.fileTimeoutMs);
  res.on('close', () => abort.abort());
  try {
    const verified = await Promise.race([
      deps.verifySession(token).then(() => true, () => false),
      new Promise((done) => abort.signal.addEventListener('abort', () => done(null), { once: true })),
    ]);
    if (verified === null) throw new Error('session check timed out');
    if (!verified) {
      sendError(res, 401, 'unauthorized');
      return 'refused';
    }

    // 1. The link, if the API lets this user read the file.
    const linkUrl = new URL(`${config.companyOsUrl.replace(/\/+$/, '')}/t/${config.tenant}/files/${id}/url`);
    const answer = await get(linkUrl, { accept: 'application/json', authorization: `Bearer ${token}`, ...clientHeaders(req) }, abort.signal);
    const body = await readBody(answer, LINK_ANSWER_LIMIT, Math.max(1, deadline - Date.now()));
    if (body === 'too_slow') abort.abort();
    if (!Buffer.isBuffer(body)) throw new Error('link answer too large or slow');
    if (answer.statusCode !== 200) {
      const status = answer.statusCode ?? 502;
      if (status >= 400 && status < 500) {
        // The API's refusal, as it answered it: its machine code (e.g. `file_not_ready`), never its text.
        const code = parseJson(body)?.error;
        sendError(res, status, typeof code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : REFUSAL_CODES[status] ?? 'refused');
        return 'refused';
      }
      sendError(res, status === 503 ? 503 : 502, status === 503 ? 'storage_not_configured' : 'upstream_unavailable');
      return 'upstream_error';
    }
    const link = storageLink(parseJson(body)?.url, config);
    if (!link) {
      sendError(res, 502, 'bad_file_link');
      return 'bad_link';
    }

    // 2. The bytes, with nothing of the browser's request and nothing of storage's headers but the type and size.
    const stored = await get(link, { accept: '*/*', 'accept-encoding': 'identity' }, abort.signal);
    if (stored.statusCode !== 200) {
      stored.resume();
      sendError(res, stored.statusCode === 404 ? 404 : 502, stored.statusCode === 404 ? 'not_found' : 'storage_error');
      return 'storage_error';
    }
    const declared = header(stored.headers['content-length']);
    const size = declared !== undefined && /^\d+$/.test(declared) ? Number(declared) : undefined;
    if (size !== undefined && size > config.fileSizeLimit) {
      stored.destroy();
      sendError(res, 502, 'file_too_large');
      return 'too_large';
    }
    const type = (header(stored.headers['content-type']) ?? '').split(';')[0].trim().toLowerCase();
    const inline = INLINE_TYPES.has(type);
    res.writeHead(200, {
      'Content-Type': inline ? type : 'application/octet-stream',
      'Content-Disposition': inline ? 'inline' : 'attachment',
      'Cache-Control': 'private, no-store',
      // Even if storage lied about the type: no script, no plugin, no embedding by another site.
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
      ...(size !== undefined ? { 'Content-Length': size } : {}),
    });
    return await new Promise((done) => {
      let seen = 0;
      stored.on('data', (chunk) => {
        seen += chunk.length;
        if (seen > config.fileSizeLimit) {
          // Undeclared size past the cap: the answer has started, so cut it off (the browser sees a failed download).
          stored.destroy();
          res.destroy();
          done('too_large');
        }
      });
      stored.on('error', () => {
        res.destroy();
        done(!abort.signal.aborted ? 'storage_error' : Date.now() >= deadline ? 'timeout' : 'client_gone');
      });
      stored.on('end', () => done('served'));
      stored.pipe(res);
    });
  } catch {
    if (res.headersSent || res.destroyed) {
      res.destroy();
      return abort.signal.aborted ? 'timeout' : 'storage_error';
    }
    if (abort.signal.aborted) sendError(res, 504, 'upstream_timeout');
    else sendError(res, 502, 'upstream_unavailable');
    return abort.signal.aborted ? 'timeout' : 'upstream_error';
  } finally {
    clearTimeout(timer);
  }
}

/** One GET; resolves with the answer (any status), rejects on a network error or when `signal` aborts. */
function get(url, headers, signal) {
  return new Promise((done, fail) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(url, { method: 'GET', headers, signal }, done);
    request.on('error', fail);
    request.end();
  });
}

function parseJson(buffer) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * The API's link, only if it is one this server should fetch, so a bad answer can't point this server at
 * another host on the private network: no credentials; https outside local; on FILE_STORAGE_ORIGINS
 * when that is set, and production fetches nothing without it.
 */
function storageLink(value, config) {
  if (typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && (url.protocol !== 'http:' || config.environment !== 'local')) return null;
  if (url.username || url.password) return null;
  if (config.fileStorageOrigins.length ? !config.fileStorageOrigins.includes(url.origin) : config.environment === 'production') return null;
  return url;
}

// ---------------------------------------------------------------------------------------------
// POST /webhooks/resend → Company OS /webhooks/messaging/resend (raw body, unchanged)
// ---------------------------------------------------------------------------------------------

async function webhook(req, res, config) {
  if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed');
  const declared = Number(header(req.headers['content-length']) ?? 0);
  if (declared > config.webhookBodyLimit) return sendError(res, 413, 'payload_too_large');
  const body = await readBody(req, config.webhookBodyLimit, WEBHOOK_READ_MS);
  if (body === 'too_large') return sendError(res, 413, 'payload_too_large');
  if (body === 'too_slow') return sendError(res, 408, 'request_timeout');
  const headers = pick(req.headers, WEBHOOK_HEADERS);
  // Without Svix's three headers the API would refuse it anyway; don't spend the private network on it.
  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) return sendError(res, 400, 'missing_signature');
  headers['content-length'] = String(body.length);
  return forward(res, config, { method: 'POST', path: '/webhooks/messaging/resend', headers, body, limit: config.webhookBodyLimit });
}

/** Resend's payloads are small and sent in one go: a body still arriving after this is refused. */
const WEBHOOK_READ_MS = 10_000;

/**
 * The whole body as one Buffer; 'too_large' as soon as it grows past `limit`, 'too_slow' when it hasn't
 * ended within `ms`. Either way reading stops at once (the answer then closes the connection).
 */
function readBody(req, limit, ms) {
  return new Promise((done, fail) => {
    const chunks = [];
    let size = 0;
    const stop = (result) => {
      clearTimeout(timer);
      req.removeAllListeners('data');
      req.pause();
      done(result);
    };
    const timer = setTimeout(() => stop('too_slow'), ms);
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) return stop('too_large');
      chunks.push(chunk);
    });
    req.on('end', () => {
      clearTimeout(timer);
      done(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      fail(err);
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Static files from dist/
// ---------------------------------------------------------------------------------------------

async function serveStatic(req, res, distDir, rawPath, rawQuery) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'method_not_allowed');
  }
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return notFound(res);
  }
  // No dotfiles, except the standard `.well-known/` (domain and app verification files).
  if (path.includes('\0') || path.includes('\\') || path.split('/').some((s) => s.startsWith('.') && s !== '.well-known')) return notFound(res);
  let file = resolve(distDir, '.' + path);
  if (file !== distDir && !file.startsWith(distDir + sep)) return notFound(res);

  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    if (!rawPath.endsWith('/')) {
      // Relative asset URLs inside /website/index.html only resolve from /website/.
      // One leading slash only: `//website` must not become a protocol-relative link to another host.
      res.writeHead(301, { Location: '/' + rawPath.replace(/^\/+/, '') + '/' + rawQuery });
      return res.end();
    }
    file = resolve(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) return notFound(res);

  const ext = extname(file).toLowerCase();
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    ETag: etag,
    'Last-Modified': info.mtime.toUTCString(),
    'Accept-Ranges': 'bytes',
    // Vite's hashed bundles never change under the same name; everything else is revalidated.
    'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=300',
  };
  if (COMPRESSIBLE.has(ext)) headers.Vary = 'Accept-Encoding';

  if (header(req.headers['if-none-match']) === etag) {
    res.writeHead(304, headers);
    return res.end();
  }

  const range = header(req.headers.range);
  if (range) {
    const parsed = parseRange(range, info.size);
    if (parsed === 'invalid') {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }
    if (parsed) {
      const [start, end] = parsed;
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${info.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      return pipeFile(createReadStream(file, { start, end }), res);
    }
  }

  const gzip = COMPRESSIBLE.has(ext) && info.size > 1024 && /\bgzip\b/.test(header(req.headers['accept-encoding']) ?? '');
  if (gzip) {
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' });
    if (req.method === 'HEAD') return res.end();
    return pipeFile(createReadStream(file).pipe(createGzip()), res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': info.size });
  if (req.method === 'HEAD') return res.end();
  return pipeFile(createReadStream(file), res);
}

function pipeFile(stream, res) {
  return new Promise((done) => {
    stream.on('error', () => {
      res.destroy();
      done();
    });
    res.on('close', () => {
      stream.destroy();
      done();
    });
    stream.pipe(res);
  });
}

/** A single `bytes=a-b` / `a-` / `-n` range → [start, end]; null = ignore it (serve the whole file). */
function parseRange(value, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (suffix === 0) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return 'invalid';
  return [start, end];
}

function notFound(res) {
  const body = 'Not found';
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-cache' });
  res.end(body);
}

export function createHoyServer(handler) {
  const server = http.createServer(handler);
  // Railway's edge keeps connections open; stay above its idle timeout so it never reuses a closed one.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  // The whole request (headers and body) must arrive within two minutes, for every route.
  server.requestTimeout = 120_000;
  return server;
}
