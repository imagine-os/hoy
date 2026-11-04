# Hoy test environment: the passphrase gate on test.hoyhumanclub.com (Company OS playbook rule D5)

Prompt intent: the owner's rule (2026-11-03): every customer's test environment lives at `test.<customer domain>`, behind a passphrase, because Hoy's test site was open on a Railway-generated address (Company OS tech-debt #79). For Hoy, `test.hoyhumanclub.com`, the whole site gated.

Decision:
- `server/testGate.mjs` is the D5 contract on `node:http`, no new dependency, and runs first in the handler: on only with `TEST_GATE_PASSPHRASE`, never with `RAILWAY_ENVIRONMENT_NAME=production`; a passphrase without `COOKIE_SIGNING_SECRET` answers 503; no valid cookie is a 401 passphrase page (plain HTML, Spanish and English, no app bundle) or 401 JSON under `/api/`, `/files/` and `/private-docs/`; the cookie is signed over the origin, the passphrase's hash and the expiry, `HttpOnly`, `Secure`, `SameSite=Lax`, 30 days; 5 wrong tries in 15 minutes from one address, then 429, in a bounded in-memory count; `next` is a path on this site only; every answer says noindex while it is on.
- Exempt, exactly: `/health` and `POST /webhooks/resend`. Hoy's emails (`src/notifications/launchEmails.ts`, `deploy/comms/hoy-templates.json`) load no image from the site, so no image path is exempt.
- The address counted is the edge's `X-Real-IP`, as everywhere else in the server, not the first `X-Forwarded-For` hop, which a browser can write and rotate to get more tries.
- The app's calls to its own server go from `credentials: 'omit'` to `'same-origin'` (`src/data/companyos/transport.ts`, `src/auth/cosRequest.ts`, `src/auth/ProductionSession.tsx`, `src/modules/docs/privateDocs.ts`). With `omit` the gate's cookie never travels, so every call would answer the gate's 401 on the test site. Identity stays the bearer: the server reads no other cookie and forwards none.
- `deploy-test.yml`: `APP_URL` comes from the `test` environment's variable, with no fallback to the Railway domain (the `railway domain` call is gone); the deploy fails before any Railway change without `APP_URL`, `TEST_GATE_PASSPHRASE` (at least 12 characters) or `COOKIE_SIGNING_SECRET` (at least 32); both secrets are synced and the bundle scan looks for both. `deploy-prod.yml` refuses a `TEST_GATE_PASSPHRASE` secret. `.railway/railway.ts` declares `COOKIE_SIGNING_SECRET` in both environments and `TEST_GATE_PASSPHRASE` on test only.

Known limits:
- The passphrase page keeps the path and query but not the `#/…` part of an address, which never reaches the server: a first visit through a deep link lands on the home page. It happens once per browser every 30 days.
- The by-hand `real-signup` job in `auth-checks.yml` runs against the deployed test site and has no way past the gate yet.

Alternative rejected:
- Exempting `/api/` from the gate so the app's calls could keep `credentials: 'omit'`: D5 gates API paths, and the signed-out website's reads would be open to anyone.
- An inline script on the passphrase page to carry the `#/…` part through the form: the page stays plain HTML with a CSP that allows no script.
- Keeping the Railway domain as a fallback address: a deploy would then succeed with Clerk's `azp` and the cookie's origin bound to the wrong site.

Files: `server/{testGate,app,config,check-bundle}.mjs`, `server/README.md`, `.railway/railway.ts`, `.github/workflows/{deploy-test,deploy-prod,release,hoy-server-qa,auth-checks}.yml`, `src/data/companyos/transport.ts`, `src/auth/{cosRequest.ts,ProductionSession.tsx}`, `src/modules/docs/privateDocs.ts`, `scripts/test-{test-gate,deploy-wiring,release-wiring,companyos-provider}.mjs`, `package.json`.
Pages: none (a server gate in front of every page on the test site; production is unchanged).
Version: pending (merged with the next Hoy release).
