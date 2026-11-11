// Hoy 12 Nov, review round 2 fixes, Node level. Run: node scripts/test-hoy-12nov-r2.mjs
// - M1: the browser's title for every public page is the server's (one table, server/pageMeta.mjs);
// - L1: the check-in screen follows the current or next class, keeps the one staff chose, and offers "next class" once
//   that one has ended (behaviour of src/modules/staff/checkinSelection.ts);
// - L3: the staff decline hint says the customer sees the reason only when declining.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = await mkdtemp(join(tmpdir(), 'hoy-12nov-r2-'));
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['ok  ', name]); } catch (err) { results.push(['FAIL', name, err]); } };
try {
  const load = async (name, contents) => {
    const file = join(dir, `${name}.mjs`);
    await build({ stdin: { contents, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent', define: { 'import.meta.env.BASE_URL': '"/"' } });
    return import(pathToFileURL(file));
  };
  const read = (p) => readFile(p, 'utf8');
  const seo = await import('../server/seo.mjs');
  const brand = await load('brand', `export { classOrder } from './src/tenant/brand';`);

  await test('M1: the browser title of every public page equals the server title', async () => {
    const meta = await load('meta', `export { siteRouteTitle } from './src/modules/website/pageMeta';\nexport { SITE_PATHS, cleanPathOf } from './src/modules/website/paths';`);
    const routes = [...meta.SITE_PATHS.map(([route]) => route), ...brand.classOrder.map((s) => `/site/classes/${s}`)];
    assert.equal(routes.length, 12 + 7);
    for (const route of routes) {
      const path = meta.cleanPathOf(route);
      const page = seo.pageFor(path);
      assert.ok(page, `${route} → ${path}: the server has a page`);
      assert.equal(meta.siteRouteTitle(route), page.title, route);
    }
  });
  await test('M1: no title is an internal spec name, and an unknown website route has no title (the home is the fallback path)', async () => {
    const meta = await load('meta2', `export { siteRouteTitle } from './src/modules/website/pageMeta';`);
    assert.equal(meta.siteRouteTitle('/site/classes/fuego'), 'Fuego: Enciende tu energía · HOY Human Club');
    assert.doesNotMatch(meta.siteRouteTitle('/site/plans'), /Sitio/);
    assert.equal(meta.siteRouteTitle('/app/schedule'), null);
    assert.equal(meta.siteRouteTitle('/'), null);
    assert.equal(meta.siteRouteTitle('/site/classes/no-such-class-9'), null);
  });
  await test('M1: RouteTitle uses the table for website routes in the production build; the JSON-LD hook leaves the server\'s element alone', async () => {
    const t = await read('src/app/RouteTitle.tsx');
    assert.match(t, /siteRouteTitle/); assert.match(t, /PRODUCTION_BUILD/);
    const j = await read('src/modules/website/jsonLd.ts');
    assert.match(j, /data-client/);
  });

  const sel = await load('sel', `export * from './src/modules/staff/checkinSelection';`).catch((e) => ({ missing: e }));
  const at = (h, m = 0) => Date.parse(`2026-11-12T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-05:00`);
  const cls = (id, h) => ({ session: { id, starts_at: new Date(at(h)).toISOString(), ends_at: new Date(at(h, 50)).toISOString() } });
  const day = [cls('c07', 7), cls('c09', 9), cls('c18', 18)];
  const view = (wanted, now, all = day) => sel.checkinView({ today: all, all, wantedId: wanted, now });
  await test('L1: with nothing chosen the screen follows the class: next before 07:00, live at 07:10, the next one after it ends', () => {
    assert.equal(view(null, at(6, 30)).selected.session.id, 'c07');
    assert.equal(view(null, at(7, 10)).selected.session.id, 'c07');
    assert.equal(view(null, at(8, 15)).selected.session.id, 'c09');
    assert.equal(view(null, at(19, 30)).selected.session.id, 'c18', 'after the last class of the day: the last one');
    assert.equal(view(null, at(8, 15)).nextId, null, 'nothing chosen, nothing to offer');
  });
  await test('L1: the class staff chose stays, however late; once it has ended and a later one is live or next, "next class" is offered', () => {
    assert.equal(view('c07', at(6, 30)).selected.session.id, 'c07');
    assert.equal(view('c07', at(8, 15)).selected.session.id, 'c07');
    assert.equal(view('c07', at(7, 10)).nextId, null, 'still running: no button');
    assert.equal(view('c07', at(8, 15)).nextId, 'c09');
    assert.equal(view('c09', at(9, 20)).nextId, null);
    assert.equal(view('c18', at(19, 30)).nextId, null, 'no later class today');
    assert.equal(view('c07', at(9, 10)).nextId, 'c09', 'the next class is live now');
  });
  await test('L1: a chosen class from another day, an unknown id, and a day with no class', () => {
    const tomorrow = [{ session: { id: 'd1', starts_at: new Date(at(7) + 864e5).toISOString(), ends_at: new Date(at(7, 50) + 864e5).toISOString() } }];
    const all = [...day, ...tomorrow];
    assert.equal(sel.checkinView({ today: day, all, wantedId: 'd1', now: at(12) }).selected.session.id, 'd1');
    assert.equal(sel.checkinView({ today: day, all, wantedId: 'nope', now: at(12) }).selected.session.id, 'c18');
    assert.equal(sel.checkinView({ today: [], all: [], wantedId: null, now: at(12) }).selected, undefined);
  });
  await test('L1: the screen no longer writes the shown class into the address, and has the next-class button (es, en)', async () => {
    const s = await read('src/modules/staff/CheckinPage.tsx');
    assert.doesNotMatch(s, /next\.set\('session', autoId\)/);
    assert.match(s, /staff\.checkin\.nextClass/);
    const st = await load('st', `export { staffStrings } from './src/modules/staff/strings';`).catch(() => null);
    const str = await read('src/modules/staff/strings.ts');
    assert.match(str, /'staff\.checkin\.nextClass': \{ es: 'Ir a la siguiente clase', en: 'Go to the next class' \}/); void st;
  });

  await test('L3: the decline hint says the customer sees the reason only if the payment is declined (es, en)', async () => {
    const m = await load('pay', `export { payLaunchStrings as s } from './src/modules/transfers/launch/strings';`);
    const h = m.s['payLaunch.review.reasonHint'];
    assert.match(h.es, /^Si rechazas, la persona verá este motivo/); assert.match(h.en, /^If you decline, the customer will see this reason/);
  });
} finally { await rm(dir, { recursive: true, force: true }); }
for (const [mark, name, err] of results) console.log(`${mark} ${name}${err ? `\n     ${String(err.message ?? err).split('\n')[0]}` : ''}`);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
