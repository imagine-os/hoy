// Captures every registered route as super_admin (dev mode on) in ES and EN at 390 and 1280 px,
// plus light/dark for key pages. Output: docs/screenshots/<code>/<lang>-<width>[-dark][-<label>].png
// Usage: npm run screenshots [-- --smoke] [-- --only=/docs,/manual] [-- --label=before|after]
//   --smoke        1280/es only, no files, just console errors (exit 1 when anything throws)
//   --only=a,b     only routes whose path starts with one of the prefixes
//   --label=before writes <lang>-<width>[-dark]-before.png next to the current capture (before/after pairs
//                  for visual changes; see docs/rules/documentation.md)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const SMOKE = args.includes('--smoke');
const ONLY = (args.find((a) => a.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean);
const LABEL = args.find((a) => a.startsWith('--label='))?.slice(8) ?? '';
const PORT = 4173;
const BASE = `http://localhost:${PORT}/#`;
const KEY_PAGES = new Set(['HUB-01', 'W-01', 'C-01', 'S-02', 'M-01', 'M-03', 'D-02', 'K-03']);
const PARAMS = { ':table': 'class_sessions', ':pageCode': 'C-01', ':id': 'ses_demo', ':kind': 'terms', ':chapter': '03-recepcion', ':code': 'C-01' };
export const fileName = (lang, width, theme, label = '') => `${lang}-${width}${theme === 'dark' ? '-dark' : ''}${label ? `-${label}` : ''}.png`;

function findChromium() {
  const root = '/opt/pw-browsers';
  try {
    const dir = readdirSync(root).find((d) => /^chromium-\d+/.test(d));
    if (dir) return `${root}/${dir}/chrome-linux/chrome`;
  } catch { /* fall through */ }
  return process.env.CHROMIUM_PATH;
}

// Spec constant name → code, from every src/modules/*/specs.ts (defineSpec({ code: 'X' })).
function namedSpecs() {
  const map = { 'siteSpecs.home': 'W-01', 'siteSpecs.about': 'W-02', 'siteSpecs.modalities': 'W-03', 'siteSpecs.schedule': 'W-04', 'siteSpecs.teachers': 'W-05', 'siteSpecs.contact': 'W-06' };
  for (const mod of readdirSync(new URL('../src/modules', import.meta.url))) {
    let src;
    try { src = readFileSync(new URL(`../src/modules/${mod}/specs.ts`, import.meta.url), 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/export const (\w+)\s*=\s*defineSpec\(\{\s*code:\s*'([^']+)'/g)) map[m[1]] = m[2];
    for (const m of src.matchAll(/(\w+):\s*defineSpec\(\{\s*code:\s*'([^']+)'/g)) map[m[1]] = m[2];
  }
  return map;
}

// Route list: parse module index files (paths + spec codes) without importing TS.
export function routes() {
  const out = [];
  const specCodes = JSON.parse(readFileSync(new URL('../reference/canvas/specs.json', import.meta.url), 'utf8'));
  const named = namedSpecs();
  for (const mod of readdirSync(new URL('../src/modules', import.meta.url))) {
    let src;
    try { src = readFileSync(new URL(`../src/modules/${mod}/index.ts`, import.meta.url), 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/path:\s*'([^']+)'[^\n]*?(?:spec:\s*canvasSpecs\['([^']+)'\]|spec:\s*([\w.]+))/g)) {
      const path = m[1];
      let code = m[2] ?? m[3] ?? 'UNKNOWN';
      if (!specCodes[code] && !m[2]) code = named[code] ?? code;
      out.push({ path, code });
    }
    for (const m of src.matchAll(/stub\('([^']+)',\s*'([^']+)'/g)) out.push({ path: m[1], code: m[2] });
  }
  return out
    .filter((r, i, a) => a.findIndex((x) => x.path === r.path) === i && !r.path.includes('*'))
    .filter((r) => !ONLY.length || ONLY.some((p) => r.path === p || r.path.startsWith(p.endsWith('/') ? p : `${p}/`) || r.path === p.replace(/\/$/, '')));
}

const safe = (code) => code.replace(/[^\w-]/g, '_');

async function main() {
  const server = spawn(process.execPath, [new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
  await new Promise((r) => setTimeout(r, 2500));
  const exe = findChromium();
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const NOISE = /Failed to load resource|ERR_CERT|fonts\.g(oogleapis|static)|net::/;
  const list = routes();
  const problems = [];
  const langs = SMOKE ? ['es'] : ['es', 'en'];
  const widths = SMOKE ? [1280] : [390, 1280];
  console.log(`${list.length} routes · chromium ${exe}${ONLY.length ? ` · only ${ONLY.join(',')}` : ''}${LABEL ? ` · label ${LABEL}` : ''}`);
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
            await page.screenshot({ path: new URL(fileName(lang, width, theme, LABEL), dir).pathname, fullPage: width >= 600 });
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
    writeFileSync(new URL('../docs/screenshots/README.md', import.meta.url), `# Screenshots\n\nGenerated by \`npm run screenshots\` on ${new Date().toISOString().slice(0, 10)}. One folder per page code; file name \`<lang>-<width>[-dark][-<label>].png\` (e.g. \`es-390.png\`, \`en-1280-dark.png\`, \`es-1280-before.png\`). Browse them at \`/#/docs/screenshots\`; reference them from \`docs/pages/<code>.md\` and the changelog entry.\n\n| Code | Route |\n| --- | --- |\n${list.map((r) => `| \`${r.code}\` | \`#${r.path}\` |`).join('\n')}\n`);
  }
  if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log(`  ${p.path} [${p.lang}/${p.width}/${p.theme}]`, p.errors.join(' | ')); }
  else console.log('\nno console errors');
  process.exit(problems.length ? 1 : 0);
}
// Only run when executed directly (gen-page-doc.mjs imports routes() from here).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
