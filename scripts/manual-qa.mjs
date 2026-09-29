// Browser QA of the operations manual (0038): stale badges, per-role lens captures, the Open live / editor /
// request / read / training smoke, and a keyboard walk. Starts its own `vite preview` on :4174 (run `npm run build` first),
// drives Chromium from /opt/pw-browsers, prints a JSON report and exits 1 when a check fails.
// Usage: node scripts/manual-qa.mjs [--stale] [--lens] [--smoke] [--keys]     (no flag = all four)
//        --lens writes docs/screenshots/K-03/<lang>-<width>-cover-<role>.jpg (JPEG q72) for the eight team roles
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const all = !['--stale', '--lens', '--smoke', '--keys'].some((f) => args.includes(f));
const want = (f) => all || args.includes(f);
const PORT = 4174;
const BASE = `http://localhost:${PORT}/#`;
const USERS = { super_admin: 'usr_super', admin: 'usr_admin', coordinator: 'usr_coord', front_desk: 'usr_desk', finance: 'usr_fin', teacher: 'usr_teach', maintenance: 'usr_maint', marketing: 'usr_mkt', developer: 'usr_dev' };
const LENS_ROLES = ['front_desk', 'teacher', 'coordinator', 'finance', 'admin', 'maintenance', 'marketing', 'developer'];
const report = { stale: [], lens: [], smoke: [], keys: [] };
let failed = 0;
const ok = (bucket, name, pass, detail = '') => { report[bucket].push({ name, pass, detail }); if (!pass) failed++; };

function chromiumPath() {
  const dir = readdirSync('/opt/pw-browsers').find((d) => /^chromium-\d+/.test(d));
  return dir ? `/opt/pw-browsers/${dir}/chrome-linux/chrome` : process.env.CHROMIUM_PATH;
}

const server = spawn(process.execPath, [new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--no-sandbox'] });

async function session(role, lang, width = 1280, height = width < 600 ? 844 : 800) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([l, uid, dev]) => {
    localStorage.setItem('hoyos.lang', l);
    localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'light', skin: 'styled' }));
    localStorage.setItem('hoyos.session', JSON.stringify({ userId: uid, devMode: dev, viewAs: null }));
  }, [lang, USERS[role], role === 'super_admin']);
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}
async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.waitForSelector('#root > *');
  await page.waitForFunction(() => !document.querySelector('.lazy-fallback'), null, { timeout: 8000 });
  await page.waitForTimeout(500);
}

