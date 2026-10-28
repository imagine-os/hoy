/**
 * Railway infrastructure as code — Hoy's `web` service: the Hoy server (server/) serving the whole built
 * frontend (website + app). This repo owns only `web` ("partial" `web`); the Company OS repo owns `api`
 * (and its `scheduler`) in the same Railway project, in both environments, `test` and `production`.
 * Applied by GitHub Actions (.github/workflows/deploy-test.yml, deploy-prod.yml), never by hand.
 *
 * - No source: Railway never deploys by itself. The workflow builds and checks the frontend on GitHub,
 *   then uploads a bundle (server/ files + the built frontend in `site/`) with `railway up`; Railway
 *   only installs the server's one dependency and starts it.
 * - Public: the workflow gives it a Railway-generated *.up.railway.app domain on test (not declarable
 *   here); production gets the customer's domain by hand once it is chosen (APP_URL).
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
    },
  });

  // The project token already points at one project, so the name is a label: kept equal to the real
  // project's name (the same label Company OS's api partial uses) to avoid any confusion.
  const name = process.env.HOY_RAILWAY_PROJECT || ctx.projectName;
  if (!name) throw new Error("HOY_RAILWAY_PROJECT must name Hoy's Railway project (the workflows set it from vars.RAILWAY_PROJECT_NAME).");
  return project(name, { resources: [web] });
});
