// Captures every registered route as super_admin (dev mode on) in ES and EN at 390 and 1280 px,
// plus light/dark for key pages. Output: docs/screenshots/<code>/<code>.<lang>.<width>[.dark].png
// Usage: npm run screenshots [-- --smoke]   (--smoke: 1280/es only, no files, just console errors)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SMOKE = process.argv.includes('--smoke');
const PORT = 4173;
const BASE = `http://localhost:${PORT}/#`;
const KEY_PAGES = new Set(['HUB-01', 'W-01', 'C-01', 'M-03', 'D-02']);
const PARAMS = { ':table': 'class_sessions', ':pageCode': 'C-01', ':id': 'ses_demo', ':kind': 'terms' };

function findChromium() {
  const root = '/opt/pw-browsers';
  try {
    const dir = readdirSync(root).find((d) => /^chromium-\d+/.test(d));
    if (dir) return `${root}/${dir}/chrome-linux/chrome`;
  } catch { /* fall through */ }
  return process.env.CHROMIUM_PATH;
}

// Route list: parse module index files (paths + spec codes) without importing TS.
function routes() {
  const out = [];
  const specCodes = JSON.parse(readFileSync(new URL('../reference/canvas/specs.json', import.meta.url), 'utf8'));
  for (const mod of readdirSync(new URL('../src/modules', import.meta.url))) {
    let src;
    try { src = readFileSync(new URL(`../src/modules/${mod}/index.ts`, import.meta.url), 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/path:\s*'([^']+)'[^\n]*?(?:spec:\s*canvasSpecs\['([^']+)'\]|spec:\s*(\w+))/g)) {
      const path = m[1];
      let code = m[2] ?? m[3] ?? 'UNKNOWN';
      if (!specCodes[code] && !m[2]) code = ({ hubSpec: 'HUB-01', noAccessSpec: 'E-05', docsSpec: 'K-02', manualSpec: 'K-03', specsIndexSpec: 'D-03', layoutEditorSpec: 'D-04' })[code] ?? codeFromSite(src, code) ?? code;
      out.push({ path, code });
    }
    for (const m of src.matchAll(/stub\('([^']+)',\s*'([^']+)'/g)) out.push({ path: m[1], code: m[2] });
  }
  return out.filter((r, i, a) => a.findIndex((x) => x.path === r.path) === i && !r.path.includes('*'));
}
function codeFromSite(src, name) {
  // siteSpecs.home → W-01 etc.
  const map = { 'siteSpecs.home': 'W-01', 'siteSpecs.about': 'W-02', 'siteSpecs.modalities': 'W-03', 'siteSpecs.schedule': 'W-04', 'siteSpecs.teachers': 'W-05', 'siteSpecs.contact': 'W-06' };
  return map[name] ?? (src.includes(name) ? undefined : undefined);
}

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
  console.log(`${list.length} routes · chromium ${exe}`);
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
            const dir = new URL(`../docs/screenshots/${code.replace(/[^\w-]/g, '_')}/`, import.meta.url);
            mkdirSync(dir, { recursive: true });
            const file = `${code.replace(/[^\w-]/g, '_')}.${lang}.${width}${theme === 'dark' ? '.dark' : ''}.png`;
            await page.screenshot({ path: new URL(file, dir).pathname, fullPage: width >= 600 });
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
  if (!SMOKE) writeFileSync(new URL('../docs/screenshots/README.md', import.meta.url), `# Screenshots\n\nGenerated by \`npm run screenshots\` on ${new Date().toISOString().slice(0, 10)}. One folder per page code; file name \`<code>.<lang>.<width>[.dark].png\`.\n\n${list.map((r) => `- \`${r.code}\` — \`#${r.path}\``).join('\n')}\n`);
  if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log(`  ${p.path} [${p.lang}/${p.width}/${p.theme}]`, p.errors.join(' | ')); }
  else console.log('\nno console errors');
  process.exit(problems.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
