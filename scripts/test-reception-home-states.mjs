import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5237', out = 'docs/screenshots/RC-01', checks = [], errors = [];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
 for (const lang of ['en', 'es']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
  await ctx.addInitScript(lang => {
   localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_desk', devMode: false, viewAs: null }));
   window.addEventListener('load', async () => { try { const { mountReceptionHomeHarness } = await import('/scripts/reception-home-harness.tsx'); await mountReceptionHomeHarness(); } catch (e) { window.qaBootError = String(e); } });
  }, lang);
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-10-23T17:00:00Z') });
  await page.goto(base + '/#/coming-soon'); await page.waitForFunction(() => window.qaHome?.navigate || window.qaBootError); assert.equal(await page.evaluate(() => window.qaBootError), undefined);
  const root = page.locator('#qa-home'), stats = root.locator('.stat-value-text');
  await root.locator('[aria-busy=true]').waitFor(); assert.equal(await stats.count(), 0);
  await page.screenshot({ path: `${out}/${lang}-390-loading.jpg`, fullPage: true });
  await page.evaluate(() => { window.qaHome.mode = 'error'; window.qaHome.switchUser('admin'); });
  await root.getByRole('alert').waitFor(); await page.evaluate(() => window.qaHome.pending.splice(0).forEach(resolve => resolve()));
  await page.waitForTimeout(150); assert.equal(await stats.count(), 0, 'old actor reads cannot replace current error');
  await page.screenshot({ path: `${out}/${lang}-390-error.jpg`, fullPage: true });
  await page.evaluate(() => window.qaHome.mode = 'normal');
  await root.getByRole('button', { name: lang === 'en' ? 'Retry' : 'Reintentar', exact: true }).click(); await stats.first().waitFor(); assert.equal(await stats.first().innerText(), '16');
  // New subscription refresh wins while an earlier captured read remains unresolved.
  await page.evaluate(async () => { window.qaHome.mode = 'loading'; const p = window.qaHome.provider; await p.update('profiles', p.peek('profiles')[0].id, { initials: 'QA' }); });
  await root.locator('[aria-busy=true]').waitFor();
  await page.waitForFunction(() => window.qaHome.pending.length === 11);
  await page.evaluate(async () => { window.qaHome.mode = 'empty'; const p = window.qaHome.provider; await p.update('profiles', p.peek('profiles')[0].id, { initials: 'QB' }); });
  await stats.first().waitFor(); assert.equal(await stats.first().innerText(), '0');
  await page.evaluate(() => window.qaHome.pending.splice(0).forEach(resolve => resolve())); await page.waitForTimeout(150); assert.equal(await stats.first().innerText(), '0');
  await root.getByText(lang === 'en' ? 'No classes were scheduled today.' : 'Hoy no hubo clases programadas.', { exact: true }).waitFor();
  await page.screenshot({ path: `${out}/${lang}-390-empty.jpg`, fullPage: true });
  // Interrupted navigation has no late rendering, navigation or storage effects.
  await page.evaluate(async () => { window.qaHome.mode = 'loading'; const p = window.qaHome.provider; await p.update('profiles', p.peek('profiles')[0].id, { initials: 'QC' }); });
  await root.locator('[aria-busy=true]').waitFor(); await page.waitForFunction(() => window.qaHome.pending.length === 11);
  await page.evaluate(() => window.qaHome.navigate('/left')); await root.getByText('FICTIONAL LEFT HOME').waitFor();
  const before = await page.evaluate(() => localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(() => window.qaHome.pending.splice(0).forEach(resolve => resolve())); await page.waitForTimeout(150);
  await root.getByText('FICTIONAL LEFT HOME').waitFor(); assert.equal(await page.evaluate(() => localStorage.getItem('hoyos.db.v1')), before);
  for (let i = 0; i < 2; i++) { await page.evaluate(() => { window.qaHome.mode = 'normal'; window.qaHome.navigate('/staff'); }); await stats.first().waitFor(); assert.equal(await stats.first().innerText(), '16'); await page.evaluate(() => window.qaHome.navigate('/left')); await root.getByText('FICTIONAL LEFT HOME').waitFor(); }
  checks.push(`${lang}390: loading, error/retry, actor-change stale result, subscription latest read wins, empty, unmount/late read, repeated return`); await ctx.close();
 }
 assert.deepEqual(errors, []); await writeFile(`${out}/states.json`, JSON.stringify({ base, checks, errors, limits: ['Development-only real-component provider fault harness; no server/auth acceptance.'] }, null, 2)); console.log(checks.join('\n'));
} finally { await browser.close(); }
