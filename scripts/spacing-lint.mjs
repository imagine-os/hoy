// Spacing lint (0037). Module CSS and inline styles use spacing and sizing TOKENS, never raw px/rem.
// See docs/design-system.md "Spacing and sizing" and .claude/skills/ui-spacing/SKILL.md.
//
// Scans src/**/*.css (not the generated src/design/tokens.css) and the inline `style={{ … }}` props in src/**/*.tsx:
//   · CSS spacing properties: margin*, padding*, gap/row-gap/column-gap, inset*, top/right/bottom/left,
//     scroll-margin*, scroll-padding*  → any px/rem number is a violation
//   · CSS sizing properties: (min-|max-)width/height, inline-size, block-size, flex-basis → a px/rem number up to
//     4rem / 64px is a violation (control-sized: use --h-ctl, --icon-*, --sp-*); larger layout widths are not checked
//   · TSX style props margin*/padding*/gap/rowGap/columnGap → a bare number (React px) or a px/rem string
// Allowed: 0, 1px (hairlines), and nudges up to 2px when the declaration carries an /* optical */ comment.
// Legacy numeric aliases (--sp-1 … --sp-16) are counted as warnings, not violations; they retire in a later pass.
//
// Usage: node scripts/spacing-lint.mjs            full list, exit 1 when the count is above the baseline
//        node scripts/spacing-lint.mjs --report   one-line summary per file (npm run build), same exit rule
//        node scripts/spacing-lint.mjs --update-baseline   writes scripts/spacing-baseline.json
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const BASELINE = join(ROOT, 'scripts', 'spacing-baseline.json');
const args = process.argv.slice(2);
const REPORT = args.includes('--report');
const UPDATE = args.includes('--update-baseline');

const SPACING = /^(margin|padding|scroll-margin|scroll-padding)(-[a-z-]+)?$|^(gap|row-gap|column-gap)$|^inset(-[a-z-]+)?$|^(top|right|bottom|left)$/;
const SIZING = /^(min-|max-)?(width|height|inline-size|block-size)$|^flex-basis$/;
const NUM = /(^|[^\w.#-])(-?\d*\.?\d+)(px|rem)\b/g;
const SIZE_LIMIT_PX = 64;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Blank out a span but keep its newlines so line numbers survive. */
const blank = (s) => s.replace(/[^\n]/g, ' ');

function lintCss(file, text) {
  const hits = [];
  // keep `optical` markers, drop every other comment; drop @media / @container / @supports preludes (their
  // `(min-width: 900px)` is a condition, not a declaration) and url(...) payloads.
  let t = text.replace(/\/\*[\s\S]*?\*\//g, (c) => (/optical/i.test(c) ? `\u0001${blank(c).slice(1)}` : blank(c)));
  t = t.replace(/@(media|container|supports)[^{]*\{/g, (m) => `${blank(m.slice(0, -1))}{`);
  t = t.replace(/url\([^)]*\)/g, blank);
  const decl = /([a-z-]+)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = decl.exec(t))) {
    const prop = m[1];
    const value = m[2];
    const spacing = SPACING.test(prop);
    const sizing = !spacing && SIZING.test(prop);
    if (!spacing && !sizing) continue;
    const optical = value.includes('\u0001') || t.slice(m.index + m[0].length, m.index + m[0].length + 40).split('\n')[0].includes('\u0001');
    for (const n of value.matchAll(NUM)) {
      const v = Number(n[2]);
      const px = n[3] === 'rem' ? v * 16 : v;
      const abs = Math.abs(px);
      if (abs === 0) continue;
      if (abs === 1 && n[3] === 'px') continue;
      if (abs <= 2 && optical) continue;
      if (sizing && abs > SIZE_LIMIT_PX) continue;
      hits.push({ file, line: lineOf(t, m.index), prop, value: `${n[2]}${n[3]}` });
    }
  }
  return hits;
}

function lintTsx(file, text) {
  const hits = [];
  const re = /\b(margin|padding|gap|rowGap|columnGap)(Top|Bottom|Left|Right|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd)?\s*:\s*(-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[3];
    const bad = /^-?\d/.test(raw) ? Number(raw) !== 0 && Math.abs(Number(raw)) !== 1 : /\d(px|rem)\b/.test(raw.replace(/\b1px\b/g, ''));
    if (bad) hits.push({ file, line: lineOf(text, m.index), prop: m[1] + (m[2] ?? ''), value: raw });
  }
  return hits;
}

const files = walk(SRC).filter((f) => (f.endsWith('.css') && !f.endsWith('design/tokens.css')) || f.endsWith('.tsx'));
const hits = [];
let legacy = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f);
  hits.push(...(f.endsWith('.css') ? lintCss(rel, text) : lintTsx(rel, text)));
  legacy += (text.match(/var\(--sp-\d+\)/g) ?? []).length;
}

const byFile = {};
for (const h of hits) byFile[h.file] = (byFile[h.file] ?? 0) + 1;
const total = hits.length;

if (UPDATE) {
  const sorted = Object.fromEntries(Object.entries(byFile).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify({ note: 'Raw px/rem spacing values still allowed (scripts/spacing-lint.mjs). Lower it, never raise it.', total, files: sorted }, null, 2)}\n`);
  console.log(`spacing-lint: baseline written — ${total} violations in ${Object.keys(byFile).length} files`);
  process.exit(0);
}

let baseline = { total: Infinity, files: {} };
try { baseline = JSON.parse(readFileSync(BASELINE, 'utf8')); } catch { /* no baseline yet: report only */ }

if (REPORT) {
  const grown = Object.entries(byFile).filter(([f, n]) => n > (baseline.files?.[f] ?? 0));
  for (const [f, n] of grown) console.log(`  ↑ ${f}: ${n} (baseline ${baseline.files?.[f] ?? 0})`);
} else {
  for (const h of hits) console.log(`${h.file}:${h.line}  ${h.prop}: ${h.value}`);
}
console.log(`spacing-lint: ${total} raw spacing values in ${Object.keys(byFile).length} files (baseline ${baseline.total}); ${legacy} legacy --sp-N aliases`);
if (total > baseline.total) {
  console.error(`spacing-lint: FAIL — ${total - baseline.total} new raw spacing value(s). Use the tokens in src/design/tokens.ts (see .claude/skills/ui-spacing/SKILL.md).`);
  process.exit(1);
}
