import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const base = process.env.QA_BASE || 'http://127.0.0.1:5194';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ timezoneId: 'America/Los_Angeles', viewport: { width: 1280, height: 950 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.clock.install({ time: new Date('2026-12-01T15:00:00Z') });
try {
  await page.goto(`${base}/#/site/schedule`);
  await page.locator('.session-calendar').waitFor();
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')), db = stored.db;
    const common = { ...db.class_sessions[0], template_id: null, modality_id: 'mod_ligereza', capacity: 9, booked_count: 0, status: 'scheduled' };
    db.class_sessions = [
      { ...common, id: 'qa_before_cutoff', title: 'QA Before Cutoff', starts_at: '2026-12-07T04:00:00Z', ends_at: '2026-12-07T04:50:00Z' },
      { ...common, id: 'qa_after_cutoff', title: 'QA After Cutoff', starts_at: '2026-12-07T05:00:00Z', ends_at: '2026-12-07T05:50:00Z' },
    ];
    db.bookings = [];
    db.voucher_bookings = [];
    localStorage.setItem('hoyos.db.v1', JSON.stringify(stored));
    localStorage.setItem('hoyos.lang', 'en');
  });
  await page.reload();
  await page.locator('.session-calendar').waitFor();
  const selectDay = async (day, label = 'Day') => {
    await page.locator('.calendar-date-label input').fill(day);
    await page.getByRole('button', { name: label, exact: true }).click();
  };
  await selectDay('2026-12-06');
  const before = page.locator('.classrow').filter({ hasText: 'QA Before Cutoff' });
  assert(!(await before.isDisabled()));
  await before.click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await selectDay('2026-12-07');
  const after = page.locator('.classrow').filter({ hasText: 'QA After Cutoff' });
  assert(await after.isDisabled());
  assert.match(await after.innerText(), /No spots available/);
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  const inWeek = page.locator('.calendar-session').filter({ hasText: 'QA After Cutoff' });
  assert(await inWeek.isDisabled());
  assert.match(await inWeek.innerText(), /No spots available/);
  await page.evaluate(() => localStorage.setItem('hoyos.lang', 'es'));
  await page.setViewportSize({ width: 390, height: 950 });
  await page.reload();
  await page.locator('.session-calendar').waitFor();
  await selectDay('2026-12-07', 'Día');
  assert(await after.isDisabled());
  assert.match(await after.innerText(), /Sin cupos disponibles/);
  assert.deepEqual(errors, []);
  console.log('Public website Dec 6/7 boundary verified in English desktop day/week and Spanish mobile views');
} finally { await browser.close(); }
