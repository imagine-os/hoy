// Shared harness for the H-8 launch-row tests (test-launch-*.mjs): serves the built dist/ on 127.0.0.1, opens
// Chromium with external requests blocked, and seeds the browser-local mock (session, language, launch settings).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright-core';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const BROWSERS = [process.env.CHROMIUM_PATH, process.env.BROWSER_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);

export async function serveDist(port, dir = 'dist') {
  const dist = resolve(dir);
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('dist/ is missing: run npm run build first');
  const server = createServer(async (req, res) => {
    try {
      let file = resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname));
      if (file !== dist && !file.startsWith(dist + sep)) { res.writeHead(403); res.end(); return; }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

export async function launchBrowser() {
  const executablePath = BROWSERS.find((p) => existsSync(p));
  return chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

/** A context with one user, one language and optional launch settings (`localStorage['hoyos.launch']`). */
export async function newContext(browser, { userId = 'usr_public', lang = 'es', launch = null, width = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => r.abort());
  await ctx.addInitScript(({ userId, lang, launch }) => {
    if (sessionStorage.getItem('launch-qa-init')) return;
    sessionStorage.setItem('launch-qa-init', '1');
    localStorage.setItem('hoyos.lang', lang);
    localStorage.setItem('hoyos.session', JSON.stringify({ userId, devMode: false, viewAs: null }));
    localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'light', skin: 'styled' }));
    if (launch) localStorage.setItem('hoyos.launch', JSON.stringify(launch)); else localStorage.removeItem('hoyos.launch');
  }, { userId, lang, launch });
  return ctx;
}

export function reporter(name) {
  let failed = 0;
  const check = (label, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
  const done = () => { console.log(failed ? `\n${failed} ${name} check(s) failed` : `\n${name} passed`); process.exitCode = failed ? 1 : 0; };
  return { check, done };
}