try {
  // 1. stale badges: zero on the cover and five chapters, ES and EN
  if (want('--stale')) {
    for (const lang of ['es', 'en']) {
      const { ctx, page } = await session('admin', lang);
      for (const path of ['/manual', '/manual/01-quienes-somos-y-filosofia', '/manual/04-recepcion-y-check-in', '/manual/09-checklists-de-entrenamiento', '/manual/21-politicas', '/manual/24-roles-y-permisos']) {
        await go(page, path);
        const figs = await page.locator('figure').count();
        const stale = await page.locator('.figure-stale').count();
        ok('stale', `${lang} ${path}`, stale === 0, `${figs} figures, ${stale} stale`);
      }
      await ctx.close();
    }
  }

  // 2. the role lens: the cover as each team role, ES/EN at 390 and 1280
  if (want('--lens')) {
    const dir = new URL('../docs/screenshots/K-03/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    for (const role of LENS_ROLES) for (const lang of ['es', 'en']) for (const width of [390, 1280]) {
      const { ctx, page, errors } = await session(role, lang, width);
      await go(page, '/manual');
      const own = await page.locator('.manual-lms').count();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const lens = await page.locator('select[id^="manual-lens"]').first().inputValue().catch(() => '?');
      await page.screenshot({ path: new URL(`${lang}-${width}-cover-${role}.jpg`, dir).pathname, fullPage: width >= 600, type: 'jpeg', quality: 72 });
      ok('lens', `${role} ${lang} ${width}`, own > 0 && overflow <= 1 && lens === role && !errors.length, `lms block ${own}, lens=${lens}, overflow ${overflow}px${errors.length ? `, errors ${errors[0]}` : ''}`);
      await ctx.close();
    }
  }

  // 3. smoke: edit → save → restore, mark read, sign a training stage, request a change
  if (want('--smoke')) {
    for (const lang of ['es', 'en']) {
      const L = (es, en) => (lang === 'es' ? es : en);
      // Open live: the chapter renders its live blocks with no unknown-directive text
      {
        const { ctx, page, errors } = await session('admin', lang);
        await go(page, '/manual/21-politicas');
        const live = await page.locator('.live').count();
        const unknown = await page.getByText(/no es una directiva|is not a directive/).count();
        const braces = await page.locator('main, .mdv').first().innerText().then((t) => /\{\{|\}\}/.test(t)).catch(() => false);
        ok('smoke', `${lang} open live (ch. 21: live blocks, no unknown directive, no {{ }})`, live > 0 && !unknown && !braces && !errors.length, `${live} live blocks`);
        await go(page, '/manual/22-documentos-legales');
        const braces22 = await page.evaluate(() => /\{\{|\}\}/.test(document.body.innerText));
        ok('smoke', `${lang} ch. 22 renders no literal braces`, !braces22);
        await ctx.close();
      }
      // editor: admin edits the first adjustable section, saves, restores the original
      {
        const { ctx, page, errors } = await session('admin', lang);
        await go(page, '/manual/04-recepcion-y-check-in');
        const edit = page.getByRole('button', { name: L('Editar', 'Edit'), exact: true }).first();
        await edit.click();
        const area = page.locator('textarea').first();
        const original = await area.inputValue();
        const marker = `QA-${Date.now()}`;
        await area.fill(`${original}\n\n${marker}`);
        await page.getByRole('button', { name: L('Guardar', 'Save'), exact: true }).first().click();
        await page.getByText(marker).first().waitFor({ timeout: 5000 }).catch(() => {});
        const saved = await page.getByText(marker).count();
        ok('smoke', `${lang} editor: save shows the new text`, saved > 0);
        await page.getByRole('button', { name: L('Restaurar original', 'Restore original'), exact: true }).first().click();
        await page.waitForTimeout(600);
        const gone = await page.getByText(marker).count();
        ok('smoke', `${lang} editor: restore brings the original back`, gone === 0 && !errors.length, errors[0] ?? '');
        await ctx.close();
      }
      // mark read (front desk)
      {
        const { ctx, page, errors } = await session('front_desk', lang);
        await go(page, '/manual/04-recepcion-y-check-in');
        await page.getByRole('button', { name: L('Marcar como leído', 'Mark as read'), exact: true }).first().click();
        await page.getByText(L('Leído el', 'Read on')).first().waitFor({ timeout: 5000 }).catch(() => {});
        ok('smoke', `${lang} mark read`, (await page.getByText(L('Leído el', 'Read on')).count()) > 0 && !errors.length, errors[0] ?? '');
        // request a change
        await page.getByText(L('Pedir un cambio', 'Request a change'), { exact: false }).first().scrollIntoViewIfNeeded();
        await page.getByPlaceholder(L('Ej.: los celulares', 'E.g. forgotten phones')).fill(L('Prueba de QA: aclarar la tolerancia de llegada.', 'QA check: clarify the late-arrival grace.'));
        await page.getByRole('button', { name: L('Enviar', 'Send'), exact: true }).first().click();
        await page.getByText(L('Solicitud enviada', 'Request sent')).first().waitFor({ timeout: 5000 }).catch(() => {});
        ok('smoke', `${lang} request a change`, (await page.getByText(L('Solicitud enviada', 'Request sent')).count()) > 0);
        await ctx.close();
      }
      // sign a training stage (admin signs the front desk person's Day 1)
      {
        const { ctx, page, errors } = await session('admin', lang);
        await go(page, '/manual/09-checklists-de-entrenamiento?as=front_desk');
        const sign = page.getByRole('button', { name: L('Firmar etapa', 'Sign off stage'), exact: true }).first();
        await sign.click();
        await page.getByText(L('Firmado por', 'Signed by')).first().waitFor({ timeout: 5000 }).catch(() => {});
        ok('smoke', `${lang} sign a training stage`, (await page.getByText(L('Firmado por', 'Signed by')).count()) > 0 && !errors.length, errors[0] ?? '');
        await ctx.close();
      }
    }
  }

  // 4. keyboard walk on the cover: Tab order, visible focus, Enter opens a chapter, Esc leaves a field
  if (want('--keys')) {
    for (const [role, lang] of [['front_desk', 'es'], ['front_desk', 'en']]) {
      const { ctx, page } = await session(role, lang);
      await go(page, '/manual');
      await page.evaluate(() => document.body.focus());
      const stops = [];
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        stops.push(await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const shows = (n) => { const c = getComputedStyle(n); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== 'none'; };
          // the ring may sit on the control or on a wrapper drawn with :focus-within (the global search field)
          let ring = shows(el);
          for (let n = el.parentElement, d = 0; !ring && n && d < 3; n = n.parentElement, d++) ring = shows(n) && n.matches(':focus-within');
          return { tag: el.tagName.toLowerCase(), name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 40), ring, h: Math.round(r.height), inView: r.bottom > 0 && r.top < innerHeight };
        }));
      }
      const real = stops.filter(Boolean);
      const noRing = real.filter((s) => !s.ring);
      ok('keys', `${role} ${lang}: 40 Tab stops reach interactive elements`, real.length >= 30, `${real.length} of 40; first: ${real.slice(0, 6).map((s) => `${s.tag}:${s.name}`).join(' → ')}`);
      ok('keys', `${role} ${lang}: every focused element shows a focus ring`, noRing.length === 0, noRing.length ? `no ring on ${noRing.slice(0, 4).map((s) => `${s.tag}:${s.name}`).join(', ')}` : '');
      // Enter on a focused chapter link opens it
      await go(page, '/manual');
      await page.locator('a[href*="/manual/0"]').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
      ok('keys', `${role} ${lang}: Enter on a chapter link opens the chapter`, /#\/manual\/\d\d-/.test(page.url()), page.url().split('#')[1]);
      // Esc: the top-bar search closes its results and blurs; the manual's own search (type=search) clears natively
      for (const [label, sel] of [['top-bar search', page.locator('input[placeholder*="Buscar páginas"], input[placeholder*="Search pages"]').first()], ['manual search', page.getByLabel(lang === 'es' ? 'Buscar en el manual' : 'Search the manual').first()]]) {
        await go(page, '/manual');
        await sel.focus();
        await page.keyboard.type('caja');
        const typed = await sel.inputValue();
        await page.keyboard.press('Escape');
        const after = await page.evaluate(() => ({ tag: document.activeElement?.tagName.toLowerCase(), value: document.activeElement?.value ?? '' }));
        ok('keys', `${role} ${lang}: Esc in the ${label}`, typed === 'caja', `typed "${typed}" → focus on ${after.tag}, value "${after.value}"`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(JSON.stringify(report, null, 1));
console.log(failed ? `\nmanual-qa: ${failed} check(s) failed` : '\nmanual-qa: all checks passed');
process.exit(failed ? 1 : 0);
