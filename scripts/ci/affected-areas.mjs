#!/usr/bin/env node
// affected-areas v2
// Source: Company OS tools/ci/affected-areas.mjs. Website repos copy this file verbatim to
// scripts/ci/affected-areas.mjs; change it in Company OS and copy it again, never edit a copy.
// Docs: Company OS tools/ci/README.md.
//
// Which checks does a change need? Reads the changed files between two refs and the repo's
// areas.json, and answers with one mode:
//   none   only files no check reads (agent and playbook files)
//   fast   style and copy only: the fast job (install, typecheck, lint, unit tests, build)
//   areas  the fast job plus the scripts of the listed areas
//   all    a shared or unknown path, an unsafe path, no verified baseline, or the diff failed
// v2: a file in graph.sources is classified by its importers (the reverse import closure over the base and
// head trees): the areas whose graph.entries it reaches, or all when it reaches a graph.roots file or no entry.
//
// Usage:
//   node affected-areas.mjs --base <ref> [--head <ref>] [--config scripts/ci/areas.json]
//   node affected-areas.mjs --release [--head <ref>] [--config …] [--marker "checks: areas-v2"] [--tag-match "v*"]
//     --release: the base is the newest tag matching --tag-match merged into the head (tags on the head
//     itself are skipped), and only if it is an annotated tag whose message has a line equal to the marker;
//     otherwise mode=all ("no verified baseline").
// Writes mode=, areas= (a JSON array) and base= to $GITHUB_OUTPUT when it is set; a summary to stdout.
// Exit 0 with a mode; exit 1 on an invalid areas.json; exit 2 on bad arguments.
//
// Plain Node 20+, no dependencies; git is called with argument arrays, never through a shell.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "affected-areas v2";
export const DEFAULT_CONFIG = "scripts/ci/areas.json";
export const DEFAULT_MARKER = "checks: areas-v2";
export const DEFAULT_TAG_MATCH = "v*";

const AREA_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCRIPT_NAME = /^[A-Za-z0-9_][A-Za-z0-9:._/-]*$/;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const REF = /^[A-Za-z0-9_][A-Za-z0-9_./@^~{}+-]*$/;
const TOP_KEYS = ["version", "runner", "shared", "fast", "ignore", "areas", "graph"];
const GRAPH_KEYS = ["aliases", "sources", "roots", "entries", "seams"];
const SEAM_KEYS = ["from", "to"];
const AREA_KEYS = ["paths", "scripts"];
const ZERO_SHA = /^0+$/;

// ---- globs ------------------------------------------------------------------------------------
// Anchored at the repo root, "/" separated. `**` = any number of folders (zero included), `*` = any
// characters inside one segment, `?` = one character, `{a,b}` = alternatives (may nest). Dotfiles match.

/** Brace expansion: "a/{b,c}/*.{ts,tsx}" → four globs. */
export function expandBraces(glob) {
  const open = glob.indexOf("{");
  if (open === -1) return [glob];
  let depth = 0;
  const commas = [];
  for (let i = open; i < glob.length; i++) {
    const c = glob[i];
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      const parts = [];
      let from = open + 1;
      for (const at of commas) {
        parts.push(glob.slice(from, at));
        from = at + 1;
      }
      parts.push(glob.slice(from, i));
      const rest = glob.slice(i + 1);
      return parts.flatMap((p) => expandBraces(glob.slice(0, open) + p + rest));
    } else if (c === "," && depth === 1) commas.push(i);
  }
  return [glob]; // unbalanced: literal
}

const cache = new Map();
export function globToRegExp(glob) {
  if (cache.has(glob)) return cache.get(glob);
  const alternatives = expandBraces(glob).map((g) => {
    let out = "";
    for (let i = 0; i < g.length; i++) {
      const c = g[i];
      if (c === "*" && g[i + 1] === "*") {
        const atStart = i === 0 || g[i - 1] === "/";
        if (atStart && g[i + 2] === "/") {
          out += "(?:[^/]+/)*";
          i += 2;
        } else if (atStart && i + 2 === g.length) {
          out += ".*";
          i += 1;
        } else {
          out += "[^/]*";
          i += 1;
        }
      } else if (c === "*") out += "[^/]*";
      else if (c === "?") out += "[^/]";
      else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    return out;
  });
  const re = new RegExp(`^(?:${alternatives.join("|")})$`, "s");
  cache.set(glob, re);
  return re;
}

export function matchGlob(glob, path) {
  return globToRegExp(glob).test(path);
}

const matchesAny = (globs, path) => (globs ?? []).some((g) => matchGlob(g, path));

// ---- config -----------------------------------------------------------------------------------

/** A script entry ("name" or {name, env}) as {name, env}. */
export function normalizeScript(entry) {
  return typeof entry === "string" ? { name: entry, env: {} } : { name: entry?.name, env: entry?.env ?? {} };
}

const sameEnv = (a, b) => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};

