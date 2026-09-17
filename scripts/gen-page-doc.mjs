// Creates docs/pages/<code>.md from the spec + route (does not overwrite an existing file unless --force).
// Run: node scripts/gen-page-doc.mjs C-02 [--force]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { routes } from './screenshots.mjs';

const code = process.argv[2];
if (!code) { console.error('usage: node scripts/gen-page-doc.mjs <code> [--force]'); process.exit(1); }
const force = process.argv.includes('--force');
const out = new URL(`../docs/pages/${code.replace(/[^\w-]/g, '_')}.md`, import.meta.url);
if (existsSync(out) && !force) { console.error(`${out.pathname} exists (use --force)`); process.exit(1); }

// Spec: canvas JSON first, then a defineSpec({...}) in a module specs.ts, parsed loosely.
const canvas = JSON.parse(readFileSync(new URL('../reference/canvas/specs.json', import.meta.url), 'utf8'));
let spec = canvas[code];
if (!spec) {
  // defineSpec({ code: 'K-03', name: { es, en }, purpose: { es, en }, layout: [...], data: [...], roles: [...] }) in a module specs.ts
  for (const mod of readdirSync(new URL('../src/modules', import.meta.url))) {
    let ts; try { ts = readFileSync(new URL(`../src/modules/${mod}/specs.ts`, import.meta.url), 'utf8'); } catch { continue; }
    const i = ts.indexOf(`code: '${code}'`); if (i < 0) continue;
    const block = ts.slice(i, ts.indexOf('});', i));
    const str = (k) => block.match(new RegExp(`${k}: \\{[^}]*?en: '((?:[^'\\\\]|\\\\.)*)'`))?.[1];
    const arr = (k) => [...(block.match(new RegExp(`${k}: \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/'((?:[^'\\\\]|\\\\.)*)'/g)].map((m) => m[1]);
    spec = { name: str('name') ?? code, intent: str('purpose') ?? '', layout: arr('layout'), data: arr('data'), roles: block.includes('roles: EVERYONE') ? ['everyone'] : arr('roles'), rules: arr('logic') };
    break;
  }
}
const route = routes().find((r) => r.code === code);
const name = spec?.name ?? code;
const layout = spec?.layout ?? (spec?.layers ?? '').split('\n').slice(1).filter((l) => /^[├└]/.test(l)).map((l) => l.replace(/^[├└]\s*/, '').trim());
const data = spec?.data ?? [];
const roles = Array.isArray(spec?.roles) ? spec.roles.join(', ') : '';
const key = new Set(['HUB-01', 'W-01', 'C-01', 'S-02', 'M-01', 'M-03', 'D-02', 'K-03']).has(code);
const img = (l, w, d = '') => `![${code} ${l} ${w}${d ? ' dark' : ''}](../screenshots/${code.replace(/[^\w-]/g, '_')}/${l}-${w}${d}.png)`;
const md = `---
title: ${code} — ${name}
code: ${code}
route: ${route ? `/#${route.path}` : 'not routed yet'}
roles: ${roles}
status: stub
---

# ${code} — ${name}

**Route** \`${route ? `/#${route.path}` : '—'}\` · **Roles** ${roles || '—'} · **Spec** \`canvasSpecs['${code}']\`

## Purpose
${spec?.intent ?? spec?.purpose?.en ?? '<purpose>'}

## Screenshots
| ES · mobile | EN · mobile |
| --- | --- |
| ${img('es', 390)} | ${img('en', 390)} |

| ES · desktop | EN · desktop |
| --- | --- |
| ${img('es', 1280)} | ${img('en', 1280)} |
${key ? `
| ES · dark | EN · dark |
| --- | --- |
| ${img('es', 1280, '-dark')} | ${img('en', 1280, '-dark')} |
` : ''}
## Sections (layout order — \`useLayout(spec)\`)
${layout.length ? layout.map((l, i) => `${i + 1}. \`${l}\``).join('\n') : '1. <section>'}

## Data
| Table | Read / write | Notes |
| --- | --- | --- |
${data.length ? data.map((d) => `| \`${d}\` | read | |`).join('\n') : '| — | | |'}

## Logic and integrations
${(spec?.rules ?? []).map((r) => `- ${r}`).join('\n') || '- <rule>'}

## Real vs mock
- Real: —
- Mock / pending: everything (stub)

## Changelog
- <docs/changelog/NNNN-slug.md>

---
**Resumen (ES).** <Dos o tres líneas para el equipo del estudio.>
`;
writeFileSync(out, md);
console.log(`wrote ${out.pathname}`);
