// H-5 production build checks: the launch payment screens replace the review demo screens, and the browser copies of
// the price, quote and receipt-numbering rules refuse to run in production (gap analysis §3).
// Run: node scripts/test-h5-production-build.mjs   (QA_PROD_DIST=<dir> reuses a production build instead of building)
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const temp = await mkdtemp(join(tmpdir(), 'hoy-h5-prod-'));
try {
  let dist = process.env.QA_PROD_DIST;
  if (!dist) {
    dist = join(temp, 'dist');
    execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, VITE_HOY_BUILD: 'production' }, stdio: 'inherit' });
  }
  const files = (await readdir(join(dist, 'assets'))).filter((f) => f.endsWith('.js'));
  const js = (await Promise.all(files.map((f) => readFile(join(dist, 'assets', f), 'utf8')))).join('\n');
  check('production: the review demo transfer queue is not shipped', !js.includes('Cola de transferencias demo') && !js.includes('Revisar comprobantes ficticios locales'));
  // Its strings stay in the module's string table; the page itself (its test ids) must be gone.
  check('production: the review product draft prototype page is not shipped', !js.includes('"data-testid":"quote-snapshot"') && !js.includes('"data-testid":"published-quote-snapshot"'));
  check('production: the launch payment, product and settings screens are shipped', ['payLaunch.queue.title', 'payLaunch.pay.send', 'products.launch.newPrice', 'bookingPolicies.save', 'payLaunch.receipt.noVat'].every((k) => js.includes(k)));
  // The guards as Vite folded them into the shipped bundle (not only the esbuild copy below): freezeSaleQuote, checkSaleQuote and
  // captureLaunchReceipt become a bare throw; reviseProduct is not shipped at all (its draft page is not routed).
  check('production: the shipped bundle carries the server_decides guards', (js.match(/throw Error\("server_decides"\)/g) ?? []).length >= 3);
  // H-9: the unsent demo email preview in LaunchPaymentReceipt is review-build only.
  check('production: the demo receipt email preview is not shipped', !js.includes('data-receipt-email-body'));
  check('production: the launch routes are registered', ['/app/pay/:what/:id', '/admin/payments/report', '/admin/settings/booking-policies', '/staff/receipts/:paymentId'].every((r) => js.includes(r)));

  const load = async (mode) => {
    const outfile = join(temp, `rules-${mode}.mjs`);
    await build({ stdin: { contents: "export { freezeSaleQuote, checkSaleQuote } from './src/data/operationalQuotes'; export { captureLaunchReceipt } from './src/data/launchReceipts'; export { reviseProduct } from './src/data/productCatalog';", resolveDir: process.cwd(), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent', define: { 'import.meta.env': JSON.stringify({ VITE_HOY_BUILD: mode, DEV: false }) } });
    return import(pathToFileURL(outfile).href);
  };
  const P = await load('production'), R = await load('review');
  const refuses = async (f) => { try { await f(); return false; } catch (e) { return e?.message === 'server_decides'; } };
  const quote = { kind: 'class', amount: 1, validityDays: 30, itemId: 'single', name: { es: 'x', en: 'x' } };
  const def = { code: 'X1', name: { es: 'x', en: 'x' }, type: 'paquetes', classes: 1, validityDays: 30, active: true, prices: [{ id: 'p', amount: 1, startsOn: '2026-11-01', endsOn: null }] };
  check('production: the browser quote cannot set a charged price (freezeSaleQuote)', await refuses(() => P.freezeSaleQuote(quote)));
  check('production: the browser quote re-check refuses (checkSaleQuote)', await refuses(() => P.checkSaleQuote({ name: 'companyos' }, quote)));
  check('production: the browser never numbers a receipt (captureLaunchReceipt)', await refuses(() => P.captureLaunchReceipt({ name: 'companyos' }, { id: 'p' }, { source: 'desk-sale' })));
  check('production: the browser product draft history refuses (reviseProduct)', await refuses(() => P.reviseProduct(null, def, 'usr', new Date().toISOString())));
  check('review build unchanged: the same rules still run there', !(await refuses(() => R.freezeSaleQuote(quote))) && !(await refuses(() => R.reviseProduct(null, def, 'usr', new Date().toISOString()))));
} finally { await rm(temp, { recursive: true, force: true }); }
console.log(failed ? `\n${failed} FAILED` : '\nall H-5 production-build checks passed');
process.exit(failed ? 1 : 0);
