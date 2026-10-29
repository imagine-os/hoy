// Fails when the built frontend (dist/) carries a secret. Run after `npm run build` (make-bundle.mjs runs it
// in the workflows' checks), and again in each deploy job right before `railway up`, where the GitHub
// Environment's secrets are set. Two kinds of check over every text file:
//   - known secret shapes (Clerk secret keys, Resend API keys, Svix signing secrets, private keys);
//   - the actual values of this environment's secret variables, when they are set (the deploy job).
// Usage: node server/check-bundle.mjs [distDir]
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHAPES = [
  ['a Clerk secret key', /\bsk_(test|live)_[A-Za-z0-9]{20,}/],
  ['a Resend API key', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ['a webhook signing secret', /\bwhsec_[A-Za-z0-9+/=]{20,}/],
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
/** Variables whose values must never be in the browser (when present in this process's environment). */
const SECRET_VARIABLES = ['CLERK_SECRET_KEY', 'RAILWAY_TOKEN', 'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'COMPANY_OS_PLATFORM_KEY', 'PLATFORM_ADMIN_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'AUTH_JWT_SECRET'];
const TEXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.map', '.md', '.txt', '.svg', '.xml', '.webmanifest']);

export async function findSecrets(distDir, env = process.env) {
  const values = SECRET_VARIABLES.map((name) => [name, env[name]]).filter(([, v]) => typeof v === 'string' && v.length >= 8);
  const findings = [];
  for await (const file of walk(distDir)) {
    if (!TEXT.has(extname(file).toLowerCase())) continue;
    const text = await readFile(file, 'utf8');
    const where = relative(distDir, file);
    for (const [what, re] of SHAPES) if (re.test(text)) findings.push(`${where}: looks like ${what}`);
    for (const [name, value] of values) if (text.includes(value)) findings.push(`${where}: contains the value of ${name}`);
  }
  return findings;
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = resolve(process.argv[2] ?? 'dist');
  const findings = await findSecrets(dist);
  if (findings.length) {
    console.error(`❌ check-bundle: secrets in ${dist}:\n  - ${findings.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`✅ check-bundle: no secret in ${relative(process.cwd(), dist) || dist}`);
}