function globProblems(where, globs, problems, { required = false } = {}) {
  if (globs === undefined && !required) return;
  if (!Array.isArray(globs) || (required && globs.length === 0)) return problems.push(`${where}: must be ${required ? "a non-empty" : "an"} array of globs`);
  for (const g of globs) {
    if (typeof g !== "string" || g === "" || g !== g.trim() || g.includes("//") || g.includes("\\") || /[\x00-\x1f\x7f]/.test(g) || g.startsWith("/") || g.split("/").some((p) => p === ".." || p === ".")) {
      problems.push(`${where}: ${JSON.stringify(g)} is not a repo-relative glob`);
    }
  }
}

/** Shape problems in a parsed areas.json (empty = valid). */
export function configProblems(config) {
  const problems = [];
  if (typeof config !== "object" || config === null || Array.isArray(config)) return ["areas.json must be an object"];
  for (const key of Object.keys(config)) if (!TOP_KEYS.includes(key)) problems.push(`${key}: unknown key`);
  if (config.version !== undefined && config.version !== 1 && config.version !== 2) problems.push("version: only 1 and 2 are understood");
  if (config.runner !== undefined) {
    const r = config.runner;
    if (!Array.isArray(r) || r.length === 0 || r.some((x) => typeof x !== "string" || x === "")) problems.push("runner: must be a non-empty array of strings, e.g. [\"npm\", \"run\"]");
  }
  for (const key of ["shared", "fast", "ignore"]) globProblems(key, config[key], problems);
  if (Array.isArray(config.ignore) && Array.isArray(config.shared)) {
    for (const g of config.ignore) if (config.shared.includes(g)) problems.push(`${JSON.stringify(g)} is in both ignore and shared (shared wins)`);
  }
  const areas = config.areas;
  if (typeof areas !== "object" || areas === null || Array.isArray(areas) || Object.keys(areas).length === 0) {
    problems.push("areas: must be an object with at least one area");
    return problems;
  }
  const seen = new Map();
  for (const [name, area] of Object.entries(areas)) {
    const at = `areas.${name}`;
    if (!AREA_NAME.test(name)) problems.push(`${at}: area names are lowercase words joined by dashes`);
    if (typeof area !== "object" || area === null) {
      problems.push(`${at}: must be an object`);
      continue;
    }
    for (const key of Object.keys(area)) if (!AREA_KEYS.includes(key)) problems.push(`${at}: unknown key ${JSON.stringify(key)}`);
    globProblems(`${at}.paths`, area.paths, problems, { required: true });
    if (!Array.isArray(area.scripts) || area.scripts.length === 0) {
      problems.push(`${at}.scripts: must be a non-empty array`);
      continue;
    }
    for (const entry of area.scripts) {
      const { name: script, env } = normalizeScript(entry);
      if (typeof script !== "string" || !SCRIPT_NAME.test(script)) {
        problems.push(`${at}.scripts: ${JSON.stringify(script)} is not a script name`);
        continue;
      }
      if (typeof env !== "object" || env === null || Array.isArray(env) || Object.entries(env).some(([k, v]) => !ENV_NAME.test(k) || typeof v !== "string")) {
        problems.push(`${at}.scripts: ${script}: env must map variable names to strings`);
        continue;
      }
      if (seen.has(script) && !sameEnv(seen.get(script), env)) problems.push(`${at}.scripts: ${script} is listed with a different env in another area`);
      else seen.set(script, env);
    }
  }
  if (config.graph !== undefined) graphConfigProblems(config, problems);
  return problems;
}

const isObject = (x) => typeof x === "object" && x !== null && !Array.isArray(x);

