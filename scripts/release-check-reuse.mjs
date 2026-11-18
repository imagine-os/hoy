/** E9: reuse only proven Cut release checks; uncertainty retains the full checks. */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export async function findReleaseEvidence({ repository, sha, ref, get }) {
  const fallback = { reuse: false };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "") ||
      !/^[a-f0-9]{40}$/.test(sha ?? "") || !/^refs\/tags\/v\d+\.\d+\.\d+$/.test(ref ?? "")) return fallback;
  const base = `/repos/${repository}/actions`;
  const validRun = run => Number.isSafeInteger(run?.id) && run.id > 0 && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0 &&
    run.head_sha === sha && run.head_branch === "main" &&
    [".github/workflows/release.yml", ".github/workflows/release.yml@main"].includes(run.path) && run.event === "workflow_dispatch" &&
    run.repository?.full_name === repository && run.head_repository?.full_name === repository &&
    run.status === "completed" && run.conclusion === "success";
  try {
    // GitHub returns newest first. Never select an older success over a newer failed/running release.
    const listing = await get(`${base}/workflows/release.yml/runs?head_sha=${sha}&branch=main&event=workflow_dispatch&per_page=1`);
    const candidate = listing?.workflow_runs?.[0];
    if (!validRun(candidate)) return fallback;
    const run = await get(`${base}/runs/${candidate.id}`);
    if (!validRun(run) || run.id !== candidate.id) return fallback;
    // Latest attempt only: a historical successful attempt cannot cover a failed rerun.
    const result = await get(`${base}/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`);
    if (!Array.isArray(result?.jobs) || result.total_count !== result.jobs.length || result.total_count > 100) return fallback;
    for (const name of ["guard", "checks", "tag"]) {
      const matches = result.jobs.filter(job => job.name === name);
      if (matches.length !== 1 || matches[0].status !== "completed" || matches[0].conclusion !== "success" ||
          matches[0].run_id !== run.id || matches[0].head_sha !== sha) return fallback;
    }
    const confirmed = await get(`${base}/runs/${run.id}`);
    if (!validRun(confirmed) || confirmed.id !== run.id || confirmed.run_attempt !== run.run_attempt) return fallback;
    return { reuse: true, runId: run.id, url: `https://github.com/${repository}/actions/runs/${run.id}` };
  } catch {
    return fallback;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const get = async path => {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Release provenance unavailable");
    return response.json();
  };
  const result = await findReleaseEvidence({ repository: process.env.GITHUB_REPOSITORY, sha: process.env.CHECKED_SHA, ref: process.env.GITHUB_REF, get });
  appendFileSync(process.env.GITHUB_OUTPUT, `reuse=${result.reuse}\n`);
  const summary = result.reuse
    ? `Reusing [Cut release checks](${result.url}) for exact commit \`${process.env.CHECKED_SHA}\`. Environment configuration, builds and secret scans still run.\n`
    : "No reusable exact-commit Cut release proof. Running full deployment checks.\n";
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary.trim());
}
