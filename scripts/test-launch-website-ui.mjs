// H-8 website rows in the built site (browser, fictional mock data, external requests blocked):
//  SW-02 prices follow the product master · SW-03 "Reserva tu clase" reaches the class picker that keeps the class
//  through sign-in (the full sign-in/sign-up return is test-customer-return-ui.mjs) · SW-04 WhatsApp buttons use the
//  number in Settings · SW-05 brand name and contact email from one source · SW-06 manual and docs behind sign-in ·
//  SW-08 Coming Soon at the root until the go-live setting flips. Then the production build (built here unless
//  QA_PROD_DIST is set) hides the review tools and ignores localStorage overrides.
// Run: npm run build && node scripts/test-launch-website-ui.mjs
import { execFileSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('website launch rows');
const srv = await serveDist(5322);
const browser = await launchBrowser();
const errors = [];
async function open(opts, path) {
  const ctx = await newContext(browser, opts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.clock.install({ time: new Date('2026-10-28T14:00:00Z') });
  await page.goto(`${srv.base}/#${path}`);
  return { ctx, page };
}
const route = (page) => new URL(page.url()).hash.slice(1);
const db = (page, fn, arg) => page.evaluate(([src, arg]) => {
  const stored = JSON.parse(localStorage.getItem('hoyos.db.v1'));
  new Function('db', 'arg', src)(stored.db, arg);
  localStorage.setItem('hoyos.db.v1', JSON.stringify(stored));
}, [fn, arg]).then(() => page.reload());

try {
  // ── SW-08 ──────────────────────────────────────────────────────────────────────────────────────────────────
  let { ctx, page } = await open({}, '/');
  await page.locator('.coming-soon').waitFor();
  check('SW-08 default: the root shows Coming Soon', route(page) === '/' && (await page.locator('.site-main').count()) === 0);
  await ctx.close();
  ({ ctx, page } = await open({ launch: { siteLive: true } }, '/'));
  await page.locator('.site-main').waitFor();
  check('SW-08 go-live setting on: the root opens the public website', route(page) === '/site');
  await page.goto(`${srv.base}/#/coming-soon`); await page.locator('.coming-soon').waitFor();
  check('SW-08 go-live on: /coming-soon keeps the pre-opening page as a preview', true);
  await ctx.close();
  ({ ctx, page } = await open({ launch: { siteLiveAt: '2026-10-29T00:00:00-05:00' } }, '/'));
  await page.locator('.coming-soon').waitFor();
  check('SW-08 dated go-live in the future: the root still shows Coming Soon', route(page) === '/');
  await ctx.close();
  ({ ctx, page } = await open({ launch: { siteLiveAt: '2026-10-28T00:00:00-05:00' } }, '/'));
  await page.locator('.site-main').waitFor();
  check('SW-08 dated go-live reached: the root opens the public website', route(page) === '/site');
  await ctx.close();

  // ── SW-06 ──────────────────────────────────────────────────────────────────────────────────────────────────
  for (const path of ['/manual', '/manual/decisions', '/docs', '/docs/changelog']) {
    ({ ctx, page } = await open({}, path));
    await page.waitForURL(/#\/auth\/sign-in/, { timeout: 10000 }).catch(() => {});
    check(`SW-06 a visitor opening ${path} is sent to sign-in`, route(page).startsWith('/auth/sign-in'), route(page));
    await ctx.close();
  }
  ({ ctx, page } = await open({ launch: { publicDocuments: ['/manual/decisions'] } }, '/manual/decisions'));
  await page.waitForTimeout(1500);
  check('SW-06 a path the owner made public opens without sign-in', route(page) === '/manual/decisions');
  await page.goto(`${srv.base}/#/manual`); await page.waitForURL(/#\/auth\/sign-in/, { timeout: 10000 }).catch(() => {});
  check('SW-06 the rest of the manual stays private', route(page).startsWith('/auth/sign-in'));
  await ctx.close();
  ({ ctx, page } = await open({ userId: 'usr_desk' }, '/manual'));
  await page.waitForTimeout(1500);
  check('SW-06 a signed-in team member reads the manual', route(page) === '/manual');
  await ctx.close();
  ({ ctx, page } = await open({}, '/site'));
  await page.locator('.site-main').waitFor();
  const links = await page.locator('a[href*="#/manual"], a[href*="#/docs"]').count();
  check('SW-06 the public website links to no internal document', links === 0, `${links} links`);

  // ── review tools hidden from visitors' launch pages only in production; the review build keeps them ────────
  check('review build keeps the version picker (production hides it: VITE_HOY_BUILD=production)', (await page.locator('.site-actions select').count()) > 0);

  // ── SW-05 ──────────────────────────────────────────────────────────────────────────────────────────────────
  const body = await page.locator('body').innerText();
  check('SW-05 the website names the brand from tenant.ts (no other brand name in the shell)', body.includes('Sobre HOY') && !/humanclub\.com/i.test(body.replace('info@humanclub.com', '')));
  await page.goto(`${srv.base}/#/site/contact`); await page.locator('.site-main').waitFor();
  const footerEmail = await page.locator('.site-foot a[href^="mailto:"]').getAttribute('href');
  check('SW-05 the footer contact email comes from Settings / tenant.ts', footerEmail === 'mailto:info@humanclub.com', footerEmail);

  // ── SW-04 and SW-05 after an owner edit in Settings ────────────────────────────────────────────────────────
  await db(page, `const t = db.tenants.find((r) => r.id === 'ten_hoy'); t.settings = { ...(t.settings || {}), profile: { ...((t.settings || {}).profile || {}), whatsapp: '+57 300 123 4567', email: 'hola@estudio-ficticio.test', confirmed: true } };`);
  await page.locator('.site-main').waitFor(); await page.waitForTimeout(800);
  const was = await page.locator('a[href^="https://wa.me/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check('SW-04 every WhatsApp button on Contact opens the number set in Settings', was.length > 0 && was.every((h) => h.startsWith('https://wa.me/573001234567')), was.join(' '));
  check('SW-04 the old number is gone from Contact', !(await page.locator('body').innerText()).includes('312 776 5000'));
  check('SW-05 a contact email changed in Settings shows on the website', (await page.locator('.site-foot a[href^="mailto:"]').getAttribute('href')) === 'mailto:hola@estudio-ficticio.test');
  await page.goto(`${srv.base}/#/site/plans`); await page.locator('.site-main').waitFor(); await page.waitForTimeout(800);
  const planWas = await page.locator('a[href^="https://wa.me/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check('SW-04 the Plans page WhatsApp buttons (private classes, specials) use the Settings number', planWas.length > 0 && planWas.every((h) => h.startsWith('https://wa.me/573001234567')), planWas.join(' '));

  // ── SW-02 ──────────────────────────────────────────────────────────────────────────────────────────────────
  const price = async (path, sel = '.site-main') => { await page.goto(`${srv.base}/#${path}`); await page.locator('.site-main').waitFor(); await page.waitForTimeout(700); return page.locator(sel).innerText(); };
  check('SW-02 the plans page shows the product master price (trial 35.000)', /35\.000/.test(await price('/site/plans')));
  await db(page, `for (const p of db.plans) { if (p.id === 'plan_trial') p.price = 39000; if (p.id === 'plan_pack12') p.price = 640000; }`);
  const plans = await price('/site/plans');
  check('SW-02 a trial price change in the product master shows on Plans', /39\.000/.test(plans) && !/35\.000/.test(plans));
  check('SW-02 a package price change shows on Plans', /640\.000/.test(plans));
  check('SW-02 the home page shows the changed prices', /39\.000/.test(await price('/site')) && /640\.000/.test(await page.locator('.site-main').innerText()));
  check('SW-02 the classes page shows the changed trial price', /39\.000/.test(await price('/site/classes')));
  const faq = await price('/site/faq');
  check('SW-02 the FAQ price table shows the changed prices', /39\.000/.test(faq) && /640\.000/.test(faq));
  await db(page, `const p = db.plans.find((r) => r.id === 'plan_trial'); p.active = false;`);
  const off = await price('/site/plans');
  check('SW-02 a product switched off in the master disappears from Plans', !/39\.000/.test(off) && /640\.000/.test(off));
  await ctx.close();

  // ── SW-03 ──────────────────────────────────────────────────────────────────────────────────────────────────
  ({ ctx, page } = await open({}, '/site'));
  await page.locator('.site-main').waitFor();
  await page.getByRole('link', { name: /Reserva tu clase/ }).first().click();
  await page.waitForURL(/#\/site\/schedule/);
  check('SW-03 "Reserva tu clase" opens the schedule to choose a class', route(page).startsWith('/site/schedule'));
  await page.locator('.site-main').waitFor(); await page.waitForTimeout(800);
  const slot = page.locator('button.calendar-session:not([disabled])').first();
  await slot.click();
  const go = page.getByRole('button', { name: /Continuar con la reserva|Entrar para reservar|Reservar/ }).last();
  const mats = page.getByRole('button', { name: /^Mat \d+$/ });
  if (await mats.count()) await mats.first().click();
  await go.click();
  await page.waitForURL(/#\/auth\/sign-in/, { timeout: 10000 }).catch(() => {});
  const next = new URLSearchParams(route(page).split('?')[1] ?? '').get('next') ?? '';
  check('SW-03 a visitor goes to sign-in carrying the chosen class', route(page).startsWith('/auth/sign-in') && /^\/app\/(checkout|waitlist)\/[A-Za-z0-9_-]+/.test(next), `${route(page)}`);
  const signup = page.locator('a[href*="#/auth/sign-up"]').first();
  await signup.waitFor({ timeout: 10000 }).catch(() => {});
  check('SW-03 sign-in offers sign-up', (await page.locator('a[href*="#/auth/sign-up"]').count()) >= 1);
  await signup.click();
  await page.waitForURL(/#\/auth\/sign-up/, { timeout: 10000 }).catch(() => {});
  const signupNext = new URLSearchParams(route(page).split('?')[1] ?? '').get('next') ?? '';
  check('SW-03 switching to sign-up keeps the chosen class', route(page).startsWith('/auth/sign-up') && signupNext === next, route(page));
  await ctx.close();
  // ── production build: no review tools. Builds `VITE_HOY_BUILD=production` into a temp dir unless QA_PROD_DIST names one.
  {
    let prodDir = process.env.QA_PROD_DIST;
    if (!prodDir) {
      prodDir = await mkdtemp(join(tmpdir(), 'hoy-prod-dist-'));
      execFileSync('npx', ['vite', 'build', '--outDir', prodDir, '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, VITE_HOY_BUILD: 'production' }, stdio: 'inherit' });
    }
    const prod = await serveDist(5325, prodDir);
    const pctx = await newContext(browser, {});
    const p = await pctx.newPage();
    p.on('pageerror', (e) => errors.push(`prod: ${e.message}`));
    await p.goto(`${prod.base}/#/site?version=archive`); await p.locator('.site-main').waitFor(); await p.waitForTimeout(800);
    check('production: no version picker on the public site', (await p.locator('.site-actions select, .site-nav-tools select').count()) === 0);
    check('production: ?version=archive is ignored (Latest only)', (await p.locator('.site').getAttribute('data-site-version')) === 'latest');
    check('production: no testing-hub or version-history link in the footer', (await p.locator('.site-foot a[href*="#/hub"], .site-foot a[href*="github.com"]').count()) === 0);
    check('production: no concept-imagery demo note', (await p.locator('.site-concept-note').count()) === 0);
    await p.goto(`${prod.base}/`); await p.locator('.coming-soon').waitFor();
    check('production: the root shows Coming Soon by default (SW-08)', true);
    await pctx.close();
    const tctx = await newContext(browser, { launch: { siteLive: true, publicDocuments: ['/manual'] } });
    const tp = await tctx.newPage();
    await tp.goto(`${prod.base}/`); await tp.locator('.coming-soon').waitFor();
    check('production: a visitor\'s own localStorage cannot flip go-live', ['', '/'].includes(route(tp)) && (await tp.locator('.site-main').count()) === 0);
    await tp.goto(`${prod.base}/#/manual`); await tp.waitForURL(/#\/auth\/sign-in/, { timeout: 10000 }).catch(() => {});
    check('production: a visitor\'s own localStorage cannot make the manual public', route(tp).startsWith('/auth/sign-in'));
    await tctx.close(); await prod.close();
  }
} finally {
  check('no page threw while testing the website rows', errors.length === 0, errors.join(' | '));
  await browser.close(); await srv.close();
}
done();
