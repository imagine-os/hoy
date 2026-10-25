// Production route checks; synthetic persisted snapshots originate from actual edit/publication commands.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { faqPricingFixture, faqPricingNow } from './faq-pricing-fixture.mjs';

async function readablePriceLayout(panel,width){
 const result=await panel.evaluate(async root=>{await document.fonts.ready;const tables=[...root.querySelectorAll('.pricetable')].map(wrapper=>({client:wrapper.clientWidth,scroll:wrapper.scrollWidth}));const rows=[...root.querySelectorAll('tbody tr')].flatMap(row=>{const status=row.querySelector('td [role=status]'),name=row.querySelector('.pricetable-name');if(!status||!name)return[];const cell=status.closest('td'),table=row.closest('table'),style=getComputedStyle(name),canvas=document.createElement('canvas'),context=canvas.getContext('2d');context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const words=(name.textContent||'').split(/\s+/).filter(Boolean),longest=Math.max(0,...words.map(word=>context.measureText(word).width)),minimum=Math.max(context.measureText('abcdefghijkl').width,Math.min(longest,120));const range=document.createRange();range.selectNodeContents(status);return[{name:name.textContent,nameWidth:name.getBoundingClientRect().width,minimum,cellWidth:cell.getBoundingClientRect().width,tableWidth:table.getBoundingClientRect().width,whiteSpace:getComputedStyle(cell).whiteSpace,statusWhiteSpace:getComputedStyle(status).whiteSpace,lines:new Set([...range.getClientRects()].filter(rect=>rect.width>0).map(rect=>Math.round(rect.top))).size}];});return{tables,rows,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};});
 assert(result.rows.length>0,'state layout probe must inspect actual unavailable price rows');assert(result.documentWidth<=result.viewport+1,'unavailable rows must not overflow viewport');for(const table of result.tables)assert(table.scroll<=table.client+1,'price table must not require horizontal scrolling');for(const row of result.rows){assert.notEqual(row.whiteSpace,'nowrap','unavailable state cell must allow wrapping');assert.notEqual(row.statusWhiteSpace,'nowrap','unavailable status text must allow wrapping');assert(row.nameWidth+1>=row.minimum,`option name has readable word/character width: ${JSON.stringify(row)}`);if(width===390){assert(row.lines>=2,`mobile unavailable message must actually wrap: ${JSON.stringify(row)}`);assert(row.cellWidth<=row.tableWidth*.65,'mobile state column must leave space for readable option names');}}
}

