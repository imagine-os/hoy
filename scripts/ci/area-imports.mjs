#!/usr/bin/env node
// area-imports v1
// Source: Company OS tools/ci/area-imports.mjs. Website repos copy this file verbatim to
// scripts/ci/area-imports.mjs (next to affected-areas.mjs); change it in Company OS and copy it again.
// Docs: Company OS tools/ci/README.md, section "Imports cross areas".
//
// Fail-open check for areas.json: a file in area A that a file in area B (or a shared, unknown or fast file)
// imports. A PR touching it would run only A's scripts, and B's checks would never see the change.
//
// Usage: node area-imports.mjs [--config scripts/ci/areas.json] [--alias @/=] [--alias @ds/=components/ds/]
// Reads `git ls-files`, prints the problems, exits 1 if there are any (2 on bad arguments or config).
// Plain Node 20+, no dependencies besides ./affected-areas.mjs.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, DEFAULT_CONFIG, loadConfig, matchGlob } from "./affected-areas.mjs";

export const VERSION = "area-imports v1";
const SOURCE = /\.(?:[cm]?[jt]sx?|css)$/;
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json"];

/** Import specifiers in a source text: static, `export … from`, dynamic import(), require(), CSS @import. */
export function specifiers(text) {
  const out = new Set();
  const patterns = [
    /\bimport\s+(?:[^'";]*?\bfrom\s*)?["']([^"']+)["']/g,
    /\bexport\s*[^'";]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']/g,
    /@import\s+(?:url\(\s*)?["']([^"']+)["']/g,
  ];
  for (const re of patterns) for (const m of text.matchAll(re)) out.add(m[1]);
  return [...out];
}

/** Repo file a specifier points to, or null (bare package, URL, outside the repo, not found). */
export function resolveSpecifier(spec, importer, fileSet, aliases) {
  const clean = spec.replace(/[?#].*$/, "");
  if (clean === "" || /^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.startsWith("//")) return null;
  let base = null;
  if (clean.startsWith("./") || clean.startsWith("../")) base = posix.join(posix.dirname(importer), clean);
  else {
    const prefix = Object.keys(aliases).filter((p) => clean.startsWith(p)).sort((a, b) => b.length - a.length)[0];
    if (prefix !== undefined) base = posix.normalize(aliases[prefix] + clean.slice(prefix.length));
    else if (importer.endsWith(".css") && !clean.startsWith("@") && !clean.startsWith("/")) base = posix.join(posix.dirname(importer), clean);
  }
  if (base === null || base.startsWith("../") || base === ".." || base.startsWith("/")) return null;
  for (const c of [base, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => `${base}/index${e}`)]) if (fileSet.has(c)) return c;
  return null;
}

/** Where a file sits, with classify() semantics: {kind: "shared"|"unknown"|"ignore"|"fast"|"areas", areas}. */
function bucket(file, config) {
  const r = classify([file], config);
  if (r.mode === "none") return { kind: "ignore", areas: [] };
  if (r.mode === "fast") return { kind: "fast", areas: [] };
  if (r.mode === "areas") return { kind: "areas", areas: r.areas };
  return { kind: (config.shared ?? []).some((g) => matchGlob(g, file)) ? "shared" : "unknown", areas: [] };
}

/**
 * Problems (empty = none): an imported file in area(s) S that a shared, unknown or fast file imports, or that a
 * file in an area set not contained in S imports. `files` is the repo file list, `read(path)` the text,
 * `aliases` maps import prefixes to repo folders (default {"@/": ""}).
 */
export function importProblems({ config, files, read, aliases = { "@/": "" } }) {
  const fileSet = new Set(files);
  const buckets = new Map();
  const of = (f) => buckets.get(f) ?? buckets.set(f, bucket(f, config)).get(f);
  const problems = new Set();
  for (const importer of files) {
    if (!SOURCE.test(importer)) continue;
    const from = of(importer);
    if (from.kind === "ignore") continue;
    let text;
    try {
      text = read(importer);
    } catch {
      continue;
    }
    for (const spec of specifiers(String(text ?? ""))) {
      const target = resolveSpecifier(spec, importer, fileSet, aliases);
      if (target === null || target === importer) continue;
      const to = of(target);
      if (to.kind !== "areas") continue;
      if (from.kind === "areas" && from.areas.every((a) => to.areas.includes(a))) continue;
      const where = from.kind === "areas" ? from.areas.join(", ") : from.kind;
      const remedy = from.kind === "areas" ? from.areas.filter((a) => !to.areas.includes(a)).join(", ") : null;
      problems.add(`${target} (areas ${to.areas.join(", ")}) is imported by ${importer} (${where}): move it to shared or list it under ${remedy ?? "every area of the importer, or move the importer"} too`);
    }
  }
  return [...problems].sort();
}

function main(argv) {
  let config = DEFAULT_CONFIG;
  const aliases = {};
  try {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === "--config" && i + 1 < argv.length) config = argv[++i];
      else if (argv[i] === "--alias" && i + 1 < argv.length) {
        const [prefix, ...dir] = argv[++i].split("=");
        if (!prefix || dir.length === 0) throw new Error("--alias needs prefix=dir, e.g. @/=");
        aliases[prefix] = dir.join("=");
      } else throw new Error(`unknown argument ${JSON.stringify(argv[i])}`);
    }
    config = loadConfig(config);
  } catch (err) {
    console.log(`::error::area-imports: ${String(err.message).split("\n")[0]}`);
    return 2;
  }
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
  const problems = importProblems({ config, files, read: (p) => readFileSync(p, "utf8"), aliases: Object.keys(aliases).length ? aliases : undefined });
  console.log(`${VERSION}: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ${p.replace(/[\r\n]/g, " ")}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
