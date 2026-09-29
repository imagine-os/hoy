// Spacing audit (0037) — the measuring half of .claude/skills/ui-spacing/SKILL.md.
// Opens a route in the built app (vite preview of dist/, so run `npm run build` first), then for each width:
//   · lists the vertical gaps between visible sibling blocks inside <main> (the page rhythm) and flags any gap
//     that is not on the 4 px grid, or that differs between siblings of the same parent,
//   · lists the inner padding of every card (.card, .surf2, .listgroup-body) and flags unequal sides,
//   · lists interactive targets smaller than 44 × 44 px (inline text links excepted),
//   · with --grid, saves <out>/<slug>-<width>-grid.jpg with a 4 px / 16 px grid drawn over the page.
// All measurements are divided by the page's --ui factor, so a 3840 capture reports base-size px.
// Usage: node scripts/spacing-audit.mjs --route=/app [--as=usr_cust] [--widths=390,1280] [--grid] [--all] [--out=dir]
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROUTE = arg('route', '/app');
const AS = arg('as', ROUTE.startsWith('/site') ? 'usr_public' : ROUTE.startsWith('/app') ? 'usr_cust' : ROUTE.startsWith('/staff') ? 'usr_desk' : ROUTE.startsWith('/admin') ? 'usr_admin' : 'usr_super');
const WIDTHS = arg('widths', '390,1280').split(',').map(Number);
const GRID = process.argv.includes('--grid');
const ALL = process.argv.includes('--all'); // print every stacked parent, not only the uneven or off-grid ones
const OUT = arg('out', 'spacing-audit');
const PORT = 4174;

function findChromium() {
  try { const d = readdirSync('/opt/pw-browsers').find((x) => /^chromium-\d+/.test(x)); if (d) return `/opt/pw-browsers/${d}/chrome-linux/chrome`; } catch { /* env */ }
  return process.env.CHROMIUM_PATH;
}

const server = spawn(process.execPath, [new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => { server.stdout.on('data', (d) => { if (String(d).includes('Local')) r(); }); setTimeout(r, 4000); });
const browser = await chromium.launch({ executablePath: findChromium() });
try {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : width >= 1920 ? Math.round(width * 9 / 16) : 800 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((uid) => {
      localStorage.setItem('hoyos.lang', 'es');
      localStorage.setItem('hoyos.session', JSON.stringify({ userId: uid, devMode: false, viewAs: null }));
    }, AS);
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await page.goto(`http://localhost:${PORT}/#${ROUTE}`, { waitUntil: 'load' });
    await page.waitForSelector('#root > *');
    await page.waitForTimeout(500);
    const report = await page.evaluate((all) => {
      const ui = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
      const px = (n) => Math.round((n / ui) * 10) / 10;
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.position !== 'absolute' && cs.position !== 'fixed'; };
      const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
      const main = document.querySelector('main') ?? document.body;
      const gaps = [];
      for (const parent of [main, ...main.querySelectorAll('*')]) {
        if (parent.closest('svg')) continue;
        const kids = [...parent.children].filter(visible);
        if (kids.length < 2) continue;
        const cs = getComputedStyle(parent);
        const column = cs.display.includes('flex') ? cs.flexDirection.startsWith('column') : cs.display.includes('grid') ? true : cs.display === 'block';
        if (!column) continue;
        const list = [];
        for (let i = 1; i < kids.length; i++) {
          const a = kids[i - 1].getBoundingClientRect(); const b = kids[i].getBoundingClientRect();
          if (b.top < a.bottom - 1 || Math.abs(b.left - a.left) > 2) continue; // not stacked in one column
          list.push(px(b.top - a.bottom));
        }
        if (list.length) gaps.push({ parent: name(parent), gaps: list, uneven: new Set(list).size > 1, offGrid: list.filter((g) => g > 2 && g % 4 !== 0) });
      }
      const cards = [...document.querySelectorAll('.card, .surf2, .listgroup-body')].filter(visible).map((el) => {
        const cs = getComputedStyle(el);
        const p = ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(parseFloat(cs[`padding${s}`])));
        return { card: name(el), padding: p, equal: new Set(p).size === 1 };
      });
      const small = [...document.querySelectorAll('button, a[href], input, select, [role="button"], [role="tab"]')].filter((el) => {
        if (!visible(el)) return false;
        const r = el.getBoundingClientRect();
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
        return !inline && (r.width / ui < 43.5 || r.height / ui < 43.5);
      }).map((el) => { const r = el.getBoundingClientRect(); return `${name(el)} ${px(r.width)}×${px(r.height)}`; });
      return { ui, gaps: all ? gaps : gaps.filter((g) => g.uneven || g.offGrid.length), cards: all ? cards : cards.filter((c) => !c.equal), small };
    }, ALL);
    console.log(`\n== ${ROUTE} @ ${width}px (ui ${report.ui})`);
    for (const g of report.gaps) console.log(`  gap   ${g.parent}: ${g.gaps.join(' · ')}${g.offGrid.length ? '  ← off the 4 px grid' : ''}`);
    for (const c of report.cards) console.log(`  pad   ${c.card}: ${c.padding.join(' ')}${c.equal ? '' : '  ← unequal'}`);
    for (const s of report.small) console.log(`  size  ${s}  ← under 44 px`);
    if (!report.gaps.length && !report.cards.length && !report.small.length) console.log('  clean');
    if (GRID) {
      mkdirSync(OUT, { recursive: true });
      await page.addStyleTag({ content: 'body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:99999;background-image:linear-gradient(rgba(255,0,80,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,80,.35) 1px,transparent 1px),linear-gradient(rgba(255,0,80,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,80,.12) 1px,transparent 1px);background-size:calc(1rem) calc(1rem),calc(1rem) calc(1rem),calc(.25rem) calc(.25rem),calc(.25rem) calc(.25rem)}' });
      await page.screenshot({ path: `${OUT}/${ROUTE.replace(/\W+/g, '_')}-${width}-grid.jpg`, type: 'jpeg', quality: 70 });
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