function graphConfigProblems(config, problems) {
  const g = config.graph;
  if (config.version !== 2) problems.push("graph: needs version 2");
  if (!isObject(g)) return problems.push("graph: must be an object");
  for (const key of Object.keys(g)) if (!GRAPH_KEYS.includes(key)) problems.push(`graph: unknown key ${JSON.stringify(key)}`);
  if (g.aliases !== undefined) {
    if (!isObject(g.aliases)) problems.push("graph.aliases: must map import prefixes to repo folders");
    else for (const [prefix, dir] of Object.entries(g.aliases)) {
      const bad = typeof dir !== "string" || dir.startsWith("/") || dir.includes("\\") || /[\x00-\x1f\x7f]/.test(dir) || (dir !== "" && !dir.endsWith("/")) || dir.split("/").slice(0, -1).some((p) => p === ".." || p === "." || p === "");
      if (prefix === "" || /[\x00-\x1f\x7f]/.test(prefix) || prefix.startsWith(".") || bad) problems.push(`graph.aliases: ${JSON.stringify(prefix)} → ${JSON.stringify(dir)}: a prefix maps to "" or a repo folder ending in "/"`);
    }
  }
  globProblems("graph.sources", g.sources, problems, { required: true });
  globProblems("graph.roots", g.roots, problems);
  if (!isObject(g.entries) || Object.keys(g.entries).length === 0) problems.push("graph.entries: must map at least one area to globs");
  else for (const [name, globs] of Object.entries(g.entries)) {
    if (!isObject(config.areas) || !Object.hasOwn(config.areas, name)) problems.push(`graph.entries.${name}: not an area`);
    globProblems(`graph.entries.${name}`, globs, problems, { required: true });
  }
  if (g.seams !== undefined) {
    if (!Array.isArray(g.seams)) problems.push("graph.seams: must be an array of {from, to?}");
    else g.seams.forEach((seam, i) => {
      const at = `graph.seams[${i}]`;
      if (!isObject(seam)) return problems.push(`${at}: must be {from, to?}`);
      for (const key of Object.keys(seam)) if (!SEAM_KEYS.includes(key)) problems.push(`${at}: unknown key ${JSON.stringify(key)}`);
      if (seam.from === undefined) problems.push(`${at}: from is required`);
      globProblems(`${at}.from`, seam.from === undefined ? undefined : [seam.from], problems);
      globProblems(`${at}.to`, seam.to === undefined ? undefined : [seam.to], problems);
    });
  }
  return problems;
}

/**
 * Problems for a website's own areas.json test (empty = valid):
 *  - every script the old workflow ran (workflowScripts) is in some area: no check is lost;
 *  - every listed script exists in package.json (packageScripts), when given;
 *  - every glob matches at least one tracked file (repoFiles, e.g. `git ls-files`), when given.
 */
export function validateConfig(config, { workflowScripts = [], packageScripts, repoFiles } = {}) {
  const problems = configProblems(config);
  if (problems.length) return problems;
  const listed = new Set(Object.values(config.areas).flatMap((a) => a.scripts.map((s) => normalizeScript(s).name)));
  for (const s of workflowScripts) if (!listed.has(s)) problems.push(`script ${s} ran in the old workflow but is in no area`);
  if (packageScripts) {
    const exists = new Set(Array.isArray(packageScripts) ? packageScripts : Object.keys(packageScripts));
    for (const s of [...listed].sort()) if (!exists.has(s)) problems.push(`script ${s} is listed in an area but not in package.json`);
  }
  if (repoFiles) {
    const globs = [
      ...["shared", "fast", "ignore"].flatMap((k) => (config[k] ?? []).map((g) => [k, g])),
      ...Object.entries(config.areas).flatMap(([name, a]) => a.paths.map((g) => [`areas.${name}.paths`, g])),
    ];
    for (const [where, g] of globs) if (!repoFiles.some((f) => matchGlob(g, f))) problems.push(`${where}: ${g} matches no file`);
  }
  return problems;
}

export function loadConfig(path) {
  const config = JSON.parse(readFileSync(path, "utf8"));
  const problems = configProblems(config);
  if (problems.length) throw new Error(`${path}: ${problems.join("; ")}`);
  return config;
}

// ---- classification ---------------------------------------------------------------------------

const unsafe = (file) => typeof file !== "string" || file === "" || /[\x00-\x1f\x7f]/.test(file) || file.startsWith("/") || file.split("/").some((p) => p === ".." || p === "." || p === "");

const areaNames = (config) => Object.keys(config.areas).sort();

/**
 * Where one file sits, without the import graph: {kind, areas}. kind is unsafe, own, shared, ignore, fast,
 * areas (its areas listed), graph (in graph.sources: decided by the walk) or unknown.
 */
export function fileKind(file, config, { protectedPaths = [] } = {}) {
  if (unsafe(file)) return { kind: "unsafe", areas: [] };
  if (protectedPaths.includes(file)) return { kind: "own", areas: [] };
  if (matchesAny(config.shared, file)) return { kind: "shared", areas: [] };
  if (matchesAny(config.ignore, file)) return { kind: "ignore", areas: [] };
  if (matchesAny(config.fast, file)) return { kind: "fast", areas: [] };
  const owners = areaNames(config).filter((n) => matchesAny(config.areas[n].paths, file));
  if (owners.length) return { kind: "areas", areas: owners };
  if (config.graph && matchesAny(config.graph.sources, file)) return { kind: "graph", areas: [] };
  return { kind: "unknown", areas: [] };
}

