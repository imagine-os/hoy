// H-9 — /admin/emails in both builds. Review: the M-04 workbench as before. Production (VITE_HOY_BUILD=production): the
// launch emails with Company OS's delivery status only — no local send, no simulated "sent", no status made up when
// Company OS isn't connected. Builds both into temp dirs unless QA_DIST / QA_PROD_DIST name built ones.
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('launch emails UI');
const temps = [];
async function dist(envName, production) {
  if (process.env[envName]) return process.env[envName];
  const dir = await mkdtemp(join(tmpdir(), production ? 'hoy-emails-prod-' : 'hoy-emails-review-'));
  temps.push(dir);
  execFileSync('npx', ['vite', 'build', '--outDir', dir, '--emptyOutDir', '--logLevel', 'error'],
    { env: { ...process.env, VITE_HOY_BUILD: production ? 'production' : '' }, stdio: 'inherit' });
  return dir;
}

const SIMULATED = /Simulación LOCAL|Registrar simulación local|LOCAL simulation|Record local simulation|Simulado local/;
const browser = await launchBrowser();
try {
  for (const [label, production, port] of [['review', false, 4391], ['production', true, 4392]]) {
    const server = await serveDist(port, await dist(production ? 'QA_PROD_DIST' : 'QA_DIST', production));
    try {
      for (const lang of ['es', 'en']) {
        const ctx = await newContext(browser, { userId: 'usr_admin', lang });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${server.base}/#/admin/emails`);
        await page.waitForSelector(production ? '[data-launch-emails]' : '.emails, .empty-state, h1', { timeout: 15000 });
        await page.waitForTimeout(300);
        const text = await page.locator('main, body').first().innerText();
        if (!production) {
          check(`review ${lang}: the M-04 workbench is unchanged (local simulation notice, no launch page)`, SIMULATED.test(text) && (await page.locator('[data-launch-emails]').count()) === 0);
        } else {
          check(`production ${lang}: the launch emails page renders`, (await page.locator('[data-launch-email]').count()) === 11);
          check(`production ${lang}: no local send or simulated status`, !SIMULATED.test(text) && (await page.getByRole('button', { name: /prueba|test/i }).count()) === 0, text.match(SIMULATED)?.[0]);
          check(`production ${lang}: without Company OS the page says there is no delivery status (none invented)`,
            (await page.locator('[data-delivery="unavailable"]').count()) === 1
            && !/\b(Enviado|Entregado|Sent|Delivered|En cola|Queued)\b/.test(await page.getByRole('region', { name: /Estado de entrega|Delivery status/ }).innerText()));
          check(`production ${lang}: blocked emails say so`, (await page.locator('[data-launch-email="class_cancelled"]').innerText()).match(/Aún no se envía|Not sent yet/) !== null);
          await page.locator('[data-launch-email="booking_released"] button').click();
          const preview = await page.locator('[data-launch-email="booking_released"] .emailpreview').innerText();
          check(`production ${lang}: the preview is the Spanish copy with sample data, every placeholder filled`, /Hola Valentina/.test(preview) && !/\{\{|\{brand\}/.test(preview));
          check(`production ${lang}: no missing string keys`, !/⟨[\w.]+⟩/.test(text));
        }
        check(`${label} ${lang}: no page errors`, errors.length === 0, errors.join(' | '));
        await ctx.close();
      }
    } finally { await server.close(); }
  }
} finally {
  await browser.close();
  for (const d of temps) await rm(d, { recursive: true, force: true });
}
done();
