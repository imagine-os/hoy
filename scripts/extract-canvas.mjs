// Extracts reference/canvas/specs.json and strings.json from the Claude Design canvas.
// Run: node scripts/extract-canvas.mjs [path/to/canvas.html]   then: npm run specs
// The canvas holds one <script type="text/x-dc" data-dc-script> with `class Component extends DCLogic`
// whose fields `specs`/`specs2` (per-screen specs) and `d`/`d2` (EN/ES string pairs) are what we export.
import { readFileSync, writeFileSync } from 'node:fs';

const canvasPath = process.argv[2] ?? new URL('../reference/canvas/Hoy Wellness System.dc.html', import.meta.url);
const html = readFileSync(canvasPath, 'utf8');
const lines = html.split('\n');
const start = lines.findIndex((l) => l.startsWith('<script type="text/x-dc"'));
let end = -1;
for (let i = lines.length - 1; i > start; i--) if (lines[i].trim() === '</script>') { end = i; break; }
if (start < 0 || end < 0) throw new Error('canvas script block not found');
const script = lines.slice(start + 1, end).join('\n');

// The class only needs a DCLogic base with props/setState to instantiate.
class DCLogic { constructor() { this.props = {}; } setState() {} }
const Component = new Function('DCLogic', `${script}\nreturn Component;`)(DCLogic);
const c = new Component();

const specs = {};
for (const [key, spec] of Object.entries({ ...c.specs, ...c.specs2 })) {
  const { code, ...rest } = spec;
  if (specs[code]) throw new Error(`duplicate spec code ${code} (${specs[code].key} and ${key})`);
  specs[code] = { key, code, ...rest };
}
const strings = { ...c.d, ...c.d2 };

const outDir = new URL('../reference/canvas/', import.meta.url);
writeFileSync(new URL('specs.json', outDir), JSON.stringify(specs, null, 1) + '\n');
writeFileSync(new URL('strings.json', outDir), JSON.stringify(strings, null, 0).replace(/^\{/, '{\n').replace(/\],"/g, '],\n"').replace(/\}$/, '\n}').replace(/":\["/g, '": [\n"').replace(/","/g, '",\n"').replace(/"\]/g, '"\n]') + '\n');
console.log(`specs: ${Object.keys(specs).length} (${Object.keys(specs).join(' ')})\nstrings: ${Object.keys(strings).length}`);
