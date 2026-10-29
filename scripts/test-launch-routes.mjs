// The launch route allowlist (src/config/launchRoutes.ts) against the routes the modules register. The production
// build keeps only routes whose path pattern is listed exactly, so a production page listed under another pattern
// (`/app/vouchers/:id` for `/app/vouchers/:code`) silently doesn't exist and its links land on `/`.
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
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

// Links in production code: every literal app path (`to="/app/…"`, `nav('/app/…')`, `/app/x/${id}`) in the customer,
// website and payment screens must be a launch route, or the production link lands on `/`. A link that exists only in the
// review build says so on its line (`!PRODUCTION_BUILD && …`, `SERVER_RULES ? … : …`), sits in a review-only file, or is
// listed under GUARDED with the reason it can't be reached in production.
const LINK_SCOPE = ['src/modules/customer', 'src/modules/website', 'src/modules/transfers', 'src/modules/launch-receipts'];
const REVIEW_ONLY_FILES = new Set([
  'src/modules/customer/index.ts', // the route table itself (the production build drops unlisted routes)
  'src/modules/customer/pages/CheckoutPage.tsx', // ReviewCheckoutPage; production uses ServerCheckoutPage (pages.ts)
  'src/modules/customer/pages/EventPage.tsx', 'src/modules/customer/pages/PracticePage.tsx', 'src/modules/customer/pages/InvitePage.tsx',
  'src/modules/customer/pages/GiftPage.tsx', 'src/modules/customer/pages/RatePage.tsx', 'src/modules/customer/pages/WaitlistPage.tsx',
  'src/modules/customer/pages/PaymentMethodsPage.tsx', 'src/modules/customer/pages/StatePages.tsx',
]);
const GUARDED = {
  'src/modules/customer/pages/ClassDetailPage.tsx': { '/app/waitlist/:x': 'after `if (SERVER_RULES) { nav(checkout); return; }`' },
  'src/modules/customer/pages/MorePage.tsx': { '/app/state/empty': 'dev-mode demo states', '/app/state/declined': 'dev-mode demo states', '/app/state/cancelled': 'dev-mode demo states' },
  'src/modules/customer/auth/customerReturn.ts': { '/app/voucher-gifts': 'return-path allowlist, not a link', '/app/gift': 'return-path allowlist, not a link' },
};
const segOk = (a, b) => a === b || b.startsWith(':') || a.startsWith(':');
const linkListed = (path) => list.some((p) => {
  if (p.endsWith('/*')) { const pre = p.slice(0, -2); return path === pre || path.startsWith(`${pre}/`); }
  const A = path.split('/'), B = p.split('/');
  return A.length === B.length && A.every((x, i) => segOk(x, B[i]));
});
const files = execFileSync('git', ['ls-files', ...LINK_SCOPE]).toString().trim().split('\n').filter((f) => /\.tsx?$/.test(f));
const linkRe = /(['"`])(\/(?:app|staff|admin|site)(?:[/?#][^'"`\s]*)?)\1/g;
const unlisted = [];
let scanned = 0;
for (const f of files) {
  if (REVIEW_ONLY_FILES.has(f)) continue;
  const lines = (await readFile(f, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    if (/PRODUCTION_BUILD|SERVER_RULES/.test(line)) return;
    for (const m of line.matchAll(linkRe)) {
      scanned++;
      const path = m[2].replace(/\$\{[^}]*\}/g, ':x').split(/[?#]/)[0].replace(/(.)\/$/, '$1');
      if (!linkListed(path) && !GUARDED[f]?.[path]) unlisted.push(`${f}:${i + 1} ${path}`);
    }
  });
}
check('scanned the app links of the customer, website and payment screens', scanned >= 40, String(scanned));
check('every production link is a launch route (or marked review-only)', unlisted.length === 0, unlisted.join(', '));
for (const f of REVIEW_ONLY_FILES) check(`review-only file exists: ${f}`, files.includes(f));
done();