/**
 * The walk for one graph file: its reverse import closure (the file, its importers, theirs, …) over graph.importers.
 * Each closure file decides by where it sits: a graph.roots file → all; a graph source → the areas whose entries
 * match it; any other file by fileKind (shared, own or unknown → all; an area's paths → that area; ignore and fast
 * add nothing). No area at the end → all ("reaches no entry"). Returns {all: reason} or {hits: [[area, file, via]]}.
 */
export function walk(file, config, graph) {
  const g = config.graph;
  const parent = new Map([[file, null]]);
  const queue = [file];
  const hits = [];
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    if (matchesAny(g.roots, n)) {
      if (n === file) return { all: `${JSON.stringify(file)} is a graph root` };
      const through = parent.get(n);
      return { all: `${JSON.stringify(file)} reaches root ${JSON.stringify(n)}${through && through !== file ? ` through ${JSON.stringify(through)}` : ""}` };
    }
    const where = n === file ? { kind: "graph", areas: [] } : fileKind(n, config);
    if (where.kind === "unsafe" || where.kind === "own" || where.kind === "shared" || where.kind === "unknown") {
      return { all: `${JSON.stringify(file)} is imported by ${where.kind === "unknown" ? "unknown" : where.kind} file ${JSON.stringify(n)}` };
    }
    if (where.kind === "areas") for (const a of where.areas) hits.push([a, n]);
    if (where.kind === "graph") for (const [a, globs] of Object.entries(g.entries)) if (matchesAny(globs, n)) hits.push([a, n]);
    for (const imp of [...(graph.importers.get(n) ?? [])].sort()) {
      if (!parent.has(imp)) {
        parent.set(imp, n);
        queue.push(imp);
      }
    }
  }
  if (hits.length === 0) return { all: `${JSON.stringify(file)} reaches no entry` };
  return { hits };
}

/**
 * The mode for a list of changed files. Per file, in order: unsafe → all; a protected path (the config in use
 * and the three scripts, opts.protectedPaths) → all; shared → all; ignore → skipped; fast → fast; an area's paths →
 * that area (every area it matches); a graph source → the walk (opts.graph from buildGraph/treeGraph; none → all);
 * otherwise unknown → all.
 * Returns {mode, areas, reasons}; areas are sorted and unique (every area for mode all, none for none and fast).
 */
export function classify(files, config, { protectedPaths = [], graph } = {}) {
  const names = areaNames(config);
  const all = (reason) => ({ mode: "all", areas: names, reasons: [reason] });
  const hit = new Set();
  let counted = 0;
  const reasons = [];
  const add = (n, text) => {
    if (!hit.has(n)) reasons.push(`area ${n} (${text})`);
    hit.add(n);
  };
  for (const file of files) {
    const where = fileKind(file, config, { protectedPaths });
    if (where.kind === "unsafe") return all(`unsafe path ${JSON.stringify(file)}`);
    if (where.kind === "own") return all(`the checks' own file ${JSON.stringify(file)}`);
    if (where.kind === "shared") return all(`shared path ${JSON.stringify(file)}`);
    if (where.kind === "ignore") continue;
    counted++;
    if (where.kind === "fast") continue;
    if (where.kind === "unknown") return all(`unknown path ${JSON.stringify(file)}`);
    if (where.kind === "areas") {
      for (const n of where.areas) add(n, JSON.stringify(file));
      continue;
    }
    if (!graph) return all(`no import graph was built for ${JSON.stringify(file)}`);
    const r = walk(file, config, graph);
    if (r.all) return all(r.all);
    for (const [n, at] of r.hits) add(n, at === file ? JSON.stringify(file) : `${JSON.stringify(file)} via ${JSON.stringify(at)}`);
  }
  if (counted === 0) return { mode: "none", areas: [], reasons: ["only ignored files changed"] };
  if (hit.size === 0) return { mode: "fast", areas: [], reasons: ["only style and copy files changed"] };
  return { mode: "areas", areas: names.filter((n) => hit.has(n)), reasons };
}

// ---- the import graph ---------------------------------------------------------------------------

export const SOURCE = /\.(?:[cm]?[jt]sx?|css)$/;
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".css", ".json"];
const SWAP = { ".js": [".ts", ".tsx"], ".jsx": [".tsx"], ".mjs": [".mts"], ".cjs": [".cts"] };

