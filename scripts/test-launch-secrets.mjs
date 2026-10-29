// PL-06 — "No private keys on screen, in browser code or in the repository." Scans every tracked file, the built
// dist/ (the browser code) and, with --history, every commit's patch for private-key shapes. A hit prints the file and
// the pattern NAME only, never the value. Public identifiers (a Clerk publishable key, a Supabase anon key) are allowed.
// Run: npm run build && node scripts/test-launch-secrets.mjs [--history]
import { execFileSync, spawn } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const PATTERNS = [
  ['PEM private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Clerk / Stripe secret key', /\bsk_(live|test)_[A-Za-z0-9]{16,}/],
  ['Wompi private key', /\bprv_(prod|test)_[A-Za-z0-9]{16,}/],
  ['Wompi events / integrity secret', /\b(prod|test)_(events|integrity)_[A-Za-z0-9]{16,}/],
  ['Resend API key', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{12,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Supabase service-role JWT', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\./],
  ['Railway / Company OS token assignment', /\b(RAILWAY_TOKEN|COMPANY_OS_TOKEN|CLERK_SECRET_KEY|RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|WOMPI_PRIVATE_KEY)\s*[=:]\s*['"]?[A-Za-z0-9_\-.]{16,}/],
];
// Fictional fixtures that look like keys on purpose (D-07 developer keys are `hoy_dev_…`, not provider secrets).
const ALLOW_FILES = [/^scripts\/test-launch-secrets\.mjs$/, /^package-lock\.json$/];
const TEXT = /\.(m?[jt]sx?|cjs|json|md|html|css|sql|ya?ml|toml|txt|env|svg|sh)$|(^|\/)\.env/;

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const scan = (text) => PATTERNS.filter(([, re]) => re.test(text)).map(([n]) => n);

// 0. the scanner itself finds each shape (samples assembled at run time, so this file holds none)
const fake = (head, n = 24) => head + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4'.slice(0, n);
for (const [label, sample] of [['Clerk / Stripe secret key', fake('sk_' + 'live_')], ['Wompi private key', fake('prv_' + 'prod_')], ['Resend API key', 're_' + 'Ab12Cd34_' + fake('', 16)], ['PEM private key', '-----BEGIN ' + 'RSA PRIVATE KEY-----']])
  check(`scanner detects a ${label}`, scan(sample).includes(label));

// 1. tracked files
// Tracked files plus new files not yet committed (ignored files such as node_modules and dist are excluded here).
const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const trackedHits = [];
for (const f of tracked) {
  if (!TEXT.test(f) || ALLOW_FILES.some((re) => re.test(f))) continue;
  let text; try { text = await readFile(f, 'utf8'); } catch { continue; }
  for (const n of scan(text)) trackedHits.push(`${f}: ${n}`);
}
check(`repository: ${tracked.length} tracked files (tracked and new) hold no private key`, trackedHits.length === 0, trackedHits.join('; '));
check('repository: no .env file is tracked', !tracked.some((f) => /(^|\/)\.env(\.|$)/.test(f) && !/\.env\.example$/.test(f)));

// 2. browser code
async function* walk(dir) { for (const e of await readdir(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) yield* walk(p); else yield p; } }
let distFiles = 0; const distHits = [];
try {
  await stat('dist');
  for await (const f of walk('dist')) {
    if (!/\.(js|html|css|json|map|txt|svg)$/.test(f)) continue;
    distFiles++;
    for (const n of scan(await readFile(f, 'utf8'))) distHits.push(`${f}: ${n}`);
  }
  check(`browser build: ${distFiles} files in dist/ hold no private key`, distFiles > 0 && distHits.length === 0, distHits.join('; '));
} catch { check('browser build: dist/ exists (run npm run build first)', false); }

// 3. source: no secret-named env var is read in browser code (VITE_* is public by definition)
const srcHits = [];
for (const f of tracked.filter((x) => x.startsWith('src/'))) { try { if (/import\.meta\.env\.VITE_[A-Z_]*(SECRET|PRIVATE|SERVICE_ROLE|TOKEN)/.test(await readFile(f, 'utf8'))) srcHits.push(f); } catch { /* deleted in the worktree */ } }
check('src: no browser code reads a secret-named VITE_* variable', srcHits.length === 0, srcHits.join(', '));

// 4. history (optional, slower)
if (process.argv.includes('--history')) {
  const hits = new Set();
  const git = spawn('git', ['log', '--all', '-p', '--no-color', '--no-ext-diff', '--format=commit %H'], { stdio: ['ignore', 'pipe', 'inherit'] });
  let commit = '', file = '';
  for await (const line of createInterface({ input: git.stdout })) {
    if (line.startsWith('commit ')) { commit = line.slice(7, 15); continue; }
    if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
    if (!line.startsWith('+') || ALLOW_FILES.some((re) => re.test(file))) continue;
    for (const n of scan(line)) hits.add(`${commit} ${file}: ${n}`);
  }
  check(`history: no commit on any branch added a private key`, hits.size === 0, [...hits].slice(0, 20).join('; '));
}

console.log(failed ? `\n${failed} PL-06 check(s) failed` : '\nPL-06 passed');
process.exit(failed ? 1 : 0);
