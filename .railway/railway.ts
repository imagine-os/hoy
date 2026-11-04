/**
 * Railway infrastructure as code — Hoy's `web` service: the Hoy server (server/) serving the whole built
 * frontend (website + app). This repo owns only `web` ("partial" `web`); the Company OS repo owns `api`
 * (and its `scheduler`) in the same Railway project, in both environments, `test` and `production`.
 * Applied by GitHub Actions (.github/workflows/deploy-test.yml, deploy-prod.yml), never by hand.
 *
 * - No source: Railway never deploys by itself. The workflow builds and checks the frontend on GitHub,
 *   then uploads a bundle (server/ files + the built frontend in `site/`) with `railway up`; Railway
 *   only installs the server's one dependency and starts it.
 * - Public: a custom domain added by hand in each environment (not declarable here), named by the GitHub
 *   Environment's APP_URL: test.<the customer's domain> on test, behind the passphrase gate (playbook rule D5),
 *   and the customer's domain on production once it is chosen.
 * - It reaches the private API over Railway's internal network; the `${{api.…}}` references resolve
 *   against the api service's own variables. The API never gets a public address.
 * - Secrets are `preserve()`: written by the workflow from the GitHub Environment, never in git.
 * - Nothing here names a domain or an organisation: the project's name and region come from the
 *   GitHub Environment's variables (RAILWAY_PROJECT_NAME, RAILWAY_REGION) through the workflow.
 */
import { defineRailway, empty, preserve, project, service } from "railway/iac";

export const partial = "web";

export default defineRailway((ctx) => {
  const prod = ctx.isEnvironment("production");
  // Next to the API (the same region as Company OS's registry entry for Hoy). Unset: Railway's default.
  const region = process.env.HOY_RAILWAY_REGION;

  const web = service("web", {
    source: empty(),
    build: { builder: "RAILPACK" },
    start: "node index.mjs",
    healthcheck: "/health",
    healthcheckTimeout: 60,
    ...(region ? { regions: { [region]: 1 } } : {}),
    env: {
      NODE_ENV: "production",
      // The bundle's layout (see the workflows' "Bundle" step): the built frontend sits in site/.
      DIST_DIR: "site",
      COMPANY_OS_URL: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}",
      // GET /files/<id> only fetches download links on the API's own storage (its Supabase project).
      FILE_STORAGE_ORIGINS: "${{api.SUPABASE_URL}}",
      // test: Hoy's made-up tenant (Company OS registry `testTenants`); production: the real slug.
      COMPANY_OS_TENANT: prod ? preserve() : "hoy-dev",
      // The SAME Clerk instance as this environment's api (test: the development instance; production:
      // the production one). The secret key only ever lives on the server.
      CLERK_SECRET_KEY: preserve(),
      CLERK_PUBLISHABLE_KEY: preserve(),
      // This service's public origin: session tokens must have been issued to it (Clerk `azp`).
      APP_URL: preserve(),
      // The go-live switch (SW-08), set by hand in Railway on the day: SITE_LIVE=true opens the website at the root
      // (else Coming Soon), or SITE_LIVE_AT opens it at an instant. Kept across deploys; unset = Coming Soon.
      SITE_LIVE: preserve(),
      SITE_LIVE_AT: preserve(),
      // The signed-out website's read-only Company OS identity (ADR 0029, role public_site), created by the operator and
      // set by hand in Railway. Without it here, "Apply infra" fails on the variable the service already has (test-hoy,
      // 2026-11-01). Unset: signed-out reads answer 401.
      COMPANY_OS_READ_TOKEN: preserve(),
      // Signs the test gate's cookie (server/testGate.mjs). Declared on production too, where nothing sets or reads it,
      // so that a value left there is ignored instead of failing "Apply infra" (Company OS IN-140).
      COOKIE_SIGNING_SECRET: preserve(),
      // The test site's passphrase gate (Company OS playbook rule D5). Never on production.
      ...(prod ? {} : { TEST_GATE_PASSPHRASE: preserve() }),
    },
  });

  // The project token already points at one project, so the name is a label: kept equal to the real
  // project's name (the same label Company OS's api partial uses) to avoid any confusion.
  const name = process.env.HOY_RAILWAY_PROJECT || ctx.projectName;
  if (!name) throw new Error("HOY_RAILWAY_PROJECT must name Hoy's Railway project (the workflows set it from vars.RAILWAY_PROJECT_NAME).");
  return project(name, { resources: [web] });
});
