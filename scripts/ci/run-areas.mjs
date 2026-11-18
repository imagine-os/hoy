#!/usr/bin/env node
// run-areas v2
// Source: Company OS tools/ci/run-areas.mjs. Website repos copy this file verbatim to
// scripts/ci/run-areas.mjs, next to affected-areas.mjs; change it in Company OS and copy it again.
// Docs: Company OS tools/ci/README.md.
//
// Runs the area scripts affected-areas.mjs chose:
//   node run-areas.mjs --mode <none|fast|areas|all> [--areas '<json array>'] [--config scripts/ci/areas.json]
//   areas  the scripts of the listed areas; a script listed under several areas runs once
//   all    every script in areas.json, once each
//   none, fast  nothing (the fast job is the workflow's own steps); exits 0
// Each script runs as <runner…> <script> (runner from areas.json, default ["npm", "run"]) with its
// configured env over process.env, one after another, without a shell. Stops at the first failure.
// Area names come from $GITHUB_OUTPUT, so they are checked against areas.json before anything runs.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG, loadConfig, normalizeScript, oneLine } from "./affected-areas.mjs";

export const VERSION = "run-areas v2";
const DEFAULT_RUNNER = ["npm", "run"];

/** The scripts to run, in config order, each once: {name, env}. Throws on an unknown area. */
export function scriptsFor(config, mode, areas = []) {
  let chosen;
  if (mode === "all") chosen = Object.keys(config.areas);
  else if (mode === "areas") {
    const unknown = areas.filter((a) => !Object.hasOwn(config.areas, a));
    if (unknown.length) throw new Error(`unknown area ${unknown.map((a) => JSON.stringify(a)).join(", ")}`);
    if (areas.length === 0) throw new Error("mode areas needs at least one area");
    const wanted = new Set(areas);
    chosen = Object.keys(config.areas).filter((a) => wanted.has(a));
  } else if (mode === "none" || mode === "fast") return [];
  else throw new Error(`unknown mode ${JSON.stringify(mode)}`);
  const seen = new Set();
  const scripts = [];
  for (const area of chosen) {
    for (const entry of config.areas[area].scripts) {
      const s = normalizeScript(entry);
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      scripts.push(s);
    }
  }
  return scripts;
}

function parseArgs(argv) {
  const opts = { config: DEFAULT_CONFIG, areas: "[]" };
  const valued = { "--mode": "mode", "--areas": "areas", "--config": "config" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!(a in valued)) throw new Error(`unknown argument ${JSON.stringify(a)}`);
    if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
    opts[valued[a]] = argv[++i];
  }
  if (!opts.mode) throw new Error("--mode is required");
  let areas;
  try {
    areas = JSON.parse(opts.areas);
  } catch {
    throw new Error("--areas must be a JSON array of area names");
  }
  if (!Array.isArray(areas) || areas.some((a) => typeof a !== "string")) throw new Error("--areas must be a JSON array of area names");
  return { ...opts, areas };
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

export function main(argv = process.argv.slice(2)) {
  let scripts;
  let runner;
  try {
    const opts = parseArgs(argv);
    const config = loadConfig(opts.config);
    runner = config.runner ?? DEFAULT_RUNNER;
    scripts = scriptsFor(config, opts.mode, opts.areas);
    if (scripts.length === 0) {
      console.log(`${VERSION}: mode ${opts.mode}: no area scripts to run.`);
      return 0;
    }
    console.log(`${VERSION}: mode ${opts.mode}: ${scripts.length} script(s): ${scripts.map((s) => s.name).join(", ")}`);
  } catch (err) {
    console.log(`::error::run-areas: ${oneLine(err.message)}`);
    return 2;
  }
  const results = [];
  let failed = false;
  for (const s of scripts) {
    const started = Date.now();
    console.log(`\n▶ ${s.name}${Object.keys(s.env).length ? ` (env ${Object.keys(s.env).join(", ")})` : ""}`);
    const r = spawnSync(runner[0], [...runner.slice(1), s.name], { stdio: "inherit", env: { ...process.env, ...s.env }, shell: false });
    const ok = r.status === 0 && !r.error;
    results.push({ name: s.name, ok, ms: Date.now() - started, detail: r.error ? r.error.message : r.signal ? `signal ${r.signal}` : `exit ${r.status}` });
    if (!ok) {
      failed = true;
      break;
    }
  }
  console.log(`\n${VERSION} summary:`);
  for (const r of results) console.log(`  ${r.name}: ${r.ok ? "pass" : `FAIL (${r.detail})`} in ${seconds(r.ms)}`);
  const skipped = scripts.slice(results.length).map((s) => s.name);
  if (skipped.length) console.log(`  not run after the failure: ${skipped.join(", ")}`);
  if (failed) {
    console.log(`::error::run-areas: ${results.at(-1).name} failed`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main();
