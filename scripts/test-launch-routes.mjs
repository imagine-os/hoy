// The launch route allowlist (src/config/launchRoutes.ts) against the routes the modules register. The production
// build keeps only routes whose path pattern is listed exactly, so a production page listed under another pattern
// (`/app/vouchers/:id` for `/app/vouchers/:code`) silently doesn't exist and its links land on `/`.
import { readFile, readdir } from 'node:fs/promises';
import { reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('launch routes');
const src = await readFile('src/config/launchRoutes.ts', 'utf8');
const body = src.slice(src.indexOf('LAUNCH_ROUTES'), src.indexOf('];', src.indexOf('LAUNCH_ROUTES')));
const list = [...body.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
// The same rule as isLaunchRoute.
const listed = (path) => list.some((p) => (p.endsWith('/*') ? path === p.slice(0, -2) || path.startsWith(p.slice(0, -1)) : path === p));

// Routes a module registers only for the production build: a route list under `PRODUCTION_BUILD ?`, a
// `productionRoutes` list, or a route whose element is a production page (`launch(` / `prod(`).
const production = [];
for (const dir of await readdir('src/modules')) {
  const file = await readFile(`src/modules/${dir}/index.ts`, 'utf8').catch(() => '');
  const prodBlock = file.match(/productionRoutes\s*=[\s\S]*?\];/)?.[0] ?? file.match(/routes:\s*RouteDef\[\]\s*=\s*PRODUCTION_BUILD\s*\?\s*\[[\s\S]*?\]\s*:/)?.[0] ?? '';
  for (const m of file.matchAll(/path:\s*'([^']+)'[^\n]*/g)) {
    if (prodBlock.includes(m[0]) || /element:\s*(launch|prod)\(/.test(m[0])) production.push(`${dir} ${m[1]}`);
  }
}
check('found the production routes of the launch modules', production.length >= 8, String(production.length));
for (const r of production) check(`production route is listed: ${r}`, listed(r.split(' ')[1]));

// The launch flows the tracker needs, by path.
const flows = ['/app/pay/:what/:id', '/app/receipts', '/app/receipts/:paymentId', '/staff/receipts/:paymentId', '/app/vouchers/:code',
  '/app/gift-voucher', '/admin/payments/report', '/app/checkout/:id', '/staff/transfers', '/admin/emails'];
for (const f of flows) check(`launch flow is listed: ${f}`, listed(f));
check('the gift purchase goes to the production gift page in the production build', /GIFT_PURCHASE_PATH = PRODUCTION_BUILD \? '\/app\/gift-voucher'/.test(src));
done();
