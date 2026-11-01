// The go-live switches of the `web` service, for a deploy summary (test-hoy fixes, lane Y2). Reads the service's
// variables as JSON on stdin (`railway variable list --json`: an object { NAME: value }, or a list of { name, value })
// and prints Markdown lines: whether SITE_LIVE is on, SITE_LIVE_AT, and whether COMPANY_OS_READ_TOKEN is present.
// It never prints a secret's value, nor any value it does not recognise. Always exits 0: a summary never fails a deploy.
// Run: railway variable list --service web --environment test --json | node scripts/deploy-switches.mjs
import { readFileSync } from 'node:fs';

let input = '';
try { input = readFileSync(0, 'utf8'); } catch { input = ''; }

/** The variables as a name → string map, or null when the input is not a variable list. */
function parse(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  const out = new Map();
  if (Array.isArray(raw)) {
    for (const v of raw) if (v && typeof v === 'object' && typeof v.name === 'string') out.set(v.name, typeof v.value === 'string' ? v.value : '');
    return out;
  }
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) out.set(k, typeof v === 'string' ? v : '');
    return out;
  }
  return null;
}

const vars = parse(input);
const lines = ['#### Go-live switches (web)'];
if (!vars) {
  lines.push('- Could not read the service variables: check SITE_LIVE and COMPANY_OS_READ_TOKEN in Railway by hand.');
} else {
  const live = (vars.get('SITE_LIVE') ?? '').trim().toLowerCase();
  if (!vars.has('SITE_LIVE') || live === '') lines.push('- SITE_LIVE: not set (the root shows Coming Soon)');
  else if (live === 'true' || live === 'false') lines.push(`- SITE_LIVE: ${live}${live === 'true' ? ' (the website opens at the root)' : ' (Coming Soon)'}`);
  else lines.push('- SITE_LIVE: invalid (must be true or false; the server refuses to start)');
  const at = (vars.get('SITE_LIVE_AT') ?? '').trim();
  if (at) lines.push(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(at) ? `- SITE_LIVE_AT: ${at}` : '- SITE_LIVE_AT: invalid (an instant with its offset)');
  const token = (vars.get('COMPANY_OS_READ_TOKEN') ?? '').trim();
  lines.push(token ? '- COMPANY_OS_READ_TOKEN: present' : '- COMPANY_OS_READ_TOKEN: missing (signed-out website reads answer 401)');
  if (vars.has('SET_LIVE')) lines.push('- Warning: a SET_LIVE variable is set, but the server reads SITE_LIVE: rename it in Railway, then deploy.');
}
console.log(lines.join('\n'));
