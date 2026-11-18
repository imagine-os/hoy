#!/usr/bin/env node
// affected-areas v1
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
//
// Usage:
//   node affected-areas.mjs --base <ref> [--head <ref>] [--config scripts/ci/areas.json]
//   node affected-areas.mjs --release [--head <ref>] [--config …] [--marker "checks: areas-v1"] [--tag-match "v*"]
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

export const VERSION = "affected-areas v1";
export const DEFAULT_CONFIG = "scripts/ci/areas.json";
export const DEFAULT_MARKER = "checks: areas-v1";
export const DEFAULT_TAG_MATCH = "v*";

const AREA_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCRIPT_NAME = /^[A-Za-z0-9_][A-Za-z0-9:._/-]*$/;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const REF = /^[A-Za-z0-9_][A-Za-z0-9_./@^~{}+-]*$/;
const TOP_KEYS = ["version", "runner", "shared", "fast", "ignore", "areas"];
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
  if (config.version !== undefined && config.version !== 1) problems.push("version: only 1 is understood");
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

/**
 * The mode for a list of changed files. Per file, in order: unsafe → all; a protected path (the config in use
 * and the three scripts, opts.protectedPaths) → all; shared → all; ignore → skipped; fast → fast; an area's paths → that area (every area it matches); otherwise unknown → all.
 * Returns {mode, areas, reasons}; areas are sorted and unique (every area for mode all, none for none and fast).
 */
export function classify(files, config, { protectedPaths = [] } = {}) {
  const names = Object.keys(config.areas).sort();
  const all = (reason) => ({ mode: "all", areas: names, reasons: [reason] });
  const hit = new Set();
  let counted = 0;
  const reasons = [];
  for (const file of files) {
    if (unsafe(file)) return all(`unsafe path ${JSON.stringify(file)}`);
    if (protectedPaths.includes(file)) return all(`the checks' own file ${JSON.stringify(file)}`);
    if (matchesAny(config.shared, file)) return all(`shared path ${JSON.stringify(file)}`);
    if (matchesAny(config.ignore, file)) continue;
    counted++;
    if (matchesAny(config.fast, file)) continue;
    const owners = names.filter((n) => matchesAny(config.areas[n].paths, file));
    if (owners.length === 0) return all(`unknown path ${JSON.stringify(file)}`);
    for (const n of owners) {
      if (!hit.has(n)) reasons.push(`area ${n} (${JSON.stringify(file)})`);
      hit.add(n);
    }
  }
  if (counted === 0) return { mode: "none", areas: [], reasons: ["only ignored files changed"] };
  if (hit.size === 0) return { mode: "fast", areas: [], reasons: ["only style and copy files changed"] };
  return { mode: "areas", areas: names.filter((n) => hit.has(n)), reasons };
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
  emit(classify(files, config, { protectedPaths: ownPaths(opts.config) }), base);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main();
