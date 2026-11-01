import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { docMetaPlugin } from './scripts/lib/docmeta.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Counts files matching a suffix under a folder. Build-time only — see __COMPONENT_COUNT__. */
function countFiles(dir: string, suffix: string): number {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) n += countFiles(path, suffix);
    else if (entry.endsWith(suffix)) n += 1;
  }
  return n;
}

// base './' keeps assets relative so the build works at https://imagine-os.github.io/hoy/ and locally.
// docMetaPlugin serves `*.md?docmeta` (title, header meta, headings, decisions…) so the docs browser and
// the manual index the markdown at build time while the bodies load on demand as `?raw` chunks.
// __COMPONENT_COUNT__ is how many `<Name>.meta.ts` files D-02 collects: the hub prints the number, and a
// lazy import.meta.glob would have created one chunk per meta just to count them.
/**
 * The production build (VITE_HOY_BUILD=production, `npm run build:production`; H-2, PL-03): what Railway serves to real
 * customers. On top of the runtime switches (src/config/launch.ts, launchRoutes.ts):
 * - the review-only modules (REVIEW_ONLY_MODULES; none since lane Y3) are left out of the route registry's glob, so
 *   their code is not in the bundle;
 * - since lane Y3 (Hoy test-fixes) the manual, the source documents, the docs and the kanban ship for the super admin
 *   (R-08 answered for these pages): `import.meta.glob` over `docs/` keeps its markdown and images, but never the
 *   in-app screenshots (`docs/screenshots/`, about 343 MB of the review build): a glob only over them becomes empty,
 *   any other glob over `docs/` gets `!…/docs/screenshots/**` added, and a direct import of a screenshot is empty;
 * - scripts/prune-production.mjs then removes the review-only files `public/` copies (hub map, delivery tracker).
 */
const PRODUCTION = process.env.VITE_HOY_BUILD === 'production';
// `dev` ships since Hoy all-roles (lane C, 2026-10-31): the developer's home `/dev` is a launch route, and the kanban
// `/dev/knowledgebase` since lane Y3; the module's other pages stay unregistered in production (launchRoutes.ts).
// `hub` ships since lane D (Justin's HubPage since lane Y3, super admin only), `docs` since lane Y3 (super admin only).
export const REVIEW_ONLY_MODULES: string[] = [];
const MODULES_GLOB = "import.meta.glob<ModuleExports>('../modules/*/index.ts', { eager: true })";
const SHOTS_DIR = join(here, 'docs', 'screenshots') + '/';

/**
 * A glob's pattern argument (`'…'` or `['…', '!…']`) with the in-app screenshots taken out (lane Y3), or null when it
 * names only screenshots (the whole glob becomes empty). Patterns that don't point into docs/ come back unchanged.
 */
