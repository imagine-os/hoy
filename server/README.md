# The Hoy server

A small Node server (node:http + `@clerk/backend`, nothing else) that runs as the `web` service in Hoy's
Railway project, next to Company OS's private `api` service.

| Path | What it does |
|---|---|
| every path, test site only | the passphrase gate (`testGate.mjs`, Company OS playbook rule D5): runs first; no valid cookie is a 401 passphrase page, or 401 JSON under `/api/`, `/files/`, `/private-docs/`. Exempt: `/health` and `POST /webhooks/resend`. Off on production and when `TEST_GATE_PASSPHRASE` is unset |
| `POST /test-gate` | the gate's form (test site only): the right passphrase sets a signed cookie for 30 days and redirects to `next` (a path on this site); 5 wrong tries in 15 minutes from one address, then 429 |
| `/health` | `{ ok, version, commit }` from `release.json`; Railway's healthcheck |
| `/app-config.json` | the browser's public settings: `tenant`, `apiBase` (`/api/cos`), `clerkPublishableKey`, `environment` |
| `/api/cos/t/<tenant>/…` | checks the `Authorization: Bearer <Clerk session token>` with Clerk, then forwards the call to Company OS over the private network with the same token. Without a session only the website's public reads go through (below); nothing else does (the API authenticates every route, sign-up included; `ANONYMOUS_ROUTES` in `app.mjs` is where a route the API serves to anyone would be added). Other tenants, the platform routes and the API's `auth/` (dev login) are never forwarded |
| `/api/cos/t/<tenant>/query`, `GET …/api/<entity>[/<id>]`, signed out | the website's public reads (hoy-all-roles lane F, Company OS ADR 0029): a `POST /query` whose `entity` (read whole, at most 16 KiB) or a `GET /api/<entity>` whose entity is `occurrence`, `schedule`, `resource`, `coach`, `product`, `setting`, `hours_override` or `booking` (`PUBLIC_ENTITIES`) is sent with the server's own read-only service identity (`COMPANY_OS_READ_TOKEN`, role `public_site`), whose policies and field lists in Company OS decide the rows and fields: never the private class, who booked or a person's contact details (`setting` only the public settings row, `booking` only the class and the spot of scheduled classes, `hours_override` without its note). Every `setting` answer is also rewritten here (`stripPrivateSettings`): `payroll`, `integrations` and the staff-only contacts (`contacts.payroll`, `.coordinator`, `.owner`) are removed whatever the stored row holds, and an answer that can't be read whole is a `502`, never passed through. Any bearer the visitor sends is checked as a Clerk session (a service token included), so the visitor's own headers never become the identity. Each visitor (`X-Real-IP`) gets `PUBLIC_READ_BURST` reads, refilled at `PUBLIC_READ_RATE_PER_SECOND`, then `429 rate_limited`; all visitors together get 400, refilled at 150/s per instance, below the identity's own limit in Company OS (200/s, burst 500), so the excess is refused rather than the identity cut off for everyone. `X-Real-IP` is Railway's edge's. Without the token, signed-out reads stay `401` |
| `GET /files/<id>` | a stored file (e.g. a transfer receipt for the front desk). Needs the same bearer; asks the API's `GET /t/<tenant>/files/<id>/url` with the user's token (the API's read permission decides; its 401/403/404/409 come back with the same status), then streams the bytes from storage with `private, no-store`. PNG/JPEG/WebP/GIF/AVIF are `inline`; any other type is served as an `attachment` download. The signed storage link, storage's headers and its error bodies never reach the browser (IN-028). Capped at `FILE_SIZE_LIMIT_BYTES`; one deadline of `FILE_TIMEOUT_MS` covers the session check, the link and the whole download (30 s for 10 MiB needs ≥ 3 Mbit/s). Links must be https outside `local`. The API's own `/files/<id>/url` is never proxied |
| `GET /private-docs/docs.json`, `GET /private-docs/source/<file>` | the Hub's docs, manual, kanban, changelog and the owner's source PDFs (lane Y6, `docsGate.mjs`): only for a bearer that is a valid Clerk session **and** whose Company OS `GET /t/<tenant>/me` (asked with that token) says the person works as Super admin (`isSuperAdmin: true`, not an AD-04 Administration). Signed out or a bad/expired token `401`, any other role `403`, an unlisted path `404` (after the check), all `private, no-store`, `Vary: Authorization`; no cookie, client header or the public read identity ever opens it. The files are the production build's private pack, `<DIST_DIR>-private/` (`site-private/` in the bundle), which the static server never serves |
| `POST /webhooks/resend` | Resend's delivery webhook, forwarded with the raw body and the Svix headers to the API's `/webhooks/messaging/resend` (the API checks the signature) |
| anything else | the built frontend (`dist/`, or `DIST_DIR`): website and app, HashRouter |

The browser sends the token from Clerk's `getToken()` as a bearer header (the only cookie read is the test
gate's, which opens no data, so there is no CSRF surface). That includes `/files/<id>`: open a file with `fetch` + the bearer, then show
the response's blob (`URL.createObjectURL`), since a plain link or `<img src>` sends no bearer. Only `accept`, `accept-language`, `content-type`, `content-length`,
`idempotency-key`, `if-match` and `if-none-match` are forwarded from the browser; the client address
sent on is Railway's `X-Real-IP`. Answers are always `Cache-Control: private, no-store`.

## Environment variables

| Variable | test | production |
|---|---|---|
| `COMPANY_OS_URL` | IaC: `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` | same |
| `COMPANY_OS_TENANT` | IaC: `hoy-dev` | workflow, from GitHub var `COMPANY_OS_TENANT` |
| `CLERK_SECRET_KEY` | workflow, from GitHub secret (`sk_test_…`, development instance) | workflow (`sk_live_…`) |
| `CLERK_PUBLISHABLE_KEY` | workflow, from GitHub var (`pk_test_…`) | workflow (`pk_live_…`) |
| `APP_URL` | workflow, from GitHub var (`https://test.<domain>`, the custom domain on the service) | workflow, from GitHub var (`https://<domain>`) |
| `TEST_GATE_PASSPHRASE` | workflow, from GitHub secret (at least 12 characters): the passphrase gate | never: the deploy refuses it and the server ignores it |
| `COOKIE_SIGNING_SECRET` | workflow, from GitHub secret (at least 32 characters): signs the gate's cookie; a passphrase without it answers 503 | not used |
| `DIST_DIR`, `NODE_ENV` | IaC: `site`, `production` | same |
| `CLERK_AUTHORIZED_PARTIES` | optional: more origins (comma-separated) besides `APP_URL` | optional |
| `CLERK_JWT_KEY` | optional: the instance's PEM public key (networkless checks) | optional |
| `PORT` | Railway | Railway |
| `PROXY_BODY_LIMIT_BYTES`, `WEBHOOK_BODY_LIMIT_BYTES`, `UPSTREAM_TIMEOUT_MS` | optional (10 MiB, 1 MiB, 30 s) | optional |
| `FILE_SIZE_LIMIT_BYTES`, `FILE_TIMEOUT_MS` | optional (10 MiB, 30 s) | optional |
| `FILE_STORAGE_ORIGINS` | IaC: `${{api.SUPABASE_URL}}`, the only origin download links may point to | same; without it production serves no file |
| `SITE_LIVE`, `SITE_LIVE_AT` | by hand in Railway: the go-live switch (SW-08). Unset or `false` = Coming Soon at the root; `true` = the website; `SITE_LIVE_AT` = an instant with its offset (`2026-11-01T06:00:00-05:00`) | same; set on go-live day (no rebuild, the service restarts) |
| `COMPANY_OS_READ_TOKEN` | by hand in Railway (secret): the test tenant's `public_site` read identity, `cos_svc_…` (Company OS runbook `prod-env.md` step 13b) | same, production's own identity; unset = the signed-out site shows no classes, prices or teachers |
| `PUBLIC_READ_BURST`, `PUBLIC_READ_RATE_PER_SECOND` | optional (120, 20): each visitor's signed-out reads | optional |

The server refuses to start without `COMPANY_OS_URL`, a tenant slug and a Clerk key, with a secret in
`CLERK_PUBLISHABLE_KEY`, or, in production, without `APP_URL`. It also refuses a malformed `SITE_LIVE`,
`SITE_LIVE_AT` or `COMPANY_OS_READ_TOKEN` (the error never repeats the token). The manual and docs are never public:
the docs gate serves them to a signed-in super admin only (the old `PUBLIC_DOCUMENTS` switch is retired; a value left
set in Railway is ignored and can be deleted).

## Run and test

```
npm ci --prefix server
npm run build
COMPANY_OS_URL=http://localhost:4000 COMPANY_OS_TENANT=hoy-dev CLERK_SECRET_KEY=sk_test_… node server/index.mjs
node scripts/test-hoy-server.mjs      # proxy, tokens, refusals, files, webhook raw body, static, config, secret scan
node scripts/test-docs-gate.mjs       # /private-docs/: super admin only, hostile tokens, roles, traversal (lane Y6)
node scripts/test-test-gate.mjs       # the test site's passphrase gate (rule D5): cookies, tries, next, exempt paths
node scripts/test-website-signed-out-live.mjs   # after npm run build:production: the signed-out site on live data
node server/check-bundle.mjs dist     # no secret in the built frontend
```

Deploys: `.github/workflows/deploy-test.yml` (by hand), `deploy-prod.yml` (release tags only),
`release.yml` (*Cut release*). They build and check on GitHub, then upload `server/make-bundle.mjs`'s
bundle (these files + the frontend in `site/`) with `railway up`.
