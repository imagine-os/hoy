// Route connectivity (Hoy all-roles, lane G): every production route reads and writes through a working Company OS
// adapter. For each route the production build registers (src/config/launchRoutes.ts), this bundles the page the way the
// production build sees it (PRODUCTION_BUILD folded to true, review-only branches dropped, tree-shaken, dynamic imports
// followed) and reads, module by module, every table, provider method and request() path the page can reach. It then
// judges each use against the adapters in src/data/companyos/mapping.ts and the methods CompanyOSProvider really has.
//
// A finding is a route that reaches:
//   sink        a `sink` table read (always empty) — or written, outside BY_DESIGN;
//   unknown     a table with no adapter (reads empty, writes refuse not_in_launch);
//   read_only   a write to a static or read-only table (refuses read_only / its code);
//   member      an update or removal of a `user_roles` row (refuses not_in_launch);
//   stub        a provider method that only throws (`promotion()`);
//   missing     an optional DataProvider method CompanyOSProvider lacks (appendClassPayRule, editSession…);
//   voucher     the `voucher()` command (only issue-with-classes and claim are connected; the extras refuse);
//   not_in_launch  page code that throws not_in_launch itself;
//   mock_only   page code that branches on `data.name === 'mock'`: the flow runs only on the review build's MockProvider
//               (on Company OS it throws …_disconnected, or the control is hidden);
//   dynamic     a table name the check cannot resolve (explain it in DYNAMIC);
//   signed_out  on a signed-out page, an entity read the provider answers from the built-in catalogue or with nothing.
//
// The rule (docs/route-connectivity.md): a route enters LAUNCH_ROUTES only when this check is green for it.
// PENDING lists the findings another Wave 1 lane is closing now, each naming its lane; OPEN lists the findings the
// audit found that no lane is closing yet (each names the wave or reuse-map row that would, or `unassigned`). The check
// fails on any finding in neither list, and on any entry route that no longer has its finding (the closing lane, or the
// coordinator at merge, deletes it). A route added to LAUNCH_ROUTES never gets an OPEN entry: it must be green, unless
// the owner approved launching it with named gaps (ADDED_ROUTES below): then each of its OPEN entries carries
// `approved` (who, when, where it is recorded) and names the wave that closes it, and the check prints it that way.
//
//   node scripts/test-route-connectivity.mjs            the check (CI: .github/workflows/auth-checks.yml)
//   node scripts/test-route-connectivity.mjs --report   also print every route's inventory (launch and cut routes)
//   node scripts/test-route-connectivity.mjs --write    rewrite the two inventory tables in docs/route-connectivity.md
// The check fails when those committed tables differ from what the code gives (review round 2, L5): the doc can't drift.
import * as esbuild from 'esbuild';
import { readFile, readdir, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { reporter } from './lib/launch-qa.mjs';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const REPORT = process.argv.includes('--report') || WRITE;
const DOC = 'docs/route-connectivity.md';
const INVENTORY = { launch: '## Inventory: launch routes', cut: '## Inventory: routes Waves 1–4 add back' };
const { check, done } = reporter('route connectivity');

// ── Known findings. `routes` are LAUNCH_ROUTES patterns ('*' = the app shell every route renders in), `finding` the
// `<kind> <subject>` the check prints. Delete a route (or the entry) when its finding is gone.
// PENDING: another Wave 1 lane is closing it now.
const PENDING = [
];
// Lane Y3 (Hoy test-fixes): the Hub's Construction & testing band ships for the super admin (R-08 answered for these pages).
const CONSTRUCTION_ROUTES = ['/manual', '/manual/decisions', '/manual/:chapter', '/docs', '/docs/*', '/docs/source', '/dev/knowledgebase'];
// Routes added to LAUNCH_ROUTES after this audit (lane C's role homes, lane D's Hub). Green, or owner-approved per entry.
const ADDED_ROUTES = ['/teach', '/admin/content', '/dev', '/hub', ...CONSTRUCTION_ROUTES];
// The owner's approval for the two role homes that launch with "available later" sections (lane H plan, P-03b).
const ROLE_HOMES_APPROVED = 'owner, 2026-10-31: role homes launch with "available later" sections and refused saves (lane H plan cryptic-swimming-whale; decision log P-03b)';
// OPEN: found by this audit (lane G, 2026-10-31) on routes already in LAUNCH_ROUTES, with no lane closing it yet.
const OPEN = [
  // The role homes lane C added (`/teach` Teacher S-03, `/admin/content` Marketing M-02) stay in the launch (owner,
  // 2026-10-31, lane H). Lane H1 made what is connected read live (the classes, today's rosters, the week; the content
  // editor's lists) and the rest say "available later" in production (content saves are refused `content_later`).
  // The code that waits for its wave is still on the route (hidden at run time), so each entry names its wave.
  ...[['sink audit_log', 'Wave 4 (teacher app: substitute requests log to the audit)'], ['mock_only modules/teacher/substituteRequest.ts', 'Wave 4 (teacher app: substitute requests)'], ['unknown practice_goals', 'Wave 2 (practice goals; "Mis números")'], ['unknown reviews', 'Wave 3 (class reviews; the rating tile)'], ['unknown space_bookings', 'Wave 4 (teacher app: specials)'], ['unknown special_charges', 'Wave 4 (teacher pay: specials payouts)']]
    .map(([finding, lane]) => ({ finding, lane, approved: ROLE_HOMES_APPROVED, routes: ['/teach'], note: 'the Teacher home S-03: hidden in production ("available later"); the hooks still run on unconnected tables, which read empty with no request' })),
  ...['unknown teacher_profile_proposals', 'sink audit_log', 'mock_only modules/profile-review/contracts.ts', 'unknown events', 'unknown class_pay_rules', 'missing appendClassPayRule', 'dynamic table', 'mock_only modules/admin/contentRecovery.ts', 'dynamic entity2', 'missing contentBatch', 'missing generateRecurrence']
    .map((finding) => ({ finding, lane: 'Wave 3 (content entities)', approved: ROLE_HOMES_APPROVED, routes: ['/admin/content'], note: 'the Marketing home M-02: reads live; timetable rows save to schedule (lane Y5, timetableSave.ts, classes.write); every other save is refused content_later before anything is sent (contentRecovery.ts), bulk and recurrence are absent on Company OS' })),
  { finding: 'unknown events', lane: 'Wave 3', routes: ['/admin/settings/*', '/admin/class-schedule/*'], note: 'Events and RSVPs (reuse map); useMediaLibrary reads events for media use' },
  { finding: 'unknown reviews', lane: 'Wave 3', routes: ['/site/*'], note: 'Class reviews (reuse map); the site home reads reviews' },
  { finding: 'unknown practice_goals', lane: 'Wave 2', routes: ['/admin/analytics', '/admin/crm/:id', '/app'], note: 'Maintenance records, practice goals (reuse map); data/useAnalytics.ts' },
  { finding: 'sink activity_events', lane: 'Wave 2', routes: ['/app'], note: 'practice milestones and streaks (data/useAnalytics.ts, customer/HomePage.tsx): with practice goals' },
  // Lane H2 connected deletion_requests (a customer's privacy_request, forms); the signed-out page (W-09) still has no session.
  { finding: 'signed_out deletion_requests (write)', lane: 'unassigned (needs a submit-only forms identity and a Hoy server submit route, ADR 0042, as Between Gigs)', routes: ['/site/*'], note: 'website DeleteAccountPage (W-09) inserts a deletion request signed out: the Hoy server answers 401. A signed-in customer asks from /app/account (C-26, H1).' },
  { finding: 'unknown waitlist', lane: 'Wave 2', routes: ['/staff', '/staff/checkin'], note: 'Waitlist (reuse map: bookings waitlist_entry)' },
  { finding: 'unknown payroll_runs', lane: 'Wave 4', routes: ['/admin/finance'], note: 'Teacher app and teacher pay (reuse map); admin/payouts.ts' },
  { finding: 'unknown payroll_lines', lane: 'Wave 4', routes: ['/admin/finance'], note: 'Teacher app and teacher pay (reuse map); admin/payouts.ts' },
  // Signed out (lane G2): reads outside the live public set (SIGNED_OUT_LIVE) come back empty without asking Company OS.
  // Lane H2 closed `signed_out tenants (empty)` and `signed_out bookings (empty)` (the public settings record and the
  // booked mats are read live).
];

// ── Uses that are unconnected on purpose: the production behaviour IS the empty read or the dropped write.
// Keep this short; every entry needs the reason the empty or dropped answer is right in production.
const BY_DESIGN = [
  { finding: 'unknown page_layouts', file: 'src/layout/useLayout.ts', why: 'the stored section order of the layout editor (/dev/layout, review only); production renders the spec order, which is what an empty read gives' },
  { finding: 'missing peek', file: 'src/modules/quotes/hooks.ts', why: 'peek() is only the first-render snapshot; the hook then reads list(\'plans\') from Company OS' },
  { finding: 'sink audit_log', op: 'insert', why: 'the client\'s own audit row is dropped (mapping.ts sink); Company OS writes the audit entry for every write itself (GET /t/:t/audit)' },
  { finding: 'sink audit_log', op: 'read', file: 'src/modules/staff/HomePage.tsx', why: 'the hook runs, but the timeline it feeds renders only in the review build (`!PRODUCTION_BUILD &&`)' },
  { finding: 'mock_only data/useMediaLibrary.ts', why: 'device-local photos exist only in the review build; production lists the shipped media catalogue' },
  { finding: 'signed_out tenants (write)', file: 'src/modules/admin/settings.ts', why: 'useSettings() returns save() next to the settings; no signed-out page calls it (the site, MapSlot and DeleteAccountPage take only `settings`). Since lane H2 the site reads the public settings record live, so the row exists signed out: a call would still write nothing, since the save is sent without a session (the Hoy server answers 401) and the site\'s identity is read-only (ADR 0029)' },
];

// ── Table names passed in a variable. `tables`: the values it takes (judged like literals). `via`: the helper forwards
// its argument number `argIndex` to the provider, so the helper's call sites (in the same file, or anywhere on the
// route with scope 'route') name the tables.
const DYNAMIC = [
  { file: 'src/modules/customer/useScopedCustomerRead.ts', arg: 'table', via: ['useScopedCustomerRead'], scope: 'route', why: 'the customer read hook: its callers name the table' },
  { file: 'src/modules/customer/useCustomerRows.ts', arg: 'table', via: ['useCustomerRows'], scope: 'route', why: 'the customer rows hook: its callers name the table' },
  { file: 'src/modules/customer/accountData.ts', arg: 'table', via: ['owned'], argIndex: 2, why: 'owned(data, actor, table, column) helper in the same file' },
];

// ── Modules whose provider calls run only on the review build, chosen at run time (the check cannot fold it).
// `marker` must stay in the file: it is the switch that sends production elsewhere.
const RUNTIME_REVIEW = [
  { file: /^src\/modules\/website\/(archive\/|pages\/ClassicHomePage\.tsx$)/, markerFile: 'src/modules/website/edition.ts', marker: "launchConfig().reviewTools ? params.get('version') : null", why: 'the archived and classic editions of the site open only with ?version=, which the production build ignores (reviewTools is off)' },
  { file: 'src/modules/admin/expenseLedger.ts', marker: "onServer=(data:DataProvider)=>data.name==='companyos'", why: 'FI04 browser ledger; on Company OS every command goes to expenseServer.ts (traced)' },
];

// ── Public routes only a signed-in person reaches (their reads are not signed-out reads).
const SIGNED_IN_PUBLIC = {
  '/auth/callback': 'Clerk has just signed the person in; the page reads /me and the person, never signed out',
  '/no-access': 'shown to a signed-in person whose role opens nothing',
};

// Review-only modules: left out of the production glob (vite.config.ts REVIEW_ONLY_MODULES, read from there).
const viteSrc = await readFile('vite.config.ts', 'utf8');
const REVIEW_ONLY_MODULES = [...(viteSrc.match(/REVIEW_ONLY_MODULES\s*=\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const PROVIDER_FILES = /^src\/data\/(companyos\/|MockProvider\.ts|SupabaseProvider\.ts|DataContext\.tsx|types\.ts)/;
// The demo data the production build marks side-effect free (vite.config.ts REVIEW_ONLY_DATA).
const REVIEW_ONLY_DATA = /\/src\/(hub\/(?!hubMap\.data\.ts$).+|auth\/demoUsers|app\/frameSession|data\/MockProvider|data\/seed\/(?!(catalog|timetable|content|legal|media|studioPolicies)\.ts$).+)\.tsx?$/;

// ── The adapters and the provider, as the production code defines them ─────────────────────────────────────────
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'route-connectivity');
async function loadTs(file) {
  const out = path.join(CACHE, `${path.basename(file).replace(/\W/g, '_')}.mjs`);
  await esbuild.build({ entryPoints: [file], outfile: out, bundle: true, format: 'esm', platform: 'node', packages: 'external', logLevel: 'silent',
    define: { __HOY_BUILD__: '"production"', 'import.meta.env': '{"VITE_HOY_BUILD":"production","DEV":false,"PROD":true}' }, loader: LOADERS });
  return import(`${out}?t=${Date.now()}`);
}
const LOADERS = Object.fromEntries(['.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.md', '.woff', '.woff2', '.mp4', '.webm', '.html', '.txt'].map((e) => [e, 'empty']));

const { adapters } = await loadTs('src/data/companyos/mapping.ts');
const providerSrc = await readFile('src/data/companyos/CompanyOSProvider.ts', 'utf8');
const typesSrc = await readFile('src/data/types.ts', 'utf8');
const schemaSrc = await readFile('src/data/schema.ts', 'utf8');

const SCHEMA_TABLES = new Set([...schemaSrc.matchAll(/^\s*\{\s*name:\s*'([a-z_]+)',\s*group:/gm)].map((m) => m[1]));
const KNOWN_TABLES = new Set([...SCHEMA_TABLES, ...Object.keys(adapters)]);

// Methods CompanyOSProvider defines (class body, two-space indent), and the ones whose body only throws.
const classBody = providerSrc.slice(providerSrc.indexOf('export class CompanyOSProvider'));
const PROVIDER_METHODS = new Set([...classBody.slice(0, classBody.indexOf('\n}\n')).matchAll(/^ {2}(?:async\s+|private\s+|static\s+|readonly\s+)*([a-zA-Z]\w*)\s*(?:<[^>]*>)?\(/gm)].map((m) => m[1]));
const STUBS = new Set([...classBody.matchAll(/^ {2}async\s+(\w+)\([^)]*\)[^{]*\{\s*throw\b/gm)].map((m) => m[1]));
const dpBody = typesSrc.slice(typesSrc.indexOf('export interface DataProvider'), typesSrc.indexOf('\n}\n', typesSrc.indexOf('export interface DataProvider')));
const OPTIONAL = [...dpBody.matchAll(/^\s*(\w+)\?\s*[(<:]/gm)].map((m) => m[1]);
const MISSING = new Set(OPTIONAL.filter((m) => !PROVIDER_METHODS.has(m)));
// Signed out (lane F), list() and get() answer the provider's PUBLIC_TABLES live through the Hoy server's public_site
// identity, which forwards only the entities in server/app.mjs PUBLIC_ENTITIES; every other table reads as empty without
// a request, and a write has no session (the server answers 401). Both lists are read from the code, never copied here.
const serverSrc = await readFile('server/app.mjs', 'utf8');
const setOf = (src, name) => [...(src.match(new RegExp(String.raw`const ${name}\s*=\s*new Set\(\[([^\]]*)\]\)`))?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const SIGNED_OUT_MODEL = {
  // list(): `if (!(await this.transport.signedIn())) return (a.kind === 'entity' && PUBLIC_TABLES.has(table) ? … : [])`
  // (lane H2: `if (!(await this.transport.signedIn())) { if (!PUBLIC_TABLES.has(table)) return []; …settings… entity… }`)
  listGuard: /if\s*\(!\(await this\.transport\.signedIn\(\)\)\)\s*return\s*\(a\.kind === 'entity' && PUBLIC_TABLES\.has\(table\)\s*\?[^:\n]*:\s*\[\]\)/.test(classBody)
    || /if\s*\(!\(await this\.transport\.signedIn\(\)\)\)\s*\{\s*if\s*\(!PUBLIC_TABLES\.has\(table\)\)\s*return \[\];/.test(classBody),
  // get(): `if (!signedIn && !PUBLIC_TABLES.has(table)) return null;`
  getGuard: /if\s*\(!signedIn && !PUBLIC_TABLES\.has\(table\)\)\s*return null;/.test(classBody),
  providerTables: setOf(providerSrc, 'PUBLIC_TABLES'),
  serverEntities: setOf(serverSrc, 'PUBLIC_ENTITIES'),
};
/** The entity a table reads signed out: an entity adapter's, or `setting` for the studio settings (lane H2). */
const publicEntityOf = (a) => (a?.kind === 'entity' ? a.entity : a?.kind === 'settings' ? 'setting' : null);
SIGNED_OUT_MODEL.unserved = SIGNED_OUT_MODEL.providerTables.filter((t) => !SIGNED_OUT_MODEL.serverEntities.includes(publicEntityOf(adapters[t])));
/** A request() the Hoy server forwards signed out (server/app.mjs publicRead()); `:x` is an interpolated id. */
const publicRequest = (r) => r === 'POST /query' || SIGNED_OUT_MODEL.serverEntities.some((e) => r === `GET /api/${e}` || r === `GET /api/${e}/:x`);
/** The tables a signed-out page reads live: in PUBLIC_TABLES, an entity adapter, and its entity forwarded by the server. */
const SIGNED_OUT_LIVE = new Set(SIGNED_OUT_MODEL.providerTables.filter((t) => !SIGNED_OUT_MODEL.unserved.includes(t)));

check('read the adapters (mapping.ts)', Object.keys(adapters).length >= 20, String(Object.keys(adapters).length));
check('read the provider methods (CompanyOSProvider.ts)', ['list', 'insert', 'atomic', 'request'].every((m) => PROVIDER_METHODS.has(m)), [...PROVIDER_METHODS].join(','));
check('read the review-only modules (vite.config.ts; none since lane Y3 ships the docs browser)', /REVIEW_ONLY_MODULES(?::\s*string\[\])?\s*=\s*\[/.test(viteSrc) && !REVIEW_ONLY_MODULES.includes('docs'), REVIEW_ONLY_MODULES.join(','));
check('read the optional DataProvider methods (types.ts)', OPTIONAL.length >= 5, OPTIONAL.join(','));

// ── Production routes ───────────────────────────────────────────────────────────────────────────────────────────
const launchSrc = await readFile('src/config/launchRoutes.ts', 'utf8');
const LAUNCH = [...launchSrc.slice(launchSrc.indexOf('LAUNCH_ROUTES'), launchSrc.indexOf('];', launchSrc.indexOf('LAUNCH_ROUTES'))).matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
check('the Construction & testing band routes are launch routes (lane Y3)', CONSTRUCTION_ROUTES.every((r) => LAUNCH.includes(r)), CONSTRUCTION_ROUTES.filter((r) => !LAUNCH.includes(r)).join(', '));
const launchPattern = (p) => LAUNCH.find((l) => (l.endsWith('/*') ? p === l.slice(0, -2) || p.startsWith(l.slice(0, -1)) : p === l));

/** The routes a module registers in the production build: its production block when it has one, else all of them. */
async function productionRoutes(dir) {
  const file = `src/modules/${dir}/index.ts`;
  const src = await readFile(file, 'utf8').catch(() => '');
  if (!src) return [];
  if (/routes\s*:\s*RouteDef\[\]\s*=\s*PRODUCTION_BUILD\s*\?\s*\[\s*\]/.test(src)) return [];
  const block = src.match(/routes\s*:\s*RouteDef\[\]\s*=\s*PRODUCTION_BUILD\s*\?\s*\[[\s\S]*?\]\s*:/)?.[0]
    ?? (/PRODUCTION_BUILD\s*\?\s*productionRoutes\(\)/.test(src) ? src.match(/productionRoutes\b[\s\S]*?\];/)?.[0] : null)
    ?? src;
  const loaders = Object.fromEntries([...src.matchAll(/(\w+)\s*=\s*lazyPages\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)\s*\)/g)].map((m) => [m[1], m[2]]));
  // A wrapper around a loader (`const page = (name, props) => h(Guard, null, lazyPage(name, props))`).
  for (const m of src.matchAll(/const\s+(\w+)\b[^=\n]*=\s*\(\s*name\b[^)]*\)\s*=>[^\n]*?\b(\w+)\(\s*name\b/g)) if (loaders[m[2]]) loaders[m[1]] = loaders[m[2]];
  const imports = {};
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) for (const n of m[1].split(',')) { const [a, b] = n.trim().split(/\s+as\s+/); if (a) imports[b ?? a] = { from: m[2], name: a }; }
  const publicSpreads = new Set([...src.matchAll(/const\s+(\w+)\s*=\s*\{[^}]*surface:\s*'public'/g)].map((m) => m[1]));
  const out = [];
  for (const m of block.matchAll(/\{[^{}\n]*?path:\s*'([^']+)'[^\n]*/g)) {
    const line = m[0], routePath = m[1];
    const el = line.match(/element:\s*(\w+)\(\s*'(\w+)'/), direct = line.match(/element:\s*(?:createElement|h)\(\s*(\w+)/);
    let entry = null;
    if (el && loaders[el[1]]) entry = { from: path.join(`src/modules/${dir}`, loaders[el[1]]), name: el[2] };
    else if (direct && imports[direct[1]]) entry = { from: path.join(`src/modules/${dir}`, imports[direct[1]].from), name: imports[direct[1]].name };
    const spread = line.match(/\.\.\.(\w+)/)?.[1];
    const surfacePublic = /surface:\s*'public'/.test(line) || (spread && publicSpreads.has(spread)) || /roles:\s*EVERYONE/.test(line);
    out.push({ module: dir, path: routePath, entry, line, signedOut: Boolean(surfacePublic) && !SIGNED_IN_PUBLIC[routePath] });
  }
  return out;
}

const ROUTES = [];
for (const dir of (await readdir('src/modules')).sort()) if (!REVIEW_ONLY_MODULES.includes(dir)) ROUTES.push(...await productionRoutes(dir));
const unparsed = ROUTES.filter((r) => !r.entry);
check('every production route names its page (element parsed)', unparsed.length === 0, unparsed.map((r) => `${r.module} ${r.path}`).join(', '));
const launchRoutes = ROUTES.filter((r) => launchPattern(r.path));
check('found the launch routes', launchRoutes.length >= 60, String(launchRoutes.length));
const unregistered = LAUNCH.filter((l) => !ROUTES.some((r) => launchPattern(r.path) === l));
check('every LAUNCH_ROUTES pattern has a production route', unregistered.length === 0, unregistered.join(', '));

// ── Tracing a page ─────────────────────────────────────────────────────────────────────────────────────────────
const FLAGS = /\b(PRODUCTION_BUILD|SERVER_RULES)\b/g;
const FLAG_DEFS = new Set(['src/config/launch.ts', 'src/modules/customer/booking/bookingPolicy.ts']);
const tracer = {
  name: 'route-connectivity',
  setup(b) {
    b.onResolve({ filter: /\?/ }, (a) => ({ path: a.path, namespace: 'empty' }));
    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: 'export default ""', loader: 'js' }));
    // The review-only demo data is side-effect free in the production build, so an unused import drops it.
    b.onResolve({ filter: /^\.|^\// }, async (a) => {
      if (a.pluginData?.inner) return undefined;
      const r = await b.resolve(a.path, { kind: a.kind, importer: a.importer, resolveDir: a.resolveDir, pluginData: { inner: true } });
      return r.errors.length ? undefined : { path: r.path, sideEffects: REVIEW_ONLY_DATA.test(r.path) ? false : undefined };
    });
    // PRODUCTION_BUILD (and SERVER_RULES = PRODUCTION_BUILD) folded to true in every file that imports it.
    b.onLoad({ filter: /\.tsx?$/ }, async (a) => {
      let code = await readFile(a.path, 'utf8');
      const rel = path.relative(ROOT, a.path);
      if (!FLAG_DEFS.has(rel) && FLAGS.test(code)) {
        code = code.replace(/(import\s*\{)([^}]*)(\}\s*from)/g, (all, x, names, y) => x + names.replace(FLAGS, '$1 as __$1') + y);
        code = code.replace(/^(?!\s*import\b)(.*)$/gm, (line) => line.replace(FLAGS, 'true'));
      }
      FLAGS.lastIndex = 0;
      // `export const X = withEdition(Page)` at the top of a barrel: pure for this trace, so a route keeps only the
      // pages it names (esbuild keeps every unannotated top-level call, and with it every page of the barrel).
      code = code.replace(/^((?:export\s+)?const\s+[\w$]+\s*(?::[^=\n]+)?=\s*)(?=[A-Za-z_$][\w$.]*(?:<[^>\n]*>)?\()/gm, '$1/* @__PURE__ */ ');
      // A dynamic import (`lazy(() => import('./x'))`) becomes a static namespace import: the page still reaches it, and
      // esbuild does not wrap the shared modules in lazy initialisers it can no longer tree-shake.
      let n = 0;
      const dyn = [];
      code = code.replace(/\bimport\(\s*(['"])([^'"]+)\1\s*\)/g, (all, q, spec) => { const id = `__dyn${n++}`; dyn.push(`import * as ${id} from ${JSON.stringify(spec)};`); return `Promise.resolve(${id})`; });
      if (dyn.length) code = `${dyn.join('\n')}\n${code}`;
      return { contents: code, loader: a.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

const traced = new Map();
/** The bundled production code of `name` exported by `from`, split into its source modules. */
async function trace(from, name) {
  const key = `${from}#${name}`;
  if (traced.has(key)) return traced.get(key);
  const res = await esbuild.build({
    stdin: { contents: `export { ${name} } from ${JSON.stringify(path.resolve(ROOT, from))};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'browser', packages: 'external', treeShaking: true, minifySyntax: true,
    define: { __HOY_BUILD__: '"production"', 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_HOY_BUILD': '"production"' },
    loader: LOADERS, plugins: [tracer], logLevel: 'silent',
  });
  const text = res.outputFiles[0].text;
  const modules = [];
  // esbuild starts each source module with a `// <path>` line; prose strings are blanked so `data.update(table…` in a
  // description is not read as code (a table name never holds a space).
  for (const seg of text.split(/\n(?=\/\/ [^\n]+\.(?:tsx?|jsx?|mjs)\n)/)) {
    const file = seg.match(/^\/\/ ([^\n]+\.(?:tsx?|jsx?|mjs))\n/)?.[1];
    if (file) modules.push({ file, code: seg.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (q) => (/[\s(]/.test(q) ? '""' : q)) });
  }
  const out = { text, modules };
  traced.set(key, out);
  return out;
}

// A table argument: a string, a template literal (never resolved: fails as `dynamic`) or a (dotted) identifier.
const ARG = String.raw`("[^"]*"|\`[^\`]*\`|[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)`;
/** A literal that names a table: one the app declares or maps, or any snake_case name (a new table fails as unknown). */
const looksTable = (lit) => KNOWN_TABLES.has(lit) || /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(lit);
const unquote = (s) => (s.startsWith('"') ? s.slice(1, -1) : null);

const escapeRe = (x) => x.replace(/[$.?*+()[\]{}|\\^]/g, '\\$&');

/** Every table, method and request() use in the page's production code, with the module it sits in. */
function usesOf({ text, modules }, hits = new Set()) {
  const uses = [];
  // `var A = "x", B = "plans"`: esbuild merges consecutive declarations.
  // Every assignment to the name must be a string literal (a reassigned or computed name stays dynamic).
  const resolveIdent = (id) => {
    const all = [...text.matchAll(new RegExp(String.raw`(?<![\w$.])${escapeRe(id)}\s*=(?![=>])\s*("[^"]*"|[^\s,;)]+)`, 'g'))].map((m) => m[1]);
    return all.length && all.every((v) => /^"[a-z_]+"$/.test(v)) ? [...new Set(all.map((v) => v.slice(1, -1)))] : null;
  };
  const runtimeReview = (file) => RUNTIME_REVIEW.find((r) => (r.file instanceof RegExp ? r.file.test(file) : r.file === file));
  for (const { file, code } of modules) {
    if (PROVIDER_FILES.test(file) || runtimeReview(file)) continue;
    const table = (arg, op, strict, at = file) => {
      const lit = unquote(arg);
      if (lit !== null) { if (!strict || looksTable(lit)) uses.push({ file: at, op, table: lit }); return; }
      const r = arg.startsWith('`') ? null : resolveIdent(arg);
      if (r) { for (const t of r) if (!strict || looksTable(t)) uses.push({ file: at, op, table: t }); return; }
      const d = DYNAMIC.find((x) => x.file === file && x.arg === arg.replace(/\d+$/, ''));
      if (d) { hits.add(d); for (const t of d.tables ?? []) uses.push({ file, op, table: t }); return; }
      // Fail closed: a write's table must be known; a read through get/peek only when the name says it is a table.
      if (!strict || op !== 'read' || /table|entity/i.test(arg)) uses.push({ file, op, dynamic: arg });
    };
    for (const m of code.matchAll(new RegExp(String.raw`\b(useTable|useRow)\(\s*${ARG}`, 'g'))) table(m[2], 'read', false);
    for (const m of code.matchAll(new RegExp(String.raw`\.(list|peek)\??\.?\(\s*${ARG}`, 'g'))) table(m[2], 'read', m[1] === 'peek');
    for (const m of code.matchAll(new RegExp(String.raw`\.get\(\s*${ARG}\s*,`, 'g'))) table(m[1], 'read', true);
    for (const m of code.matchAll(new RegExp(String.raw`\.(insert|update|remove)\(\s*${ARG}`, 'g'))) table(m[2], m[1], true);
    // A helper that forwards its table argument (DYNAMIC `via`): its call sites name the tables.
    for (const d of DYNAMIC.filter((x) => x.via && (x.scope === 'route' || x.file === file))) for (const via of d.via) {
      const re = new RegExp(String.raw`\b${escapeRe(via)}\d*\(\s*${'(?:[\\w$.]+\\s*,\\s*)'.repeat(d.argIndex ?? 0)}${ARG}`, 'g');
      for (const m of code.matchAll(re)) { hits.add(d); table(m[1], d.op ?? 'read', false); }
    }
    // `data.promotion(…)`, and `const { promotion } = data` (destructured, then called bare).
    const destructured = [...code.matchAll(/\{([^{}]*)\}\s*=/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(/[\s:]/)[0])).map((n) => ({ 1: n }));
    for (const m of [...code.matchAll(/\.(\w+)\??\.?\(/g), ...destructured]) {
      if (STUBS.has(m[1])) uses.push({ file, op: 'method', method: m[1], stub: true });
      else if (MISSING.has(m[1])) uses.push({ file, op: 'method', method: m[1], missing: true });
      else if (m[1] === 'voucher') uses.push({ file, op: 'method', method: 'voucher' });
    }
    for (const m of code.matchAll(/\brequest\(\s*"(GET|POST|PATCH|DELETE)"\s*,\s*("[^"]*"|`[^`]*`)/g)) uses.push({ file, op: 'request', request: `${m[1]} ${m[2].slice(1, -1).replace(/\$\{[^}]*\}/g, ':x')}` });
    // A branch on the provider's name (`data.name !== 'mock'` → throw …_disconnected, `&& data.name === 'mock'` → shown):
    // the flow runs only on the review build's MockProvider, so on Company OS it refuses or disappears.
    if (/\.name\s*[!=]==?\s*"mock"/.test(code)) uses.push({ file, op: 'mock_only' });
    // not_in_launch thrown by page code. `if (!cos) throw …` after `cos = cosOf(data)` is the review build's guard:
    // cosOf() is non-null on CompanyOSProvider (it has request()), so that throw never runs in production.
    for (const m of code.matchAll(/(?:if\s*\(\s*!\s*([\w$]+)\s*\)\s*)?throw new [\w$]+\(\s*"not_in_launch"/g)) {
      const guard = m[1] && new RegExp(String.raw`\b${escapeRe(m[1])}\s*=\s*cosOf\d*\(`).test(code) && PROVIDER_METHODS.has('request');
      if (!guard) uses.push({ file, op: 'throws', code: 'not_in_launch' });
    }
  }
  return uses;
}

/** The finding a use is on this route, or null when it goes through a working adapter. */
function judge(use, route) {
  // Signed out, the Hoy server forwards only POST /query and GET /api/<public entity>[/<id>]; anything else is 401.
  if (use.op === 'request') return route.signedOut && !publicRequest(use.request) ? `signed_out request ${use.request}` : null;
  if (use.op === 'method') return use.stub ? `stub ${use.method}` : use.missing ? `missing ${use.method}` : 'voucher voucher';
  if (use.op === 'throws') return `not_in_launch ${use.file.replace(/^src\//, '')}`;
  if (use.op === 'mock_only') return `mock_only ${use.file.replace(/^src\//, '')}`;
  if (use.dynamic) return `dynamic ${use.dynamic}`;
  const a = adapters[use.table];
  const write = use.op !== 'read';
  if (!a) return `unknown ${use.table}`;
  if (a.kind === 'sink') return `sink ${use.table}`;
  if (write && a.kind === 'static') return `read_only ${use.table}`;
  if (write && a.kind === 'entity' && a.readOnly) return `read_only ${use.table}`;
  if (a.kind === 'session' && write) return `member ${use.table}`; // update/remove refuse; atomic() refuses an insert
  if (a.kind === 'settings' && use.op === 'remove') return `read_only ${use.table}`;
  // Legal texts are in the build: only publishing (an update of status) reaches Company OS (lane H2).
  if (a.kind === 'legal' && write && use.op !== 'update') return `read_only ${use.table}`;
  // Signed out: a write has no session (401); a read of anything but a static table or a live one is silently empty.
  if (route.signedOut && write) return `signed_out ${use.table} (write)`;
  if (route.signedOut && a.kind !== 'static' && a.kind !== 'legal' && !SIGNED_OUT_LIVE.has(use.table)) return `signed_out ${use.table} (empty)`;
  return null;
}
const byDesign = (finding, use) => BY_DESIGN.find((b) => b.finding === finding && (!b.op || b.op === use.op) && (!b.file || b.file === use.file));

async function analyse(route) {
  const bundle = await trace(route.entry.from, route.entry.name);
  if (process.env.DEBUG_ROUTE === route.path) console.log(bundle.modules.map((m) => m.file).join('\n'));
  const hits = new Set();
  const uses = usesOf(bundle, hits);
  const findings = new Map();
  for (const u of uses) {
    const f = judge(u, route);
    if (!f) continue;
    const d = byDesign(f, u);
    if (d) { hits.add(d); continue; }
    if (!findings.has(f)) findings.set(f, new Set());
    findings.get(f).add(`${u.op} in ${u.file}`);
  }
  return { uses, findings, hits };
}

// ── Hostile checks: synthetic pages the check must catch (and one it must pass) ────────────────────────────────
await mkdir(CACHE, { recursive: true });
const tmp = await mkdtemp(path.join(CACHE, 'synthetic-'));
process.on('exit', () => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const data = JSON.stringify(path.join(ROOT, 'src/data/DataContext'));
const synth = {
  'SinkPage.tsx': `import { useTable } from ${data};\nexport function SinkPage() { const { rows } = useTable('audit_log'); return rows.length; }`,
  'helper.ts': `import { useData } from ${data};\nexport function useHelper() { const d = useData(); return () => d.list('activity_events'); }`,
  'TransitivePage.tsx': `import { useHelper } from './helper';\nexport function TransitivePage() { return useHelper(); }`,
  'UnknownPage.tsx': `import { useTable } from ${data};\nexport function UnknownPage() { return useTable('not_a_table').rows.length; }`,
  'StubPage.tsx': `import { useData } from ${data};\nexport function StubPage() { const d = useData(); return () => d.promotion?.({} as never); }`,
  'StaticWritePage.tsx': `import { useData } from ${data};\nexport function StaticWritePage() { const d = useData(); return () => d.insert('faq_entries', {}); }`,
  'ReviewOnlyPage.tsx': `import { useTable } from ${data};\nimport { PRODUCTION_BUILD } from ${JSON.stringify(path.join(ROOT, 'src/config/launch'))};\nfunction Demo() { return useTable('audit_log').rows.length; }\nexport function ReviewOnlyPage() { return PRODUCTION_BUILD ? useTable('bookings').rows.length : Demo(); }`,
  'MockOnlyPage.tsx': `import { useData } from ${data};\nexport function MockOnlyPage() { const d = useData(); return () => { if (d.name !== 'mock') throw Error('x_disconnected'); return d.list('bookings'); }; }`,
  'RefusingPage.tsx': `export function RefusingPage() { return () => { throw new Error('not_in_launch'); }; }`,
  'NewTablePage.tsx': `import { useData } from ${data};\nexport function NewTablePage() { const d = useData(); return () => d.insert('brand_new_table', {}); }`,
  'ComputedPage.tsx': `import { useData } from ${data};\nexport function ComputedPage({ f }: { f: boolean }) { const d = useData(); const t = f ? 'faq_entries' : 'audit_log'; return () => d.insert(t, {}); }`,
  'ReassignedPage.tsx': `import { useData } from ${data};\nexport function ReassignedPage({ x }: { x: boolean }) { const d = useData(); let t = 'bookings'; if (x) t = String(Date.now()); return () => d.insert(t, {}); }`,
  'TemplatePage.tsx': `import { useTable } from ${data};\nexport function TemplatePage({ k }: { k: string }) { return useTable(\`audit_\${k}\`).rows.length; }`,
  'DestructuredStubPage.tsx': `import { useData } from ${data};\nexport function DestructuredStubPage() { const { promotion } = useData(); return () => promotion?.({} as never); }`,
  'RoleInsertPage.tsx': `import { useData } from ${data};\nexport function RoleInsertPage() { const d = useData(); return () => d.insert('user_roles', {}); }`,
  'CleanPage.tsx': `import { useTable } from ${data};\nexport function CleanPage() { return useTable('bookings').rows.length + useTable('faq_entries').rows.length; }`,
};
// Signed-out pages: one reads every live table, one reads an entity table outside the live set, one reads the studio
// settings row, one writes. The table names come from the derived model.
const LIVE_LIST = [...SIGNED_OUT_LIVE];
const OUTSIDE = Object.values(adapters).find((a) => a.kind === 'entity' && !SIGNED_OUT_LIVE.has(a.table))?.table ?? 'bookings';
synth['SignedOutLivePage.tsx'] = `import { useTable, useData } from ${data};\nexport function SignedOutLivePage() { const d = useData(); return ${JSON.stringify(LIVE_LIST)}.length + ${LIVE_LIST.map((t) => `useTable('${t}').rows.length + (d.get('${t}', 'x') ? 1 : 0)`).join(' + ') || '0'}; }`;
synth['SignedOutOutsidePage.tsx'] = `import { useTable } from ${data};\nexport function SignedOutOutsidePage() { return useTable('${OUTSIDE}').rows.length; }`;
synth['SignedOutSettingsPage.tsx'] = `import { useTable } from ${data};\nexport function SignedOutSettingsPage() { return useTable('tenants').rows.length; }`;
synth['SignedOutLiveWritePage.tsx'] = `import { useData } from ${data};\nexport function SignedOutLiveWritePage() { const d = useData(); return () => d.update('${LIVE_LIST[0] ?? 'plans'}', 'x', {}); }`;
synth['SignedOutRequestPage.tsx'] = `import { useData } from ${data};\nexport function SignedOutRequestPage() { const d = useData() as unknown as { request(m: string, p: string): unknown }; return () => d.request('POST', '/api/booking'); }`;
synth['SignedOutPublicRequestPage.tsx'] = `import { useData } from ${data};\nexport function SignedOutPublicRequestPage() { const d = useData() as unknown as { request(m: string, p: string): unknown }; return () => [d.request('POST', '/query'), d.request('GET', \`/api/${SIGNED_OUT_MODEL.serverEntities[0] ?? 'product'}/\${String(Date.now())}\`)]; }`;
synth['SignedOutWritePage.tsx'] = `import { useData } from ${data};\nexport function SignedOutWritePage() { const d = useData(); return () => d.update('tenants', 't', {}); }`;
for (const [f, c] of Object.entries(synth)) await writeFile(path.join(tmp, f), c);
const fake = async (file, signedOut = false) => [...(await analyse({ path: '/synthetic', signedOut, entry: { from: path.relative(ROOT, path.join(tmp, file)), name: file.replace(/\.tsx?$/, '') } })).findings.keys()];
const has = (list, f) => list.some((x) => x.startsWith(f));
check('hostile: a route that reads a sink table fails', has(await fake('SinkPage.tsx'), 'sink audit_log'));
check('hostile: a sink read two imports away fails (transitive)', has(await fake('TransitivePage.tsx'), 'sink activity_events'));
check('hostile: a table with no adapter fails', has(await fake('UnknownPage.tsx'), 'unknown not_a_table'));
check('hostile: a stubbed provider method fails', STUBS.has('promotion') && has(await fake('StubPage.tsx'), 'stub promotion'));
check('hostile: a write to a static table fails', has(await fake('StaticWritePage.tsx'), 'read_only faq_entries'));
check('the signed-out model was read (provider list() and get() guards, PUBLIC_TABLES, server PUBLIC_ENTITIES)',
  SIGNED_OUT_MODEL.listGuard && SIGNED_OUT_MODEL.getGuard && SIGNED_OUT_MODEL.providerTables.length > 0 && SIGNED_OUT_MODEL.serverEntities.length > 0, JSON.stringify(SIGNED_OUT_MODEL));
check('every table the provider reads live signed out is an entity the Hoy server forwards (else it answers 401)', SIGNED_OUT_MODEL.unserved.length === 0 && SIGNED_OUT_LIVE.size === SIGNED_OUT_MODEL.providerTables.length, SIGNED_OUT_MODEL.unserved.join(', '));
check('a signed-out page reading the live tables passes', SIGNED_OUT_LIVE.size > 0 && (await fake('SignedOutLivePage.tsx', true)).length === 0, (await fake('SignedOutLivePage.tsx', true)).join(', '));
check('hostile: a signed-out page reading a table outside the live set fails', !SIGNED_OUT_LIVE.has(OUTSIDE) && has(await fake('SignedOutOutsidePage.tsx', true), `signed_out ${OUTSIDE} (empty)`), OUTSIDE);
// Lane H2: the studio's public settings record is read live signed out (decision F-01).
check('a signed-out read of the settings row passes (the public record, read live)', SIGNED_OUT_LIVE.has('tenants') && !has(await fake('SignedOutSettingsPage.tsx', true), 'signed_out tenants'), (await fake('SignedOutSettingsPage.tsx', true)).join(', '));
check('hostile: a signed-out write fails', has(await fake('SignedOutWritePage.tsx', true), 'signed_out tenants (write)'));
check('hostile: a signed-out write to a live table fails', has(await fake('SignedOutLiveWritePage.tsx', true), `signed_out ${LIVE_LIST[0]} (write)`), LIVE_LIST[0]);
check('hostile: a signed-out request the Hoy server does not forward fails', has(await fake('SignedOutRequestPage.tsx', true), 'signed_out request POST /api/booking'));
check('a signed-out request the Hoy server forwards (POST /query, GET /api/<public entity>) passes', (await fake('SignedOutPublicRequestPage.tsx', true)).length === 0, (await fake('SignedOutPublicRequestPage.tsx', true)).join(', '));
// The BY_DESIGN settings save rests on the row being empty signed out: once the settings are read live, revisit it.
// Revisited by lane H2: with tenants read live, the reason must not rest on an empty row.
check('BY_DESIGN signed_out tenants (write) still holds (its reason matches the live read)', !BY_DESIGN.some((b) => b.finding === 'signed_out tenants (write)') || !SIGNED_OUT_LIVE.has('tenants') || BY_DESIGN.some((b) => b.finding === 'signed_out tenants (write)' && /read-only/.test(b.why) && !/the row is empty/.test(b.why)));
check('the same reads signed in are not signed-out findings', !has(await fake('SignedOutOutsidePage.tsx'), 'signed_out') && !has(await fake('SignedOutWritePage.tsx'), 'signed_out'));
check('hostile: a write to a new table with no adapter fails', has(await fake('NewTablePage.tsx'), 'unknown brand_new_table'));
check('hostile: a write whose table is computed fails (dynamic)', has(await fake('ComputedPage.tsx'), 'dynamic t'));
check('hostile: a reassigned table name is not resolved to its first value', has(await fake('ReassignedPage.tsx'), 'dynamic t'));
check('hostile: a template-literal table name fails (dynamic)', has(await fake('TemplatePage.tsx'), 'dynamic `'));
check('hostile: a destructured stub method fails', has(await fake('DestructuredStubPage.tsx'), 'stub promotion'));
check('hostile: a role row inserted fails (member)', has(await fake('RoleInsertPage.tsx'), 'member user_roles'));
check('hostile: a flow that runs only on the MockProvider fails', has(await fake('MockOnlyPage.tsx'), 'mock_only '));
check('hostile: page code that throws not_in_launch fails', has(await fake('RefusingPage.tsx'), 'not_in_launch '));
check('a review-only branch (PRODUCTION_BUILD false) is not traced', (await fake('ReviewOnlyPage.tsx')).length === 0, (await fake('ReviewOnlyPage.tsx')).join(', '));
check('a page on connected tables passes', (await fake('CleanPage.tsx')).length === 0, (await fake('CleanPage.tsx')).join(', '));
await rm(tmp, { recursive: true, force: true });

// ── The launch routes (and the app shell every route renders in) ────────────────────────────────────────────────
const SHELL = { module: 'app', path: '*', entry: { from: 'src/app/App.tsx', name: 'App' }, signedOut: false };
const results = [];
for (const r of [SHELL, ...ROUTES]) {
  if (!r.entry) continue;
  const launch = r === SHELL ? '*' : launchPattern(r.path);
  // Every route is traced (not only the launch ones): the committed inventory lists the cut routes too.
  results.push({ ...r, launch, ...(await analyse(r)) });
}

/** Each launch route's findings outside the known lists, and the known entries whose route no longer has them. */
function verdicts(results, known) {
  const seen = new Set(), used = new Set(), failing = [];
  for (const r of results.filter((x) => x.launch)) {
    for (const h of r.hits) used.add(h);
    const open = [];
    for (const [f, where] of r.findings) {
      const k = known.find((e) => e.finding === f && e.routes.includes(r.launch));
      if (k) { seen.add(`${k.list} ${k.finding} ${r.launch}`); continue; }
      open.push(`${f} [${[...where].join('; ')}]`);
    }
    failing.push({ route: r, open });
  }
  const stale = known.flatMap((e) => e.routes.filter((route) => !seen.has(`${e.list} ${e.finding} ${route}`)).map((route) => ({ ...e, route })));
  return { failing, stale, used };
}
{
  const fakeRoute = { path: '/x', launch: '/x', hits: new Set(), findings: new Map([['sink audit_log', new Set(['read in src/x.ts'])]]) };
  const v = verdicts([fakeRoute], [{ list: 'PENDING', lane: 'C', finding: 'unknown memberships', routes: ['/x'] }]);
  check('hostile: a finding in neither list fails its route', v.failing[0].open.length === 1);
  check('hostile: a PENDING entry whose finding is gone fails (stale)', v.stale.length === 1);
  const ok = verdicts([fakeRoute], [{ list: 'PENDING', lane: 'E', finding: 'sink audit_log', routes: ['/x'] }]);
  check('a listed finding passes its route and is not stale', ok.failing[0].open.length === 0 && ok.stale.length === 0);
  check('hostile: an OPEN entry on a route added after the audit, without the owner\'s approval, fails', unapproved([{ finding: 'unknown x', lane: 'Wave 3', routes: ['/teach'] }]).length === 1);
  check('hostile: an approval that names no wave fails', unapproved([{ finding: 'unknown x', lane: 'unassigned', approved: 'owner, 2026-10-31', routes: ['/teach'] }]).length === 1);
  check('an approved entry naming its wave passes', unapproved([{ finding: 'unknown x', lane: 'Wave 3', approved: 'owner, 2026-10-31', routes: ['/teach'] }]).length === 0);
}
/** OPEN entries on a route added after the audit that lack the owner's approval or a wave. */
function unapproved(entries) {
  return entries.filter((e) => e.routes.some((r) => ADDED_ROUTES.includes(r)) && !(typeof e.approved === 'string' && /owner/.test(e.approved) && /\d{4}-\d{2}-\d{2}/.test(e.approved) && /Wave \d/.test(e.lane)));
}

const known = [...PENDING.map((e) => ({ ...e, list: 'PENDING' })), ...OPEN.map((e) => ({ ...e, list: 'OPEN' }))];
const { failing, stale, used } = verdicts(results, known);
for (const { route: r, open } of failing) check(`connected: ${r.path}${r.launch !== r.path ? ` (${r.launch})` : ''}`, open.length === 0, open.join(' | '));
for (const e of stale) check(`${e.list} still a finding (else delete it): ${e.route} ${e.finding} — ${e.lane}`, false);
for (const e of known) check(`${e.list}${e.approved ? ' (owner-approved)' : ''} entry names who closes it: ${e.finding} → ${e.lane}${e.approved ? ` [${e.routes.join(', ')}]` : ''}`, Boolean(e.lane) && (e.list === 'OPEN' || ['A', 'B', 'C', 'D', 'E', 'F'].includes(e.lane)));
for (const e of unapproved(OPEN)) check(`OPEN on a route added after the audit needs the owner's approval and a wave: ${e.routes.join(', ')} ${e.finding}`, false);
for (const b of BY_DESIGN) check(`BY_DESIGN still used on a launch route (else delete it): ${b.finding}${b.file ? ` in ${b.file}` : ''}`, used.has(b));
for (const d of DYNAMIC) check(`DYNAMIC still reached on a launch route (else delete it): ${d.file} ${d.arg}`, used.has(d));
for (const r of RUNTIME_REVIEW) { const f = r.markerFile ?? r.file; check(`RUNTIME_REVIEW switch still in its file: ${f} (${r.marker})`, existsSync(f) && (await readFile(f, 'utf8')).includes(r.marker)); }

/** The doc's table rows in one inventory section (the lines that start with a route in backticks). */
function docRows(doc, heading) {
  const start = doc.indexOf(`\n${heading}`);
  if (start < 0) return null;
  const end = doc.indexOf('\n## ', start + 1);
  return doc.slice(start, end < 0 ? undefined : end).split('\n').filter((l) => l.startsWith('| `'));
}
/** The doc with one section's table rows replaced (the rows stay where the old ones were). */
function withRows(doc, heading, rows) {
  const start = doc.indexOf(`\n${heading}`);
  const end = doc.indexOf('\n## ', start + 1);
  const lines = doc.slice(start, end < 0 ? undefined : end).split('\n');
  const first = lines.findIndex((l) => l.startsWith('| `'));
  const kept = lines.filter((l) => !l.startsWith('| `'));
  kept.splice(first, 0, ...rows);
  return doc.slice(0, start) + kept.join('\n') + (end < 0 ? '' : doc.slice(end));
}
{
  const doc = 'x\n## A\n\n| Route | T |\n|---|---|\n| `/a` | 1 |\n| `/b` | 2 |\n\n## B\n\n| `/c` | 3 |\n';
  check('inventory: the rows of a section are read', JSON.stringify(docRows(doc, '## A')) === JSON.stringify(['| `/a` | 1 |', '| `/b` | 2 |']));
  check('hostile: a changed row is a drift', JSON.stringify(docRows(doc, '## A')) !== JSON.stringify(['| `/a` | 1 |', '| `/b` | 9 |']));
  check('inventory: rewriting a section keeps the text around it and the other section', withRows(doc, '## A', ['| `/z` | 0 |']) === 'x\n## A\n\n| Route | T |\n|---|---|\n| `/z` | 0 |\n\n## B\n\n| `/c` | 3 |\n');
}

const kind = (t) => { const a = adapters[t]; return a ? (a.kind === 'entity' && a.readOnly ? 'entity (read-only)' : a.kind) : 'none'; };
/** One route's inventory row, as docs/route-connectivity.md shows it. */
function inventoryRow(r) {
  const reads = new Set(), writes = new Set(), other = new Set();
  for (const u of r.uses) {
    if (u.table) (u.op === 'read' ? reads : writes).add(u.table);
    else if (u.method) other.add(`${u.method}()`);
    else if (u.request) other.add(u.request);
  }
  const tl = (s) => [...s].sort().map((t) => `${t} (${kind(t)})`).join(', ') || '—';
  const closer = (f) => { const k = r.launch && known.find((e) => e.finding === f && e.routes.includes(r.launch)); return k ? `${f} → ${k.list === 'PENDING' ? `lane ${k.lane}` : k.lane}${k.approved ? ' (owner-approved)' : ''}` : f; };
  return `| \`${r.path}\` | R: ${tl(reads)}<br>W: ${tl(writes)} | ${[...other].sort().join(', ') || '—'} | ${[...r.findings.keys()].map(closer).join('; ') || 'none'} |`;
}
const expected = { launch: results.filter((r) => r.launch).map(inventoryRow), cut: results.filter((r) => !r.launch).map(inventoryRow) };
let doc = await readFile(DOC, 'utf8');
if (WRITE) {
  for (const k of Object.keys(INVENTORY)) doc = withRows(doc, INVENTORY[k], expected[k]);
  await writeFile(DOC, doc);
  console.log(`${DOC}: inventory rewritten (${expected.launch.length} launch routes, ${expected.cut.length} cut routes)`);
}
for (const k of Object.keys(INVENTORY)) {
  const committed = docRows(doc, INVENTORY[k]);
  const missing = expected[k].filter((r) => !committed?.includes(r)), extra = (committed ?? []).filter((r) => !expected[k].includes(r));
  check(`${DOC} "${INVENTORY[k].slice(3)}" matches the code (else run --write)`, committed !== null && JSON.stringify(committed) === JSON.stringify(expected[k]),
    committed === null ? 'section missing' : [...missing.map((r) => `code: ${r.slice(0, 140)}`), ...extra.map((r) => `doc: ${r.slice(0, 140)}`)].slice(0, 6).join(' | ') || 'order differs');
}

if (REPORT && !WRITE) {
  // The doc's two tables, launch routes first (`--write` puts them in the doc).
  for (const k of Object.keys(INVENTORY)) console.log(`\n${INVENTORY[k]}\n\n| Route | Tables (read / written) → adapter | Methods, requests | Findings |\n|---|---|---|---|\n${expected[k].join('\n')}`);
}
done();
