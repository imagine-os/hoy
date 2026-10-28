# The Hoy server

A small Node server (node:http + `@clerk/backend`, nothing else) that runs as the `web` service in Hoy's
Railway project, next to Company OS's private `api` service.

| Path | What it does |
|---|---|
| `/health` | `{ ok, version, commit }` from `release.json`; Railway's healthcheck |
| `/app-config.json` | the browser's public settings: `tenant`, `apiBase` (`/api/cos`), `clerkPublishableKey`, `environment` |
| `/api/cos/t/<tenant>/…` | checks the `Authorization: Bearer <Clerk session token>` with Clerk, then forwards the call to Company OS over the private network with the same token. Without a session nothing goes through (the API authenticates every route, sign-up included; `ANONYMOUS_ROUTES` in `app.mjs` is where a public route would be added). Other tenants, the platform routes and the API's `auth/` (dev login) are never forwarded |
| `POST /webhooks/resend` | Resend's delivery webhook, forwarded with the raw body and the Svix headers to the API's `/webhooks/messaging/resend` (the API checks the signature) |
| anything else | the built frontend (`dist/`, or `DIST_DIR`): website and app, HashRouter |

The browser sends the token from Clerk's `getToken()` as a bearer header (cookies are not read, so
there is no CSRF surface). Only `accept`, `accept-language`, `content-type`, `content-length`,
`idempotency-key`, `if-match` and `if-none-match` are forwarded from the browser; the client address
sent on is Railway's `X-Real-IP`. Answers are always `Cache-Control: private, no-store`.

## Environment variables

| Variable | test | production |
|---|---|---|
| `COMPANY_OS_URL` | IaC: `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` | same |
| `COMPANY_OS_TENANT` | IaC: `hoy-dev` | workflow, from GitHub var `COMPANY_OS_TENANT` |
| `CLERK_SECRET_KEY` | workflow, from GitHub secret (`sk_test_…`, development instance) | workflow (`sk_live_…`) |
| `CLERK_PUBLISHABLE_KEY` | workflow, from GitHub var (`pk_test_…`) | workflow (`pk_live_…`) |
| `APP_URL` | workflow: the service's Railway domain | workflow, from GitHub var (`https://<domain>`) |
| `DIST_DIR`, `NODE_ENV` | IaC: `site`, `production` | same |
| `CLERK_AUTHORIZED_PARTIES` | optional: more origins (comma-separated) besides `APP_URL` | optional |
| `CLERK_JWT_KEY` | optional: the instance's PEM public key (networkless checks) | optional |
| `PORT` | Railway | Railway |
| `PROXY_BODY_LIMIT_BYTES`, `WEBHOOK_BODY_LIMIT_BYTES`, `UPSTREAM_TIMEOUT_MS` | optional (10 MiB, 1 MiB, 30 s) | optional |

The server refuses to start without `COMPANY_OS_URL`, a tenant slug and a Clerk key, with a secret in
`CLERK_PUBLISHABLE_KEY`, or, in production, without `APP_URL`.

## Run and test

```
npm ci --prefix server
npm run build
COMPANY_OS_URL=http://localhost:4000 COMPANY_OS_TENANT=hoy-dev CLERK_SECRET_KEY=sk_test_… node server/index.mjs
node scripts/test-hoy-server.mjs      # proxy, tokens, refusals, webhook raw body, static, config, secret scan
node server/check-bundle.mjs dist     # no secret in the built frontend
```

Deploys: `.github/workflows/deploy-test.yml` (by hand), `deploy-prod.yml` (release tags only),
`release.yml` (*Cut release*). They build and check on GitHub, then upload `server/make-bundle.mjs`'s
bundle (these files + the frontend in `site/`) with `railway up`.
