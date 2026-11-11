// Hoy 12 Nov, review round 1 fixes: links built from a site path in production, the staff decline hint, neutral copy,
// the Company OS floor, the check-in screen keeping its class. Node level. Run: node scripts/test-hoy-12nov-r1.mjs
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = await mkdtemp(join(tmpdir(), 'hoy-12nov-r1-'));
try {
  const file = join(dir, 'r1.mjs');
  await build({
    stdin: { contents: `export { appBaseFor } from './src/config/appBase';
export { CONTRACT_REFUSALS } from './src/data/companyos/refusals';
export { payLaunchStrings as payStrings } from './src/modules/transfers/launch/strings';
export { productionStrings as voucherStrings } from './src/modules/vouchers/production/strings';`, resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent', define: { 'import.meta.env.BASE_URL': '"/"' },
  });
  const m = await import(pathToFileURL(file));
  const read = (p) => readFile(p, 'utf8');
  const checks = [];
  const check = async (name, fn) => { await fn(); checks.push(name); };

  await check('links: production uses origin + "/", whatever site path the visitor is on', () => {
    for (const pathname of ['/', '/planes', '/clases/yoga', '/es/x']) assert.equal(m.appBaseFor({ origin: 'https://hoyhumanclub.com', pathname }, true), 'https://hoyhumanclub.com/');
  });
  await check('links: the review build keeps its pathname (GitHub Pages)', () => {
    assert.equal(m.appBaseFor({ origin: 'https://o.github.io', pathname: '/hoy/' }, false), 'https://o.github.io/hoy/');
  });
  await check('links: no code builds a base from window.location.pathname any more', async () => {
    for (const f of ['src/auth/ProductionSession.tsx', 'src/auth/clerkFlows.ts', 'src/modules/vouchers/production/TeacherCodesPage.tsx', 'src/modules/customer/pages/InvitePage.tsx', 'src/modules/identity/pages.tsx']) {
      assert.doesNotMatch(await read(f), /location\.pathname/, f);
    }
  });
  await check('company-os.json asks for Company OS >= 1.11.0', async () => {
    const { requires } = JSON.parse(await read('company-os.json'));
    const [a, b] = /^>=(\d+)\.(\d+)\.\d+$/.exec(requires).slice(1).map(Number);
    assert.ok(a > 1 || (a === 1 && b >= 11), requires);
  });
  await check('staff decline reason says the customer will see it (es, en)', () => {
    const h = m.payStrings['payLaunch.review.reasonHint'];
    assert.match(h.es, /verá este motivo/); assert.match(h.en, /will see this reason/);
    return read('src/modules/transfers/launch/ReviewDrawer.tsx').then((s) => assert.match(s, /reasonHint/));
  });
  await check('copy: refusals are neutral (no "una clase por día", no "Ya tienes" for staff screens); code hint covers every code kind', () => {
    const d = m.CONTRACT_REFUSALS.daily_limit_reached, o = m.CONTRACT_REFUSALS.person_overlap;
    for (const x of [d.es, d.en]) assert.doesNotMatch(x, /una clase por día|one class a day/i);
    for (const x of [o.es, o.en]) assert.doesNotMatch(x, /Ya tienes|You already have/);
    const hint = m.voucherStrings['vouchers.cos.entry.hint'];
    for (const x of [hint.es, hint.en]) assert.doesNotMatch(x, /primera vez|first time/i);
    assert.match(hint.es, /regalo/); assert.match(hint.en, /gift/);
  });
  await check('public server: booking is not a public entity', async () => {
    const s = await read('server/app.mjs');
    assert.doesNotMatch(s.match(/PUBLIC_ENTITIES = new Set\(\[[^\]]*\]/)[0], /booking/);
    assert.doesNotMatch(s, /class and mat/);
  });
  // The check-in screen's class choice is covered by scripts/test-hoy-12nov-r2.mjs (review round 2, L1).
  console.log(checks.map((c) => `ok   ${c}`).join('\n'));
} finally { await rm(dir, { recursive: true, force: true }); }
