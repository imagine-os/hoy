#!/usr/bin/env node
// area-imports v2
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
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG, fileKind, importEdges, loadConfig, oneLine, resolveSpecifier, SOURCE } from "./affected-areas.mjs";

export const VERSION = "area-imports v2";
export { resolveSpecifier };

/** Import specifiers in a source text (static, export … from, import(), require(), CSS @import); globs left out. */
export function specifiers(text) {
  return [...new Set(importEdges(text).edges.filter((e) => e.spec !== undefined).map((e) => e.spec))];
}

/** Where a file sits: {kind: "shared"|"unknown"|"ignore"|"fast"|"areas"|"graph", areas} (fileKind, unsafe and own as unknown). */
function bucket(file, config) {
  const w = fileKind(file, config);
  return w.kind === "unsafe" || w.kind === "own" ? { kind: "unknown", areas: [] } : w;
}

/**
 * Problems (empty = none): an imported file in area(s) S that a shared, unknown or fast file imports, or that a
 * file in an area set not contained in S imports. `files` is the repo file list, `read(path)` the text,
 * `aliases` maps import prefixes to repo folders (default {"@/": ""}).
 */
export function importProblems({ config, files, read, aliases = config.graph?.aliases ?? { "@/": "" } }) {
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
    console.log(`::error::area-imports: ${oneLine(err.message)}`);
    return 2;
  }
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
  const problems = importProblems({ config, files, read: (p) => readFileSync(p, "utf8"), aliases: Object.keys(aliases).length ? aliases : undefined });
  console.log(`${VERSION}: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ${oneLine(p)}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
