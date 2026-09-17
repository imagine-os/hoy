// Build-time metadata for every markdown file under docs/: what the docs browser (K-02) and the
// operations manual (K-03/K-04) need to draw their indexes without shipping the bodies.
// Used by the `?docmeta` Vite plugin (vite.config.ts); the bodies load on demand as `?raw` chunks.
import { readFile } from 'node:fs/promises';

const FRONT = /^---\n([\s\S]*?)\n---/;
const DECISION = /^>\s*(?:DECISIÓN PENDIENTE|DECISION NEEDED|DECISION PENDING)\s*:\s*(.+)$/;
const SCREENSHOT = /^\[screenshot:\s*([^\]]+)\]\s*$/;
const FIGURE = /!\[[^\]]*\]\((?:\.\.\/)+screenshots\//g;

/** `key: value` header lines at the top of a file (changelog entries) or inside `---` front matter. */
export function headerMeta(source) {
  const fm = source.match(FRONT);
  const block = fm ? fm[1] : source.split(/\n\s*\n/)[0];
  const meta = {};
  for (const line of block.split('\n')) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim(); }
  return meta;
}

function titleOf(path, body, meta) {
  if (meta.title) return meta.title;
  const h = body.match(/^#\s+(.+)$/m);
  if (h) return h[1].trim();
  const base = path.split('/').pop().replace(/\.md$/, '');
  const num = base.match(/^(\d{4})-(.+)$/);
  return num ? `${num[1]} · ${num[2].replace(/-/g, ' ')}` : base;
}

/**
 * Everything an index needs from one markdown file: title and header meta for every doc; headings,
 * word count, figures, pending decisions and capture placeholders for the manual chapters.
 * `headings` are the raw `##` texts (the viewer slugs them), skipping fenced code.
 */
export function docMeta(path, source) {
  const fm = source.match(FRONT);
  const meta = headerMeta(source);
  const body = fm ? source.slice(fm[0].length).replace(/^\n/, '') : source;
  const headings = [], decisions = [], placeholders = [];
  let section = '', fenced = false;
  // Only the manual reads headings, decisions and placeholders; other docs keep the index small.
  for (const line of /docs\/ops-manual\/(es|en)\//.test(path) ? body.split('\n') : []) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const h = line.match(/^##\s+(.+)$/); if (h) { section = h[1].trim(); headings.push(section); continue; }
    const d = line.match(DECISION); if (d) { decisions.push({ section, text: d[1].trim() }); continue; }
    const s = line.match(SCREENSHOT); if (s) placeholders.push(s[1].trim());
  }
  return {
    title: titleOf(path, body, meta),
    meta,
    words: (body.match(/[\p{L}\p{N}’'-]+/gu) ?? []).length,
    figures: (body.match(FIGURE) ?? []).length,
    headings, decisions, placeholders,
  };
}

/** Vite plugin: `import x from './file.md?docmeta'` → the JSON above, recomputed when the file changes. */
export function docMetaPlugin() {
  const SUFFIX = '?docmeta';
  return {
    name: 'hoyos:docmeta',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith(SUFFIX)) return null;
      const file = id.slice(0, -SUFFIX.length);
      this.addWatchFile(file);
      const rel = file.replace(/^.*?(docs\/)/, '$1');
      return `export default ${JSON.stringify(docMeta(rel, await readFile(file, 'utf8')))};`;
    },
  };
}