const base = process.env.QA_BASE ?? 'http://127.0.0.1:5642';
const out = process.env.QA_OUTPUT ?? '/tmp/hoy-faq-pricing-production';
await mkdir(out, { recursive: true });
const scratch = await mkdtemp('/tmp/hoy-faq-production-');
const callerStorage=globalThis.localStorage;
const fixture = await faqPricingFixture(), store = new Map([['hoyos.db.v1', JSON.stringify(fixture)]]);
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
const NodeDate=Date,priorStorage=callerStorage;globalThis.Date=class extends NodeDate{constructor(...args){super(...(args.length?args:[faqPricingNow]));}static now(){return new NodeDate(faqPricingNow).getTime();}};
let browser, debug; const checks = [], errors = [];
const unchanged=(before,after)=>{for(const table of Object.keys(before))if(!['plans','audit_log'].includes(table))assert.deepEqual(after[table],before[table],'publication/read preserves '+table);};
try {
  const file = scratch + '/commands.mjs';
  await build({ stdin: { contents: "export {MockProvider} from './src/data/MockProvider';export {saveLocalProduct} from './src/data/catalogRevision';export {changeLocalPublication} from './src/data/catalogPublication';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent' });
  const { MockProvider, saveLocalProduct, changeLocalPublication } = await import(pathToFileURL(file));
  const provider = new MockProvider(), plan = await provider.get('plans', 'plan_pack12');
  await saveLocalProduct(provider, { id: plan.id, before: plan.frontend_catalog ?? null, actorId: 'usr_admin', role: 'admin', definition: { code: 'QA_FAQ_PRODUCT', name: { es: 'PAQUETE FICTICIO PUBLICADO', en: 'FICTIONAL PUBLISHED PACKAGE' }, type: 'paquetes', classes: 8, validityDays: 45, active: true, prices: [{ id: 'old', amount: 123456, startsOn: '2026-10-01', endsOn: '2026-10-23' }, { id: 'new', amount: 345678, startsOn: '2026-10-24', endsOn: null }] } });
  const draft = await provider.get('plans', plan.id);
  await changeLocalPublication(provider, { planId: plan.id, action: 'publish', expectedRevision: draft.frontend_catalog.history.length, actorId: 'usr_admin', expectedTenant: 'ten_hoy' });
  const published = JSON.parse(store.get('hoyos.db.v1'));
  const current = await provider.get('plans', plan.id);
  await changeLocalPublication(provider, { planId: plan.id, action: 'withdraw', expectedRevision: current.frontend_publication.revision, actorId: 'usr_admin', expectedTenant: 'ten_hoy' });
  const withdrawn = JSON.parse(store.get('hoyos.db.v1'));
  const missing = structuredClone(published); missing.db.plans = missing.db.plans.filter(row => row.id !== plan.id);
  for(const snapshot of [published,withdrawn,missing])unchanged(fixture.db,snapshot.db);globalThis.Date=NodeDate;if(priorStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=priorStorage;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  const format = (amount, lang) => new Intl.NumberFormat(lang === 'es' ? 'es-CO' : 'en-US').format(amount);
  for (const lang of ['en', 'es']) for (const width of [390, 1280]) for (const [state, snapshot] of [['published', published], ['withdrawn', withdrawn], ['missing', missing]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 950 }, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
    await ctx.addInitScript(({ snapshot, lang }) => { localStorage.setItem('hoyos.db.v1', JSON.stringify(snapshot)); localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_public', viewAs: null, devMode: false })); }, { snapshot, lang });
    const p = await ctx.newPage(); debug = p; p.on('pageerror', error => errors.push(error.message));
    await p.clock.install({ time: new Date(faqPricingNow) }); await p.clock.pauseAt(new Date(faqPricingNow));
    await p.goto(base + '/#/site/faq');
    const panel = p.locator('.accordion-item').filter({ hasText: lang === 'es' ? 'QA precios publicados' : 'QA published prices' });
    await panel.waitFor();
    for(const question of (lang==='es'?['QA FAQ AJENA NO DEBE APARECER','QA FAQ BORRADOR NO DEBE APARECER']:['QA FOREIGN FAQ MUST STAY PRIVATE','QA UNPUBLISHED FAQ MUST STAY PRIVATE'])){assert(!(await p.locator('.site').innerText()).includes(question),'foreign/unpublished FAQ cannot render');assert(!(await p.locator('script[type="application/ld+json"]').allTextContents()).join(' ').includes(question),'foreign/unpublished FAQ cannot enter JSONLD');await p.locator('input[type=search]').fill(question);await p.waitForFunction(()=>document.querySelectorAll('.faq-groups .accordion-item').length===0);assert.equal(await p.locator('.faq-groups .accordion-item').count(),0,'foreign/unpublished FAQ cannot match search');}await p.locator('input[type=search]').fill('');await panel.waitFor();
    const answer = () => p.evaluate(question => { const schema = [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)).find(value => value['@type'] === 'FAQPage'); return schema?.mainEntity.find(row => row.name === question)?.acceptedAnswer.text; }, lang === 'es' ? 'QA precios publicados' : 'QA published prices');
    if (state === 'published') {
      await panel.getByText(new RegExp(format(123456, lang).replaceAll('.', '\\.'))).first().waitFor();
      assert.match(await panel.innerText(), /8 (classes|clases) · 45 (days|días)/);
      assert.equal(await panel.locator('th[scope=rowgroup]').filter({hasText: lang === 'es' ? 'Paquetes de clases' : 'Class packages'}).count(), 1);
      assert.equal(await panel.locator('th[scope=rowgroup]').filter({hasText: /12/}).count(), 0);
      assert((await answer()).includes(format(123456, lang)));
      const search = p.locator('input[type=search]'); await search.fill(format(123456, lang)); await panel.waitFor();
      await search.fill(format(600000, lang)); await panel.waitFor({ state: 'hidden' }); await search.fill(''); await panel.waitFor();
      await p.clock.runFor(200);
      await panel.getByText(new RegExp(format(345678, lang).replaceAll('.', '\\.'))).first().waitFor();
      assert((await answer()).includes(format(345678, lang))); assert(!(await answer()).includes(format(123456, lang)));
    } else {
      await panel.getByText(lang === 'es' ? 'No disponible: consulta los planes publicados.' : 'Unavailable: check the published plans.', { exact: true }).first().waitFor();
      assert(!(await panel.innerText()).includes(format(123456, lang))); assert(!(await panel.innerText()).includes(format(600000, lang)));
      assert(!(await answer()).includes(format(123456, lang))); assert(!(await answer()).includes(format(600000, lang)));
    }
    assert.equal(await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('hoyos.db.v1')).db.faq_entries)), JSON.stringify(snapshot.db.faq_entries));
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await readablePriceLayout(panel,width);await p.screenshot({ path: `${out}/${lang}-${width}-${state}.jpg`, fullPage: true, quality: 65 });
    await p.evaluate(()=>document.documentElement.dataset.theme='dark');if(state==='published')assert((await panel.innerText()).includes(format(345678,lang)));else{assert(!(await panel.innerText()).includes(format(123456,lang)));assert(!(await panel.innerText()).includes(format(600000,lang)));}await readablePriceLayout(panel,width);await p.screenshot({path:`${out}/${lang}-${width}-${state}-dark.jpg`,fullPage:true,quality:65});
    checks.push(`${lang}/${width}/${state}: production table/search/JSONLD as applicable, published dates, no stale amount or authored edits`);
    await ctx.close(); debug = null;
  }
  assert.equal(checks.length,12,'complete FAQ production matrix');assert.deepEqual(errors, []);
  const response = await fetch(base + '/release.json');
  const manifest = await response.json();
  await writeFile(out + '/results.json', JSON.stringify({ base, manifest, checks, errors, provenance: 'Built local working tree; manifest identifies base HEAD until local commit. Final handoff records source tree.' }, null, 2));
  console.log('PASS production FAQ:', checks.length, 'EN/ES390/1280 published/withdrawn/missing groups, dated transition/search/JSONLD, no page errors');
} catch (error) { if (debug) { await debug.screenshot({ path: out + '/failure.jpg', fullPage: true }); await writeFile(out + '/failure.txt', await debug.locator('body').innerText()); } throw error; }
finally { globalThis.Date=NodeDate;if(priorStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=priorStorage;await browser?.close(); await rm(scratch, { recursive: true, force: true }); }
