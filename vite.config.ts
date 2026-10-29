import { readdirSync, statSync } from 'node:fs';
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
 * - the review-only modules (hub, dev tools, docs browser) are left out of the route registry's glob, so their code
 *   is not in the bundle;
 * - every `import.meta.glob` over `docs/` becomes empty and every direct import of a `docs/` file an empty value:
 *   no manual or docs text, no in-app screenshots (about 316 MB of the review build), no docs images;
 * - scripts/prune-production.mjs then removes the review-only files `public/` copies (hub map, source material).
 */
const PRODUCTION = process.env.VITE_HOY_BUILD === 'production';
export const REVIEW_ONLY_MODULES = ['dev', 'docs', 'hub'];
const MODULES_GLOB = "import.meta.glob<ModuleExports>('../modules/*/index.ts', { eager: true })";
const DOCS_DIR = join(here, 'docs') + '/';
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
export const REVIEW_ONLY_DATA = new RegExp(`/src/(hub/.+|auth/demoUsers|data/MockProvider|data/seed/(?!(${SEED_LAUNCH_CONTENT.join('|')})\\.ts$).+)\\.tsx?$`);

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
      if (file.endsWith('/src/app/registry.ts')) {
        if (!code.includes(MODULES_GLOB)) throw new Error('productionBuild: the module glob in src/app/registry.ts changed; update vite.config.ts');
        const skip = REVIEW_ONLY_MODULES.map((m) => `'!../modules/${m}/index.ts'`).join(', ');
        return code.replace(MODULES_GLOB, `import.meta.glob<ModuleExports>(['../modules/*/index.ts', ${skip}], { eager: true })`);
      }
      if (!file.startsWith(join(here, 'src') + '/') || !code.includes('import.meta.glob')) return null;
      // A glob whose pattern(s) point into docs/ resolves to no files at all.
      return code.replace(/import\.meta\.glob(?:<[^>()]*>)?\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")[^)]*\)/g, (all, pattern: string) => (/(^|['"\/!])(\.\.\/)+docs\//.test(pattern) ? '({})' : all));
    },
    load(id) {
      const file = id.split('?')[0];
      if (!file.startsWith(DOCS_DIR)) return null;
      // The one JSON imported from docs/ (source/index.json) is a list.
      return file.endsWith('.json') ? '[]' : "export default '';";
    },
  };
}

export default defineConfig({
  base: './',
  // Keep optimized dependencies local when independent worktrees share installed packages.
  cacheDir: join(here, '.vite'),
  define: {
    __COMPONENT_COUNT__: JSON.stringify(countFiles(join(here, 'src/components'), '.meta.ts')),
  },
  plugins: [react(), docMetaPlugin(), ...(PRODUCTION ? [productionBuild()] : [])],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 1000 },
});
