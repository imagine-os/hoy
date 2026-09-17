// Captures every registered route as super_admin (dev mode on) in ES and EN at 390 and 1280 px,
// plus light/dark for key pages. Output: docs/screenshots/<code>/<lang>-<width>[-dark][-<label>].jpg
// Usage: npm run screenshots [-- --smoke] [-- --only=/docs,/manual] [-- --label=before|after] [-- --quality=72]
//   --smoke        1280/es only, no files, just console errors (exit 1 when anything throws)
//   --only=a,b     only routes whose path starts with one of the prefixes
//   --label=before writes <lang>-<width>[-dark]-before.jpg next to the current capture (before/after pairs
//                  for visual changes; see docs/rules/documentation.md)
//   --quality=N    JPEG quality (default 72). JPEG keeps the repo and the Pages bundle small; PNG was ~3× larger.
//
// The route list is NOT parsed from TypeScript: the built app publishes window.__hoyos.routes
// (src/app/manifest.ts) with each route's real spec.code, and this script reads it from the preview
// server, then saves it to docs/screenshots/routes.json for scripts/gen-page-doc.mjs.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const SMOKE = args.includes('--smoke');
const ONLY = (args.find((a) => a.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean);
const LABEL = args.find((a) => a.startsWith('--label='))?.slice(8) ?? '';
const QUALITY = Number(args.find((a) => a.startsWith('--quality='))?.slice(10) ?? 72);
const PORT = 4173;
const BASE = `http://localhost:${PORT}/#`;
export const KEY_PAGES = new Set(['HUB-01', 'W-01', 'C-01', 'S-02', 'M-01', 'M-03', 'D-02', 'K-03']);
const PARAMS = { ':table': 'class_sessions', ':pageCode': 'C-01', ':id': 'ses_demo', ':kind': 'terms', ':chapter': '03-recepcion', ':code': 'C-01' };
export const EXT = 'jpg';
export const fileName = (lang, width, theme, label = '') => `${lang}-${width}${theme === 'dark' ? '-dark' : ''}${label ? `-${label}` : ''}.${EXT}`;
export const MANIFEST = new URL('../docs/screenshots/routes.json', import.meta.url);
export const safe = (code) => code.replace(/[^\w-]/g, '_');

function findChromium() {
  const root = '/opt/pw-browsers';
  try {
    const dir = readdirSync(root).find((d) => /^chromium-\d+/.test(d));
    if (dir) return `${root}/${dir}/chrome-linux/chrome`;
  } catch { /* fall through */ }
  return process.env.CHROMIUM_PATH;
}

/** The last manifest written by a screenshot run (path, code, surface, status, spec). */
export function readManifest() {
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return null; }
}

/** Reads window.__hoyos.routes from the running preview. */
async function fetchManifest(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__hoyos?.routes?.length > 0, null, { timeout: 15000 });
  const routes = await page.evaluate(() => window.__hoyos.routes);
  await ctx.close();
  return routes.filter((r, i, a) => a.findIndex((x) => x.path === r.path) === i && !r.path.includes('*'));
}

const inOnly = (r) => !ONLY.length || ONLY.some((p) => r.path === p || r.path.startsWith(p.endsWith('/') ? p : `${p}/`) || r.path === p.replace(/\/$/, ''));

async function main() {
  const server = spawn(process.execPath, [new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
  await new Promise((r) => setTimeout(r, 2500));
  const exe = findChromium();
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const NOISE = /Failed to load resource|ERR_CERT|fonts\.g(oogleapis|static)|net::/;
  const manifest = await fetchManifest(browser);
  mkdirSync(new URL('../docs/screenshots/', import.meta.url), { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  const list = manifest.filter(inOnly);
  const problems = [];
  const langs = SMOKE ? ['es'] : ['es', 'en'];
  const widths = SMOKE ? [1280] : [390, 1280];
  console.log(`${list.length} routes · chromium ${exe}${ONLY.length ? ` · only ${ONLY.join(',')}` : ''}${LABEL ? ` · label ${LABEL}` : ''}${SMOKE ? ' · smoke' : ` · jpeg q${QUALITY}`}`);
  for (const { path, code } of list) {
    const url = path.replace(/:\w+/g, (p) => PARAMS[p] ?? 'x');
    for (const lang of langs) for (const width of widths) {
      const themes = !SMOKE && KEY_PAGES.has(code) ? ['light', 'dark'] : ['light'];
      for (const theme of themes) {
        const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 800 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
        await ctx.addInitScript(([l, th]) => {
          localStorage.setItem('hoyos.lang', l);
          localStorage.setItem('hoyos.theme', JSON.stringify({ theme: th, skin: 'styled' }));
          localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_super', devMode: true, viewAs: null }));
        }, [lang, theme]);
        const page = await ctx.newPage();
        await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort()); // offline-safe: no fonts/CDNs through the proxy
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text()); });
        try {
          await page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 15000 });
          await page.waitForSelector('#root > *', { timeout: 8000 });
          await page.waitForTimeout(350);
          if (!SMOKE) {
            const dir = new URL(`../docs/screenshots/${safe(code)}/`, import.meta.url);
            mkdirSync(dir, { recursive: true });
            await page.screenshot({ path: new URL(fileName(lang, width, theme, LABEL), dir).pathname, fullPage: width >= 600, type: 'jpeg', quality: QUALITY });
          }
        } catch (e) { errors.push(String(e.message)); }
        if (errors.length) problems.push({ path, lang, width, theme, errors: [...new Set(errors)].slice(0, 3) });
        await ctx.close();
      }
    }
    process.stdout.write(`${code.padEnd(12)} ${path}\n`);
  }
  await browser.close();
  server.kill();
  if (!SMOKE && !ONLY.length && !LABEL) {
    writeFileSync(new URL('../docs/screenshots/README.md', import.meta.url), `# Screenshots\n\nGenerated by \`npm run screenshots\` on ${new Date().toISOString().slice(0, 10)} (JPEG, quality ${QUALITY}). One folder per page code; file name \`<lang>-<width>[-dark][-<label>].${EXT}\` (e.g. \`es-390.${EXT}\`, \`en-1280-dark.${EXT}\`, \`es-1280-before.${EXT}\`). \`routes.json\` is the route manifest the app published (\`window.__hoyos.routes\`) when the pass ran. Browse them at \`/#/docs/screenshots\`; reference them from \`docs/pages/<code>.md\` and the changelog entry.\n\n| Code | Route | Status |\n| --- | --- | --- |\n${list.map((r) => `| \`${r.code}\` | \`#${r.path}\` | ${r.status} |`).join('\n')}\n`);
  }
  if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log(`  ${p.path} [${p.lang}/${p.width}/${p.theme}]`, p.errors.join(' | ')); }
  else console.log('\nno console errors');
  process.exit(problems.length ? 1 : 0);
}
// Only run when executed directly (gen-page-doc.mjs imports helpers from here).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
