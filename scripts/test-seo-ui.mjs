// SEO in the browser, after hydration (Hoy 12 Nov, review round 2, M1), on the PRODUCTION build behind the REAL Hoy
// server (createHandler), a fake Clerk with nobody signed in and a Company OS that answers empty lists:
// - the page title the server sent (the indexed one) is still the title once the app has loaded, on /clases/fuego and on
//   / (live), and when a visitor moves between website pages;
// - the studio's JSON-LD stays the server's (HealthClub), one element, never replaced by the app's;
// - a reload on a deep path asks for no asset that answers 4xx/5xx (the <base> and relative assets);
// - Back and Forward between /planes and the app (/#/…) land on the right page with the right title.
// Run: npm run build:production && QA_PROD_DIST=dist node scripts/test-seo-ui.mjs
import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
import { createHandler, createHoyServer } from '../server/app.mjs';
import { loadConfig } from '../server/config.mjs';

const { check, done } = reporter('SEO after hydration (UI)');
const DIST = resolve(process.env.QA_PROD_DIST ?? 'dist');
const TENANT = 'hoy-seo';
const HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const PORT = Number(process.env.QA_PORT ?? 5231);
const BASE = `http://127.0.0.1:${PORT}`;

if (!existsSync(join(DIST, 'index.html'))) { console.error(`${DIST}/index.html missing: run npm run build:production first`); process.exit(1); }
const bundle = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
if (!bundle.includes('clerk-js')) { console.error(`${DIST} is not a production build (no Clerk): run npm run build:production`); process.exit(1); }

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const cos = createServer((req, res) => {
  req.resume();
  req.on('end', () => (req.method === 'POST' && req.url.endsWith('/query') ? json(res, 200, { data: [] }) : json(res, 403, { error: 'read_only_identity' })));
});
await new Promise((r) => cos.listen(0, '127.0.0.1', r));
const config = loadConfig({
  COMPANY_OS_URL: `http://127.0.0.1:${cos.address().port}`, COMPANY_OS_TENANT: TENANT, CLERK_SECRET_KEY: 'sk_test_example',
  CLERK_PUBLISHABLE_KEY: PK, HOY_ENV: 'local', DIST_DIR: DIST, SITE_LIVE: 'true', COMPANY_OS_READ_TOKEN: `cos_svc_5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6_${'Q'.repeat(43)}`,
});
const web = createHoyServer(await createHandler(config, { verifySession: async () => { throw new Error('nobody is signed in'); }, log: () => {} }));
await new Promise((r) => web.listen(PORT, '127.0.0.1', r));

const serverHead = async (path) => {
  const html = await (await fetch(`${BASE}${path}`)).text();
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*id="hoyos-localbusiness"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return { title: /<title>([^<]*)<\/title>/.exec(html)?.[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'), ld: ld[0] ? JSON.parse(ld[0]) : null };
};

const browser = await launchBrowser();
const errors = [];
async function open(path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', timezoneId: 'America/Bogota' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ pk }) => { window.__fakeClerkConfig = { accounts: {}, publishableKey: pk }; localStorage.setItem('hoyos.lang', 'es'); }, { pk: PK });
  const page = await ctx.newPage();
  const failed = [];
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  page.on('response', (r) => { const u = new URL(r.url()); if (u.origin === BASE && !u.pathname.startsWith('/api/') && r.status() >= 400) failed.push(`${r.status()} ${u.pathname}`); });
  await page.goto(`${BASE}${path}`);
  await settle(page);
  return { ctx, page, failed };
}
async function settle(page) {
  await page.locator('.site-main').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
}
const ldOf = (page) => page.evaluate(() => [...document.querySelectorAll('script#hoyos-localbusiness')].map((e) => JSON.parse(e.textContent)));

try {
  for (const path of ['/clases/fuego', '/']) {
    const want = await serverHead(path);
    check(`${path}: the server sent a title and the studio's JSON-LD`, !!want.title && want.ld?.['@type'] === 'HealthClub', JSON.stringify(want).slice(0, 200));
    const { ctx, page } = await open(path);
    check(`${path}: after hydration the title is the server's`, (await page.title()) === want.title, `${await page.title()} !== ${want.title}`);
    const lds = await ldOf(page);
    check(`${path}: one studio JSON-LD, still the server's HealthClub`, lds.length === 1 && lds[0]['@type'] === 'HealthClub' && JSON.stringify(lds[0]) === JSON.stringify(want.ld), JSON.stringify(lds).slice(0, 200));
    await ctx.close();
  }

  // A reload on a deep path: every asset resolves (relative assets under <base href="/">), the title and JSON-LD stay.
  {
    const want = await serverHead('/clases/fuego');
    const { ctx, page, failed } = await open('/clases/fuego');
    failed.length = 0;
    await page.reload();
    await settle(page);
    check('reload on /clases/fuego: no asset answers 4xx/5xx', failed.length === 0, failed.join(', '));
    check('reload on /clases/fuego: the path and the server title stay', new URL(page.url()).pathname === '/clases/fuego' && (await page.title()) === want.title, `${page.url()} ${await page.title()}`);
    check('reload on /clases/fuego: one JSON-LD element', (await ldOf(page)).length === 1);
    await ctx.close();
  }

  // Moving between website pages keeps each page's own server title (the app's own pages are not in this table).
  {
    const { ctx, page } = await open('/planes');
    const plans = await serverHead('/planes');
    check('/planes: the server title after hydration', (await page.title()) === plans.title, await page.title());
    const link = page.locator('a[href="/contacto"]').first();
    if (await link.count()) {
      await link.click();
      await page.waitForURL(/\/contacto$/, { timeout: 10000 });
      await page.waitForTimeout(500);
      check('a link to /contacto: its server title', (await page.title()) === (await serverHead('/contacto')).title, await page.title());
    } else check('the site links to /contacto', false);
    await ctx.close();
  }

  // Back and Forward between the website and the app.
  {
    const { ctx, page } = await open('/planes');
    const plans = await serverHead('/planes');
    const toApp = page.locator('a[href^="/#/"]').first();
    if (await toApp.count()) {
      await toApp.click();
      await page.waitForFunction(() => location.hash.startsWith('#/'), null, { timeout: 10000 });
      await page.waitForTimeout(800);
      const appUrl = page.url();
      check('the link leaves the website for the app (hash route)', /#\//.test(appUrl) && !(await page.locator('.site-main').count()), appUrl);
      await page.goBack();
      await settle(page);
      check('Back: /planes with its server title and the website on screen', new URL(page.url()).pathname === '/planes' && !new URL(page.url()).hash && (await page.title()) === plans.title, `${page.url()} ${await page.title()}`);
      await page.goForward();
      await page.waitForFunction(() => location.hash.startsWith('#/'), null, { timeout: 10000 });
      await page.waitForTimeout(800);
      check('Forward: the app again', page.url() === appUrl && !(await page.locator('.site-main').count()), page.url());
      await page.goBack();
      await settle(page);
      check('Back again: /planes once more, the title still the server\'s', new URL(page.url()).pathname === '/planes' && (await page.title()) === plans.title, `${page.url()} ${await page.title()}`);
    } else check('the website links to the app (a /#/ link)', false);
    await ctx.close();
  }
} finally {
  check('no page threw', errors.length === 0, errors.join(' | '));
  await browser.close();
  web.close(); cos.close();
}
done();
