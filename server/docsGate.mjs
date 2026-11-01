// The Hub's docs behind the server (Hoy test-fixes lane Y6; owner 2026-11-01: "Gate on the server first").
// The production build keeps the manual, the docs, the kanban, the changelog and the owner's source documents out of the
// public bundle (dist/) and writes them to `<dist>-private/` (vite.config.ts `privateDocsPack`): `docs.json` (every
// markdown body with its index and its images) and `source/<file>` (the PDFs and their covers). The static server never
// serves that folder. This answers `GET /private-docs/<file>` only for a request whose bearer is a valid Clerk session
// (clerk.mjs) AND whose Company OS `GET /t/<tenant>/me`, asked with that same token, says the person works as Super admin:
// `isSuperAdmin: true` without the `administrator` role key (an AD-04 Administration login also holds the tenant
// super_admin membership; src/auth/companyOsIdentity.ts `isSuperAdminMe` is the same rule). Cookies and client headers
// are never read, and Y2's stale-session fallback to the public read identity never applies here.
// Order: method, session, /me, then the file, so nothing about the files is learnt without a super admin session.
// Every answer is `Cache-Control: private, no-store` with `Vary: Authorization`.
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { extname, join, resolve } from 'node:path';
import { createGzip } from 'node:zlib';

export const DOCS_PREFIX = '/private-docs';
/** The only files served: the pack itself, and the flat files of `source/` with a plain lowercase name. */
const SOURCE_NAME = /^[a-z0-9][a-z0-9-]*\.(pdf|jpg|jpeg|png|webp)$/;
const TYPES = { '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const ME_ANSWER_LIMIT = 64 * 1024;
const PRIVATE = { 'Cache-Control': 'private, no-store', Vary: 'Authorization', 'Cross-Origin-Resource-Policy': 'same-origin' };

/** Where the production build puts the private pack for a given public dist folder. */
export const privateDocsDir = (distDir) => `${resolve(distDir).replace(/[/\\]+$/, '')}-private`;

/**
 * @param {{ distDir: string, companyOsUrl?: string, tenant: string, upstreamTimeoutMs?: number }} config
 * @param {{ verifySession: (token: string) => Promise<unknown>, fetchMe?: (token: string, req: import('node:http').IncomingMessage) => Promise<{ status: number, body: unknown }>, log?: (entry: object) => void }} deps
 * @returns {Promise<(req, res, rest: string) => Promise<string>>} answers one request (`rest` = the raw path after the prefix) and returns its outcome
 */
export async function createDocsGate(config, deps) {
  const dir = privateDocsDir(config.distDir);
  // The servable files, listed once at start: a request path is looked up in this map as written (never decoded or
  // resolved), so `..`, encodings, absolute paths, nested or hidden files can't name anything else.
  const files = new Map();
  if ((await stat(join(dir, 'docs.json')).catch(() => null))?.isFile()) files.set('/docs.json', join(dir, 'docs.json'));
  for (const entry of await readdir(join(dir, 'source'), { withFileTypes: true }).catch(() => [])) {
    if (entry.isFile() && SOURCE_NAME.test(entry.name)) files.set(`/source/${entry.name}`, join(dir, 'source', entry.name));
  }
  const fetchMe = deps.fetchMe ?? ((token, req) => askMe(config, token, req));
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)));

  return async function docsGate(req, res, rest) {
    const started = Date.now();
    const outcome = await answer(req, res, rest);
    const file = outcome === 'served' ? rest.slice(1) : undefined;
    log({ event: 'docs', outcome, status: res.statusCode, ms: Date.now() - started, ...(file ? { file } : {}) });
    return outcome;
  };

  async function answer(req, res, rest) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return refuse(res, 405, 'method_not_allowed');
    }
    if (Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined) return refuse(res, 400, 'body_not_allowed');
    const token = bearer(req.headers.authorization);
    if (!token) return refuse(res, 401, 'unauthorized');
    try {
      await deps.verifySession(token);
    } catch {
      return refuse(res, 401, 'unauthorized');
    }
    let me;
    try {
      me = await fetchMe(token, req);
    } catch {
      return refuse(res, 502, 'upstream_unavailable', 'me_unavailable');
    }
    if (me.status === 401) return refuse(res, 401, 'unauthorized');
    if (me.status === 403 || me.status === 404) return refuse(res, 403, 'forbidden', 'not_super_admin');
    if (me.status !== 200 || !isMe(me.body)) return refuse(res, 502, 'upstream_unavailable', 'me_unavailable');
    if (!worksAsSuperAdmin(me.body)) return refuse(res, 403, 'forbidden', 'not_super_admin');

    const path = files.get(rest);
    const info = path ? await stat(path).catch(() => null) : null;
    if (!path || !info?.isFile()) return refuse(res, 404, 'not_found');
    const ext = extname(path).toLowerCase();
    const headers = { ...PRIVATE, 'Content-Type': TYPES[ext], 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; sandbox" };
    const gzip = ext === '.json' && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
    if (gzip) headers['Content-Encoding'] = 'gzip';
    else headers['Content-Length'] = info.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return 'served'; }
    await new Promise((done) => {
      const stream = gzip ? createReadStream(path).pipe(createGzip()) : createReadStream(path);
      stream.on('error', () => { res.destroy(); done(); });
      res.on('close', () => { stream.destroy(); done(); });
      stream.pipe(res);
    });
    return 'served';
  }
}

/** The person works as Super admin: `/me` says `isSuperAdmin` (strictly true) and they are not an AD-04 Administration. */
export function worksAsSuperAdmin(me) {
  return me.isSuperAdmin === true && !me.roleKeys.includes('administrator');
}

const isMe = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.roleKeys) && !!v.user && typeof v.user === 'object';

function refuse(res, status, error, outcome = error) {
  const body = JSON.stringify({ error });
  res.writeHead(status, { ...PRIVATE, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
  return outcome;
}

/** `Bearer <token>` → token; anything else (no header, another scheme, an empty token) → null. */
function bearer(value) {
  const v = Array.isArray(value) ? value[0] : value;
  const m = /^Bearer ([A-Za-z0-9._~+/=-]+)$/i.exec(String(v ?? '').trim());
  return m ? m[1] : null;
}

/** Company OS `GET /t/<tenant>/me` with the user's own token, on the private network; resolves `{ status, body }`. */
function askMe(config, token, req) {
  return new Promise((done, fail) => {
    const url = new URL(`${config.companyOsUrl.replace(/\/+$/, '')}/t/${config.tenant}/me`);
    const client = url.protocol === 'https:' ? https : http;
    const ip = String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '');
    const headers = { accept: 'application/json', authorization: `Bearer ${token}`, 'x-forwarded-for': ip, 'x-real-ip': ip };
    const call = client.request(url, { method: 'GET', headers, timeout: config.upstreamTimeoutMs ?? 30_000 }, (answer) => {
      const chunks = [];
      let size = 0;
      answer.on('data', (c) => { size += c.length; if (size > ME_ANSWER_LIMIT) answer.destroy(new Error('me answer too large')); else chunks.push(c); });
      answer.on('end', () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* not JSON: not a /me answer */ }
        done({ status: answer.statusCode ?? 502, body });
      });
      answer.on('error', fail);
    });
    call.on('timeout', () => call.destroy(new Error('me timeout')));
    call.on('error', fail);
    call.end();
  });
}
