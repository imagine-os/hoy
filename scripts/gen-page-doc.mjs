// Creates docs/pages/<code>.md from the route manifest (docs/screenshots/routes.json, written by
// `npm run screenshots`) — the spec the app actually serves, not a parse of the TypeScript.
// Run: node scripts/gen-page-doc.mjs C-02 [--force]      one code
//      node scripts/gen-page-doc.mjs --all [--force]     every routed code
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { EXT, KEY_PAGES, readManifest, safe } from './screenshots.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const all = args.includes('--all');
const one = args.find((a) => !a.startsWith('--'));
if (!all && !one) { console.error('usage: node scripts/gen-page-doc.mjs <code> [--force] | --all [--force]'); process.exit(1); }

const manifest = readManifest();
if (!manifest) { console.error('docs/screenshots/routes.json missing — run `npm run screenshots` (or `-- --smoke`) first'); process.exit(1); }
const canvas = JSON.parse(readFileSync(new URL('../reference/canvas/specs.json', import.meta.url), 'utf8'));

const codes = all ? [...new Set(manifest.map((r) => r.code))] : [one];
let written = 0;
for (const code of codes) {
  const out = new URL(`../docs/pages/${safe(code)}.md`, import.meta.url);
  if (existsSync(out) && !force) { console.error(`skip ${safe(code)}.md exists (use --force)`); continue; }
  const entries = manifest.filter((r) => r.code === code);
  const spec = entries[0]?.spec ?? canvas[code];
  if (!spec) { console.error(`no spec for ${code}`); continue; }
  const status = entries.length ? (entries.every((e) => e.status === 'stub') ? 'stub' : 'built') : 'not routed';
  const surface = entries[0]?.surface ?? '—';
  const name = spec.name?.en ?? spec.name ?? code;
  const nameEs = spec.name?.es ?? name;
  const purposeEn = spec.purpose?.en ?? spec.intent ?? '';
  const purposeEs = spec.purpose?.es ?? '';
  const routesMd = entries.length ? entries.map((e) => `\`/#${e.path}\``).join(' · ') : 'not routed yet';
  const roles = Array.isArray(spec.roles) ? spec.roles.join(', ') : '';
  const img = (l, w, d = '') => `![${code} ${l} ${w}${d ? ' dark' : ''}](../screenshots/${safe(code)}/${l}-${w}${d}.${EXT})`;
  const list = (xs) => (xs?.length ? xs.map((x) => `- ${x}`).join('\n') : '- —');
  const layout = spec.layout ?? [];
  const data = spec.data ?? [];
  const integrations = spec.integrations ?? [];
  const realNotes = status === 'built'
    ? `- Real: the page renders from the data layer (\`useData()\` / \`useTable\`) over the tables above; every write goes through the \`DataProvider\` so the Supabase provider replaces the mock unchanged.\n- Mock / pending: ${integrations.length ? `${integrations.join(', ')} are simulated or deferred` : 'no external integrations'}; data is the browser-local \`MockProvider\` seed.${(spec.notes ?? []).length ? `\n${spec.notes.map((n) => `- Note: ${n}`).join('\n')}` : ''}`
    : `- Real: —\n- Mock / pending: everything (${status})`;
  const md = `---
title: ${code} — ${name}
code: ${code}
route: ${entries[0] ? `/#${entries[0].path}` : 'not routed yet'}
roles: ${roles}
status: ${status}
---

# ${code} — ${name}

**Route** ${routesMd} · **Roles** ${roles || '—'} · **Surface** ${surface} · **Spec** \`spec.code === '${code}'\` (see \`/#/dev/specs\`)

## Purpose
${purposeEn || '<purpose>'}

## Screenshots
| ES · mobile | EN · mobile |
| --- | --- |
| ${img('es', 390)} | ${img('en', 390)} |

| ES · desktop | EN · desktop |
| --- | --- |
| ${img('es', 1280)} | ${img('en', 1280)} |
${KEY_PAGES.has(code) ? `
| ES · dark | EN · dark |
| --- | --- |
| ${img('es', 1280, '-dark')} | ${img('en', 1280, '-dark')} |
` : ''}
## Sections (layout order — \`useLayout(spec)\`)
${layout.length ? layout.map((l, i) => `${i + 1}. \`${l}\``).join('\n') : '1. <section>'}

## Data
| Table | Read / write | Notes |
| --- | --- | --- |
${data.length ? data.map((d) => `| \`${d}\` | read${/bookings|payments|invoices|credits|waitlist|profiles|users|audit_log|intentions|memberships|tenants|consents|message_log|page_layouts/.test(d) ? ' / write' : ''} | |`).join('\n') : '| — | | |'}

## Logic and integrations
${list(spec.logic)}
- Integrations: ${integrations.length ? integrations.join(', ') : 'none'}
${(spec.states ?? []).length ? `\n## States\n${list(spec.states)}\n` : ''}
## Real vs mock
${realNotes}

## Changelog
- \`docs/changelog/0005-final-integration.md\` — screenshots and this page doc (v0.3.0)

---
**Resumen (ES).** ${nameEs}. ${purposeEs || ''}
`;
  writeFileSync(out, md);
  written++;
}
console.log(`wrote ${written} page doc(s)`);