/**
 * Imports in a source text: {edges, opaque}. An edge is {kind: "static", spec} (import … from, bare import,
 * export … from, require(), CSS @import), {kind: "lazy", spec} (import()), or {kind: "glob-eager" | "lazy-glob",
 * patterns} (import.meta.glob). opaque lists the import(), require() and import.meta.glob calls whose argument is not
 * a literal: an edge the walk cannot see (graphProblems reports them). Comments are read as code: an import
 * mentioned in a comment is an extra edge, which can only widen a walk.
 */
export function importEdges(text) {
  const edges = [];
  const opaque = [];
  const seen = new Set();
  const push = (kind, spec) => {
    const key = `${kind}\0${spec}`;
    if (!seen.has(key)) seen.add(key) && edges.push({ kind, spec });
  };
  for (const m of text.matchAll(/\bimport\s+(?:[^'"`;()]*?\bfrom\s*)?["']([^"'\n]+)["']/g)) push("static", m[1]);
  for (const m of text.matchAll(/\bexport\s*[^'"`;()]*?\bfrom\s*["']([^"'\n]+)["']/g)) push("static", m[1]);
  for (const m of text.matchAll(/@import\s+(?:url\(\s*)?["']([^"'\n]+)["']/g)) push("static", m[1]);
  for (const m of text.matchAll(/(?<![.\w$])(import|require)\s*\(\s*/g)) {
    const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 500);
    const lit = /^(["'])([^"'\n]+)\1\s*[,)]/.exec(rest) ?? /^`([^`$\n]+)`\s*[,)]/.exec(rest);
    if (lit) push(m[1] === "import" ? "lazy" : "static", lit[2] ?? lit[1]);
    else opaque.push(`${m[1]}(${rest.slice(0, 40).split("\n")[0]}`);
  }
  for (const m of text.matchAll(/\bimport\.meta\.glob\b/g)) {
    const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 2000);
    const call = /^\s*(?:<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?\s*\(\s*(\[[^\]]*\]|(["'])[^"'\n]*\2)\s*(,\s*\{[^}]*\})?\s*\)/.exec(rest);
    const patterns = call ? [...call[1].matchAll(/(["'])([^"'\n]*)\1/g)].map((x) => x[2]) : [];
    const listOnly = call && call[1].startsWith("[") ? call[1].slice(1, -1).replace(/(["'])[^"'\n]*\1/g, "").replace(/[\s,]/g, "") === "" : true;
    if (!call && !/^\s*(?:<[^()]*>)?\s*\(/.test(rest)) continue; // prose, not a call
    if (!call || patterns.length === 0 || !listOnly) {
      opaque.push(`import.meta.glob${rest.slice(0, 40).split("\n")[0]}`);
      continue;
    }
    const eager = /\beager\s*:\s*true\b/.test(call[3] ?? "");
    const key = `glob\0${eager}\0${patterns.join("\0")}`;
    if (!seen.has(key)) seen.add(key) && edges.push({ kind: eager ? "glob-eager" : "lazy-glob", patterns });
  }
  return { edges, opaque };
}

/**
 * The text with line and block comments blanked (strings and template literals kept). Used only to keep comments
 * out of the "resolves to no file" lint; the graph itself reads the whole text, so a slip here never narrows a walk.
 */
export function stripComments(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && !(c !== "`" && text[j] === "\n")) j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
      out += " ";
    } else out += c;
  }
  return out;
}

/** The repo-relative base a specifier points at before extensions, or null (bare package, URL, outside the repo). */
function specifierBase(spec, importer, aliases) {
  const clean = spec.replace(/[?#].*$/, "");
  if (clean === "" || /^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.startsWith("//")) return null;
  let base = null;
  if (clean.startsWith("./") || clean.startsWith("../")) base = posix.join(posix.dirname(importer), clean);
  else {
    const prefix = Object.keys(aliases).filter((p) => clean.startsWith(p)).sort((a, b) => b.length - a.length)[0];
    if (prefix !== undefined) base = posix.normalize(aliases[prefix] + clean.slice(prefix.length));
    else if (importer.endsWith(".css") && !clean.startsWith("@") && !clean.startsWith("/")) base = posix.join(posix.dirname(importer), clean);
  }
  if (base === null || base === "" || base === "." || base.startsWith("../") || base === ".." || base.startsWith("/")) return null;
  return base;
}

/** Repo file a specifier points to, or null (bare package, URL, outside the repo, not found). */
export function resolveSpecifier(spec, importer, fileSet, aliases = {}) {
  const base = specifierBase(spec, importer, aliases);
  if (base === null) return null;
  const ext = posix.extname(base);
  const swapped = (SWAP[ext] ?? []).map((e) => base.slice(0, -ext.length) + e);
  for (const c of [base, ...swapped, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => `${base}/index${e}`)]) if (fileSet.has(c)) return c;
  return null;
}

/** Repo files an import.meta.glob pattern list matches (relative to the importer, "/" = repo root, aliases). */
function globTargets(patterns, importer, files, aliases) {
  const toRepo = (p) => {
    if (p.startsWith("/")) return p.slice(1);
    if (p.startsWith("./") || p.startsWith("../")) {
      const joined = posix.normalize(posix.join(posix.dirname(importer), p));
      return joined.startsWith("../") ? null : joined;
    }
    const prefix = Object.keys(aliases).filter((a) => p.startsWith(a)).sort((a, b) => b.length - a.length)[0];
    return prefix === undefined ? null : posix.normalize(aliases[prefix] + p.slice(prefix.length));
  };
  const pos = patterns.filter((p) => !p.startsWith("!")).map(toRepo);
  const neg = patterns.filter((p) => p.startsWith("!")).map((p) => toRepo(p.slice(1)));
  if (pos.some((p) => p === null)) return null;
  return files.filter((f) => pos.some((p) => matchGlob(p, f)) && !neg.some((p) => p !== null && matchGlob(p, f)));
}

const isSeam = (config, from, to) => (config.graph?.seams ?? []).some((s) => matchGlob(s.from, from) && (s.to === undefined || matchGlob(s.to, to)));

/**
 * The import graph of one tree: {importers: Map<file, Set<importer>>}. Every source file (SOURCE) is read, not only
 * graph.sources, so a shared or area file importing a graph file is seen. import() and import.meta.glob edges (eager
 * or not) from an importer to a target that a seam matches are left out; a static import is never a seam.
 * graphProblems checks that every target a seam cuts is an entry. `read(path)` returns the text (or throws).
 */
export function buildGraph({ config, files, read, into }) {
  const aliases = config.graph?.aliases ?? {};
  const fileSet = new Set(files);
  const importers = into ?? new Map();
  const link = (target, importer) => {
    if (target === null || target === importer) return;
    (importers.get(target) ?? importers.set(target, new Set()).get(target)).add(importer);
  };
  for (const file of files) {
    if (!SOURCE.test(file) || unsafe(file)) continue;
    const text = String(read(file) ?? "");
    for (const edge of importEdges(text).edges) {
      if (edge.patterns) {
        for (const t of globTargets(edge.patterns, file, files, aliases) ?? []) if (!isSeam(config, file, t)) link(t, file);
      } else {
        const t = resolveSpecifier(edge.spec, file, fileSet, aliases);
        if (t !== null && !(edge.kind === "lazy" && isSeam(config, file, t))) link(t, file);
      }
    }
  }
  return { importers };
}

/**
 * Problems a website's areas test expects to be empty (fail closed: an edge the walk cannot see would narrow a change
 * it should not): a non-literal import(), require() or import.meta.glob in a graph source; a relative or alias
 * specifier in a graph source that resolves to no file; a roots, entries or seams glob that matches no file; a seam
 * that cuts nothing, or cuts an edge to a file that is no entry; a graph source that is also shared or in an area's paths.
 */
export function graphProblems({ config, files, read }) {
  const problems = [];
  const g = config.graph;
  if (!g) return ["areas.json has no graph"];
  const aliases = g.aliases ?? {};
  const fileSet = new Set(files);
  const sources = files.filter((f) => SOURCE.test(f) && matchesAny(g.sources, f) && !unsafe(f));
  const seamUsed = new Array((g.seams ?? []).length).fill(false);
  for (const file of sources) {
    const where = fileKind(file, config);
    if (where.kind === "shared") problems.push(`${file} is in graph.sources and in shared`);
    for (const a of where.areas) problems.push(`${file} is in graph.sources and in areas.${a}.paths`);
    if (where.kind !== "graph") continue;
    const text = String(read(file) ?? "");
    const { edges, opaque } = importEdges(text);
    for (const o of opaque) problems.push(`${file}: a non-literal ${JSON.stringify(o)} the walk cannot follow`);
    const inCode = new Set(importEdges(stripComments(text)).edges.map((e) => e.spec).filter(Boolean));
    for (const edge of edges) {
      const targets = edge.patterns ? globTargets(edge.patterns, file, files, aliases) ?? [] : [resolveSpecifier(edge.spec, file, fileSet, aliases)].filter((t) => t !== null);
      if (!edge.patterns && targets.length === 0 && inCode.has(edge.spec) && specifierBase(edge.spec, file, aliases) !== null) problems.push(`${JSON.stringify(edge.spec)} in ${file} resolves to no file`);
      if (edge.patterns && globTargets(edge.patterns, file, files, aliases) === null) problems.push(`${file}: import.meta.glob ${JSON.stringify(edge.patterns)} points outside the repo or at a bare package`);
      if (edge.kind !== "static") {
        (g.seams ?? []).forEach((s, i) => {
          if (!matchGlob(s.from, file)) return;
          for (const t of targets) {
            if (s.to !== undefined && !matchGlob(s.to, t)) continue;
            seamUsed[i] = true;
            if (!Object.values(g.entries).some((globs) => matchesAny(globs, t))) problems.push(`graph.seams[${i}]: cuts ${file} → ${t}, which matches no graph.entries`);
          }
        });
      }
    }
  }
  const unmatched = (where, globs) => {
    for (const glob of globs ?? []) if (!files.some((f) => matchGlob(glob, f))) problems.push(`${where}: ${glob} matches no file`);
  };
  unmatched("graph.roots", g.roots);
  for (const [a, globs] of Object.entries(g.entries)) unmatched(`graph.entries.${a}`, globs);
  (g.seams ?? []).forEach((s, i) => {
    unmatched(`graph.seams[${i}].from`, [s.from]);
    if (s.to !== undefined) unmatched(`graph.seams[${i}].to`, [s.to]);
    if (!seamUsed[i]) problems.push(`graph.seams[${i}]: cuts no import() or import.meta.glob`);
  });
  return [...new Set(problems)].sort();
}

/** Repo paths of the config in use and the three scripts beside it (a change to them always gives all). */
export function ownPaths(configPath, cwd = process.cwd()) {
  const rel = relative(cwd, configPath).split(sep).join("/");
  const dir = posix.dirname(rel);
  const at = (f) => (dir === "." ? f : `${dir}/${f}`);
  return [rel, at("affected-areas.mjs"), at("run-areas.mjs"), at("area-imports.mjs")];
}

// ---- git --------------------------------------------------------------------------------------

export function validRef(ref) {
  return typeof ref === "string" && REF.test(ref) && !ref.includes("..") && !ref.endsWith(".lock");
}

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Files changed between the merge base of base and head, and head (renames as delete + add). Throws on a git error. */
export function changedFiles(base, head, cwd = process.cwd()) {
  if (!validRef(base) || !validRef(head)) throw new Error("invalid ref");
  return git(["diff", "--name-only", "--no-renames", "-z", `${base}...${head}`, "--"], cwd).split("\0").filter((f) => f !== "");
}

/** The merge base of two refs (the base the diff compares from). Throws on a git error. */
export function mergeBase(base, head, cwd = process.cwd()) {
  if (!validRef(base) || !validRef(head)) throw new Error("invalid ref");
  return git(["merge-base", base, head], cwd).trim();
}

/** Tracked files of a commit and a reader for their text, from git objects (never the working copy). */
export function treeFiles(ref, cwd = process.cwd()) {
  if (!validRef(ref)) throw new Error("invalid ref");
  const entries = git(["ls-tree", "-r", "-z", "--full-tree", ref], cwd).split("\0").filter(Boolean).map((line) => {
    const tab = line.indexOf("\t");
    const [mode, type, sha] = line.slice(0, tab).split(" ");
    return { mode, type, sha, path: line.slice(tab + 1) };
  });
  const files = entries.map((e) => e.path);
  const wanted = entries.filter((e) => e.type === "blob" && SOURCE.test(e.path) && !unsafe(e.path));
  const text = new Map();
  if (wanted.length) {
    const out = execFileSync("git", ["cat-file", "--batch"], { cwd, input: wanted.map((e) => e.sha).join("\n") + "\n", maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "pipe"] });
    let at = 0;
    for (const e of wanted) {
      const nl = out.indexOf(10, at);
      const header = out.subarray(at, nl).toString("utf8").split(" ");
      if (header[0] !== e.sha || header[1] !== "blob") throw new Error(`git cat-file: ${header.join(" ")}`);
      const size = Number(header[2]);
      text.set(e.path, out.subarray(nl + 1, nl + 1 + size).toString("utf8"));
      at = nl + 1 + size + 1;
    }
  }
  return { files, read: (p) => text.get(p) ?? "" };
}

/** The import graph over several commits (the union of their edges), so a deleted or moved file keeps its old importers. */
export function treeGraph({ config, refs, cwd = process.cwd() }) {
  const importers = new Map();
  for (const ref of refs) {
    const { files, read } = treeFiles(ref, cwd);
    buildGraph({ config, files, read, into: importers });
  }
  return { importers };
}

/**
 * The base for a release: the newest tag matching `match` merged into head, skipping tags on head itself.
 * {tag: null} when there is none; {tag, verified} otherwise (verified: annotated, and a message line equals marker).
 */
export function releaseBase(head, { cwd = process.cwd(), marker = DEFAULT_MARKER, match = DEFAULT_TAG_MATCH } = {}) {
  if (!validRef(head)) throw new Error("invalid ref");
  const onHead = new Set(git(["tag", "--points-at", head], cwd).split("\n").filter(Boolean));
  const tags = git(["tag", "--list", "--merged", head, "--sort=-v:refname", "--", match], cwd).split("\n").filter(Boolean);
  const tag = tags.find((t) => !onHead.has(t));
  if (!tag) return { tag: null, verified: false };
  const [type, ...message] = git(["for-each-ref", "--format=%(objecttype)%00%(contents)", `refs/tags/${tag}`], cwd).split("\0");
  const verified = type.trim() === "tag" && message.join("\0").split("\n").some((line) => line.trim() === marker);
  return { tag, verified };
}

// ---- CLI --------------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { head: "HEAD", config: DEFAULT_CONFIG, marker: DEFAULT_MARKER, tagMatch: DEFAULT_TAG_MATCH, release: false };
  const valued = { "--base": "base", "--head": "head", "--config": "config", "--marker": "marker", "--tag-match": "tagMatch" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--release") opts.release = true;
    else if (a in valued) {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      opts[valued[a]] = argv[++i];
    } else throw new Error(`unknown argument ${JSON.stringify(a)}`);
  }
  if (!opts.release && opts.base === undefined) throw new Error("--base <ref> or --release is required");
  return opts;
}

/** One stdout line that can never start with a workflow command. */
const say = (text) => console.log(`  ${String(text).replace(/[\r\n]/g, " ")}`);

function emit(result, base) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `mode=${result.mode}\nareas=${JSON.stringify(result.areas)}\nbase=${base ?? ""}\n`);
  console.log(`${VERSION}: mode: ${result.mode}${result.mode === "areas" ? ` ${result.areas.join(", ")}` : ""}`);
  console.log(`  base: ${base ? JSON.stringify(base) : "(none)"}`);
  for (const r of result.reasons) say(r);
}

export function main(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parseArgs(argv);
    for (const [name, ref] of [["--head", opts.head], ["--base", opts.base]]) {
      if (ref !== undefined && ref !== "" && !validRef(ref)) throw new Error(`${name} is not a git ref`);
    }
    if (typeof opts.marker !== "string" || opts.marker.trim() === "") throw new Error("--marker must not be empty");
    if (!/^[A-Za-z0-9_][A-Za-z0-9_.*?/-]*$/.test(opts.tagMatch)) throw new Error("--tag-match is not a tag pattern");
  } catch (err) {
    console.log(`::error::affected-areas: ${err.message}`);
    return 2;
  }
  let config;
  try {
    config = loadConfig(opts.config);
  } catch (err) {
    console.log(`::error::affected-areas: invalid ${opts.config}: ${String(err.message).split("\n")[0]}`);
    return 1;
  }
  const allAreas = Object.keys(config.areas).sort();
  const all = (reason) => ({ mode: "all", areas: allAreas, reasons: [reason] });

  let base = opts.base;
  if (opts.release) {
    let found;
    try {
      found = releaseBase(opts.head, { marker: opts.marker, match: opts.tagMatch });
    } catch (err) {
      console.log(`::warning::Could not read the release tags (${String(err.message).split("\n")[0]}): running every check.`);
      emit(all("no verified baseline: the tags could not be read"));
      return 0;
    }
    if (!found.tag) {
      emit(all("no verified baseline: no previous release tag"));
      return 0;
    }
    if (!found.verified) {
      emit(all(`no verified baseline: ${found.tag} does not carry "${opts.marker}"`), found.tag);
      return 0;
    }
    base = found.tag;
  }
  if (!base || ZERO_SHA.test(base)) {
    emit(all("no base to compare with"));
    return 0;
  }
  let files;
  try {
    files = changedFiles(base, opts.head);
  } catch (err) {
    console.log(`::warning::Could not list the changed files (${String(err.message).split("\n")[0].replace(/[\r\n]/g, " ")}): running every check.`);
    emit(all("the diff failed"), base);
    return 0;
  }
  const protectedPaths = ownPaths(opts.config);
  let graph;
  if (config.graph && files.some((f) => fileKind(f, config, { protectedPaths }).kind === "graph")) {
    try {
      graph = treeGraph({ config, refs: [mergeBase(base, opts.head), opts.head] });
    } catch (err) {
      console.log(`::warning::Could not build the import graph (${String(err.message).split("\n")[0].replace(/[\r\n]/g, " ")}): running every check.`);
      emit(all("the import graph could not be built"), base);
      return 0;
    }
  }
  emit(classify(files, config, { protectedPaths, graph }), base);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main();
