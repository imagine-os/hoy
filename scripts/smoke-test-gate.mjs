// After a test deploy (deploy-test.yml, last step): the deployed site is the release just built, and its passphrase gate
// (Company OS playbook rule D5) is really on, from outside, through Railway's edge. It reads no passphrase, so it can't
// print one: every try here is a made-up wrong one. Fails the run with a workflow error naming what is wrong.
// The last check proves what the gate relies on: the edge overwrites X-Real-IP. Six wrong tries each claim another address;
// only if the edge replaces the claim do they count as one visitor, and the sixth answers 429. It leaves this runner's
// address blocked for 15 minutes, which nobody else uses.
// Run: APP_URL=https://test.<domain> GITHUB_SHA=<commit> node scripts/smoke-test-gate.mjs
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUEST_MS = 10_000;
const TRIES = 6;
const ask = (url, init = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(REQUEST_MS), ...init });

async function deployedCommit(appUrl) {
  try {
    const res = await ask(`${appUrl}/health`, { cache: 'no-store' });
    return res.ok ? (await res.json())?.commit ?? null : null;
  } catch {
    return null;
  }
}

/** Resolves when the site passes; rejects with what is wrong. */
export async function smokeTestGate({ appUrl, sha, timeoutMs = 300_000, intervalMs = 5_000 }) {
  const end = Date.now() + timeoutMs;
  let commit = await deployedCommit(appUrl);
  while (commit !== sha && Date.now() < end) {
    await new Promise((r) => setTimeout(r, intervalMs));
    commit = await deployedCommit(appUrl);
  }
  if (commit !== sha) throw new Error(`${appUrl}/health did not answer commit ${sha} within ${Math.round(timeoutMs / 1000)} s (last: ${commit ?? 'no answer'}): the deploy is not live at APP_URL`);

  const page = await ask(`${appUrl}/`);
  const pageBody = await page.text();
  if (page.status !== 401 || !pageBody.includes('action="/test-gate"')) throw new Error(`GET / answered ${page.status}, expected 401 with the passphrase form: the test site is not behind its gate`);

  const api = await ask(`${appUrl}/api/cos/x`);
  const apiBody = await api.json().catch(() => null);
  if (api.status !== 401 || apiBody?.error !== 'test_gate') throw new Error(`GET /api/cos/x answered ${api.status}, expected 401 {"error":"test_gate"}: the API paths are not behind the gate`);

  let status = 0;
  for (let i = 1; i <= TRIES; i++) {
    const body = new URLSearchParams({ passphrase: `smoke-wrong-${randomBytes(16).toString('hex')}` }).toString();
    const res = await ask(`${appUrl}/test-gate`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-real-ip': `203.0.113.${i}` }, body });
    await res.arrayBuffer();
    status = res.status;
  }
  if (status !== 429) throw new Error(`six wrong passphrases, each claiming another X-Real-IP, answered ${status} on the sixth, expected 429: the edge is not overwriting X-Real-IP, so a visitor could write that header to get unlimited tries`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const appUrl = (process.env.APP_URL ?? '').replace(/\/+$/, '');
  const sha = process.env.GITHUB_SHA ?? '';
  try {
    if (!appUrl || !sha) throw new Error('needs APP_URL and GITHUB_SHA');
    await smokeTestGate({ appUrl, sha });
    console.log(`✅ smoke-test-gate: ${appUrl} runs ${sha.slice(0, 12)}, behind its gate, and the edge overwrites X-Real-IP`);
  } catch (err) {
    console.log(`::error::Test gate smoke check: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
