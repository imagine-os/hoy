import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5238', out = 'docs/screenshots/RC-01', errors = [], checks = [];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
 for (const lang of ['en', 'es']) for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
  await ctx.addInitScript(lang => { if (sessionStorage.getItem('rc01-init')) return; sessionStorage.setItem('rc01-init', '1'); localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'light', skin: 'styled' })); localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_desk', devMode: false, viewAs: null })); }, lang);
  const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-10-23T17:00:00Z') });
  const home = async () => { await page.goto(base + '/#/staff'); await page.locator('main .stat-value-text').first().waitFor(); };
  await home();
  const fixture = await page.evaluate(() => {
   const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')), db = stored.db;
   const day = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
   const today = db.class_sessions.filter(s => s.tenant_id === 'ten_hoy' && s.status !== 'cancelled' && day(s.starts_at) === day(Date.now())).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
   const ids = new Set(today.map(s => s.id));
   const arrivals = db.bookings.filter(b => b.tenant_id === 'ten_hoy' && ids.has(b.session_id) && b.status === 'checked_in').length;
   const completed = today.find(s => db.bookings.some(b => b.session_id === s.id && b.status === 'checked_in')); completed.status = 'completed';
   const common = { tenant_id: 'ten_hoy', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: 'usr_cust', plan_id: 'plan_pack12', amount: 25000, currency: 'COP', method: 'cash', provider: 'manual', status: 'pending', paid_at: null };
   db.payments.push({ ...common, id: 'qa_home_pending1' }, { ...common, id: 'qa_home_pending2' }, { ...common, id: 'qa_home_foreign', tenant_id: 'foreign' });
   localStorage.setItem('hoyos.db.v1', JSON.stringify(stored));
   return { arrivals, today: today.map(s => ({ id: s.id, checked: db.bookings.filter(b => b.tenant_id === 'ten_hoy' && b.session_id === s.id && b.status === 'checked_in').length })), next: today.find(s => s.status === 'scheduled' && Date.parse(s.ends_at) > Date.now())?.id };
  });
  await page.reload(); await page.locator('main .stat-value-text').first().waitFor();
  assert.equal(await page.locator('main .stat-value-text').first().innerText(), String(fixture.arrivals));
  const dbBefore = await page.evaluate(() => localStorage.getItem('hoyos.db.v1'));
  for (const theme of ['light', 'dark']) {
   await page.evaluate(theme => { const root = document.documentElement; root.dataset.theme = theme; localStorage.setItem('hoyos.theme', JSON.stringify({ theme, skin: 'styled' })); }, theme);
   await page.screenshot({ path: `${out}/${lang}-${width}-${theme}.jpg`, quality: 78, fullPage: true, animations: 'disabled' });
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
  }
  // The next-class CTA and every day row open the exact session roster.
  if (fixture.next) { await page.locator('main .classcard').getByRole('button').click(); await page.waitForURL(url => url.hash.includes(`session=${fixture.next}`)); await home(); }
  for (const session of fixture.today) {
   await page.locator('main .classrow').nth(fixture.today.indexOf(session)).click();
   await page.waitForURL(url => url.hash.includes(`session=${session.id}`));
   const pattern = lang === 'en' ? new RegExp(`^${session.checked} of \\d+ arrived`) : new RegExp(`^${session.checked} de \\d+ llegaron`);
   await page.locator('main .checkin-search').getByText(pattern).waitFor(); await home();
  }
  const pending = page.locator('main a[href="#/staff/transfers"]'); await pending.click();
  await page.getByRole('heading', { name: lang === 'en' ? 'Pending demo payments' : 'Pagos demo pendientes', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: lang === 'en' ? 'View payment details' : 'Ver detalle del pago', exact: true }).count(), 2);
  await home(); await pending.waitFor(); assert.match(await pending.innerText(), /2/);
  assert.equal(await page.evaluate(() => localStorage.getItem('hoyos.db.v1')), dbBefore, 'all dashboard/roster/queue navigation is read-only');
  // Fresh session after an interrupted route and repeated browser history stays consistent.
  await page.goBack(); await page.goForward(); await page.locator('main .stat-value-text').first().waitFor(); assert.equal(await page.locator('main .stat-value-text').first().innerText(), String(fixture.arrivals));
  checks.push(`${lang}${width}: actual staff shell, Tokyo browser/studio day, completed-class arrivals ${fixture.arrivals}, all ${fixture.today.length} rosters, exact next CTA, pending2 queue parity/foreign exclusion, repeat/back/forward, light/dark, no DB changes/overflow`); await ctx.close();
 }
 assert.deepEqual(errors, []); await writeFile(`${out}/production.json`, JSON.stringify({ base, checks, errors, limits: ['Local production bundle and fictional browser data; no backend/owner acceptance or deployment.'] }, null, 2)); console.log(checks.join('\n'));
} finally { await browser.close(); }
