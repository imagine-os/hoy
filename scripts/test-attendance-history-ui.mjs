import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5317';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles', viewport: { width: 390, height: 900 }, acceptDownloads: true });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
  await context.addInitScript(() => {
    if (sessionStorage.getItem('attendance-fixture')) return;
    sessionStorage.setItem('attendance-fixture','1');
    localStorage.setItem('hoyos.session', JSON.stringify({userId:'usr_desk',devMode:false,viewAs:null}));
    localStorage.setItem('hoyos.lang','en');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-27T06:00:00Z') });
  await page.goto(`${base}/#/staff/checkin`);
  await page.waitForFunction(() => localStorage.getItem('hoyos.db.v1'));
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hoyos.db.v1'));
    const db = stored.db;
    const template = db.class_sessions.find(s => s.status === 'scheduled');
    const starts_at = '2026-11-27T04:00:00Z', ends_at = '2026-11-27T04:55:00Z';
    db.class_sessions = [
      {...template,id:'history_class',title:'QA Late Bogotá Class',starts_at,ends_at,status:'completed',booked_count:5},
      {...template,id:'history_zero',title:'QA Zero Class',starts_at:'2026-11-26T21:30:00Z',ends_at:'2026-11-26T22:30:00Z',status:'completed',booked_count:1},
      {...template,id:'today_other',title:'QA Today Class',starts_at:'2026-11-27T05:00:00Z',ends_at:'2026-11-27T05:55:00Z',status:'completed',booked_count:1},
    ];
    const row = db.bookings[0];
    db.bookings = [
      {...row,id:'b1',user_id:'qa-private-person-1',session_id:'history_class',status:'checked_in',party_size:5},
      {...row,id:'b2',user_id:'qa-private-person-2',session_id:'history_class',status:'checked_in',party_size:5},
      {...row,id:'b3',user_id:'qa-private-person-3',session_id:'history_class',status:'no_show'},
      {...row,id:'b4',user_id:'qa-private-person-4',session_id:'history_zero',status:'booked'},
      {...row,id:'b5',user_id:'qa-private-person-5',session_id:'today_other',status:'checked_in'},
    ];
    localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
  });
  await page.reload();
  await page.getByRole('button',{name:'Attendance history'}).click();
  await page.getByRole('heading',{name:'Attendance history'}).waitFor();
  const list = page.getByRole('list',{name:'Attendance history'});
  await list.getByRole('listitem').filter({hasText:'QA Late Bogotá Class'}).getByText('Checked in: 2').waitFor();
  await list.getByRole('listitem').filter({hasText:'QA Zero Class'}).getByText('Checked in: 0').waitFor();
  assert.equal(await list.getByRole('listitem').count(),2);
  assert.equal(await page.getByPlaceholder('Name, WhatsApp or email…').count(),0);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download CSV'}).click();
  const download = await downloaded;
  const csv = await readFile(await download.path(),'utf8');
  assert.match(csv,/QA Late Bogotá Class",2/);
  assert.ok(!csv.includes('qa-private-person'));
  await page.getByLabel('From',{exact:true}).fill('2026-11-25');
  await page.getByLabel('To',{exact:true}).fill('2026-11-25');
  await page.getByRole('button',{name:'View attendance'}).click();
  await page.getByText('No finished classes in this date range.').waitFor();
  await page.evaluate(() => localStorage.setItem('hoyos.lang','es'));
  await page.reload();
  await page.getByRole('heading',{name:'Historial de asistencia'}).waitFor();
  await page.getByText('Asistentes: 2').waitFor();
  await page.getByRole('button',{name:'Check-in en vivo',exact:true}).click();
  await page.getByPlaceholder('Nombre, WhatsApp o email…').waitFor();
  assert.deepEqual(errors,[]);
  console.log('Check-in history route: bilingual, narrow layout, Bogotá boundary, counts-only CSV, empty state and return to live check-in passed');
} finally { await browser.close(); }