export function withoutScreenshots(pattern: string): string | null {
  const parts = [...pattern.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2]);
  const intoDocs = (p: string) => /^!?(\.\.\/)+docs\//.test(p);
  if (!parts.some(intoDocs)) return pattern;
  const positive = parts.filter((p) => !p.startsWith('!'));
  if (positive.length && positive.every((p) => /^(\.\.\/)+docs\/screenshots\//.test(p))) return null;
  const prefix = positive.find(intoDocs)?.match(/^(\.\.\/)+/)?.[0] ?? '../';
  return `[${[...parts, `!${prefix}docs/screenshots/**`].map((p) => JSON.stringify(p)).join(', ')}]`;
}
/**
 * The docs describe the review build, so they name its demo personas (`usr_super`, Sofía Arango, …), which must never
 * reach production JavaScript (H-10). Since the docs ship (lane Y3), the production build redacts them from every
 * bundled docs file: the demo ids (`usr_*`), the demo users' full names and their demo e-mail addresses become `[demo]`.
 * The names are read from src/auth/demoUsers.ts, so a new demo user is redacted too.
 */
const DEMO_NAMES = [...readFileSync(join(here, 'src/auth/demoUsers.ts'), 'utf8').matchAll(/\bname:\s*'([^']+ [^']+)'/g)].map((m) => m[1]);
export function redactDemo(code: string): string {
  let out = code.replace(/\busr_[a-z0-9_]+\b/g, '[demo]').replace(/[a-z0-9._-]+@demo\.hoyos\.test\b/gi, '[demo]');
  for (const name of DEMO_NAMES) out = out.split(name).join('[demo]');
  return out;
}

/**
 * H-10: the review build's demo data — the demo personas (and the hub map that lists them), the in-browser
 * MockProvider and the seed it builds. Real
 * customers must never get a demo persona or write to localStorage, so none of these may ship in production. They
 * are marked side-effect free (a reference left only in a `PRODUCTION_BUILD ? … : …` branch is dropped with its
 * module) and the build fails if one is still rendered. The seed files left out of the list are the studio's verified
 * launch content (classes, teachers, prices, rooms, legal texts, FAQ, media, policies; 0051), which the Company OS
 * provider maps as defaults (src/data/companyos/mapping.ts).
 */
const SEED_LAUNCH_CONTENT = ['catalog', 'timetable', 'content', 'legal', 'media', 'studioPolicies'];
// `src/hub/hubMap.data.ts` is not demo data (roles and experiences, no people): the production Hub draws from it (lane D).
export const REVIEW_ONLY_DATA = new RegExp(`/src/(hub/(?!hubMap\\.data\\.ts$).+|auth/demoUsers|app/frameSession|data/MockProvider|data/seed/(?!(${SEED_LAUNCH_CONTENT.join('|')})\\.ts$).+)\\.tsx?$`);

function productionBuild(): Plugin {
  return {
    name: 'hoy-production-build',
    enforce: 'pre',
    generateBundle(_, bundle) {
      const rendered = new Set<string>();
      for (const chunk of Object.values(bundle)) if (chunk.type === 'chunk') for (const [id, m] of Object.entries(chunk.modules)) if (m.renderedLength > 0) rendered.add(id);
      const shipped: string[] = [];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const [id, m] of Object.entries(chunk.modules)) if (m.renderedLength > 0 && REVIEW_ONLY_DATA.test(id)) {
          const by = this.getModuleInfo(id)?.importers.filter((i) => rendered.has(i) && !REVIEW_ONLY_DATA.test(i)).map((i) => i.replace(here, '')) ?? [];
          shipped.push(`${id.replace(here, '')} in ${chunk.fileName} (imported by ${by.join(', ') || 'demo data only'})`);
        }
      }
      if (shipped.length) this.error(`productionBuild: review-only demo data in the production bundle (H-10):\n  ${shipped.join('\n  ')}`);
    },
    transform(code, id) {
      const file = id.split('?')[0];
      if (REVIEW_ONLY_DATA.test(file)) return { code, map: null, moduleSideEffects: false };
      // A docs file (its body `?raw`, its index `?docmeta`): no demo persona in production (lane Y3).
      if (file.startsWith(join(here, 'docs') + '/') && file.endsWith('.md')) return { code: redactDemo(code), map: null };
      if (file.endsWith('/src/app/registry.ts')) {
        if (!code.includes(MODULES_GLOB)) throw new Error('productionBuild: the module glob in src/app/registry.ts changed; update vite.config.ts');
        const skip = REVIEW_ONLY_MODULES.map((m) => `'!../modules/${m}/index.ts'`).join(', ');
        return code.replace(MODULES_GLOB, `import.meta.glob<ModuleExports>(['../modules/*/index.ts', ${skip}], { eager: true })`);
      }
      if (!file.startsWith(join(here, 'src') + '/') || !code.includes('import.meta.glob')) return null;
      // A glob over docs/ never includes the in-app screenshots (lane Y3); one over them only resolves to no files.
      return code.replace(/import\.meta\.glob(?:<[^>()]*>)?\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")[^)]*\)/g, (all, pattern: string) => {
        const kept = withoutScreenshots(pattern);
        return kept === null ? '({})' : all.replace(pattern, kept);
      });
    },
    load(id) {
      const file = id.split('?')[0];
      // The docs ship since lane Y3; a direct import of an in-app screenshot is still empty.
      if (!file.startsWith(SHOTS_DIR)) return null;
      return "export default '';";
    },
  };
}

export default defineConfig({
  base: './',
  // Keep optimized dependencies local when independent worktrees share installed packages.
  cacheDir: join(here, '.vite'),
  define: {
    __COMPONENT_COUNT__: JSON.stringify(countFiles(join(here, 'src/components'), '.meta.ts')),
    // Which build this is, as a constant the bundler folds (src/config/launch.ts `PRODUCTION_BUILD`).
    __HOY_BUILD__: JSON.stringify(PRODUCTION ? 'production' : 'review'),
  },
  plugins: [react(), docMetaPlugin(), ...(PRODUCTION ? [productionBuild()] : [])],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 1000 },
});
