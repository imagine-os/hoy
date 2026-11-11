import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { gzipSync } from 'node:zlib';
import { docMeta, docMetaPlugin } from './scripts/lib/docmeta.mjs';

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
 * - since lane Y3 (Hoy test-fixes) the manual, the source documents, the docs and the kanban are pages for the super
 *   admin (R-08 answered for these pages), and since lane Y6 (owner 2026-11-01, "Gate on the server first") none of
 *   their content is in the public bundle: every `import.meta.glob` over `docs/` becomes `{}`, a direct import of a file
 *   under `docs/` is empty, and the build fails if a module from `docs/` is rendered into a chunk. `privateDocsPack`
 *   writes the content to `<outDir>-private/` instead (docs.json: every markdown body redacted, its docmeta index, the
 *   docs images as data URLs, the source-document index with its covers; source/: the PDFs and covers), which the Hoy
 *   server serves only to a signed-in super admin (server/docsGate.mjs). The in-app screenshots never ship at all;
 * - scripts/prune-production.mjs then removes the review-only files `public/` copies (hub map, delivery tracker, and
 *   public/source/, which only the private pack carries).
 */
const PRODUCTION = process.env.VITE_HOY_BUILD === 'production';
// `dev` ships since Hoy all-roles (lane C, 2026-10-31): the developer's home `/dev` is a launch route, and the kanban
// `/dev/knowledgebase` since lane Y3; the module's other pages stay unregistered in production (launchRoutes.ts).
// `hub` ships since lane D (Justin's HubPage since lane Y3, super admin only), `docs` since lane Y3 (super admin only).
export const REVIEW_ONLY_MODULES: string[] = [];
const MODULES_GLOB = "import.meta.glob<ModuleExports>('../modules/*/index.ts', { eager: true })";
const SHOTS_DIR = join(here, 'docs', 'screenshots') + '/';
const DOCS_DIR = join(here, 'docs') + '/';
/** A glob pattern argument (`'…'` or `['…', '!…']`) that reaches into docs/. */
const intoDocs = (pattern: string) => [...pattern.matchAll(/'([^']*)'|"([^"]*)"/g)].some((m) => /^(\.\.\/)+docs\//.test(m[1] ?? m[2]));
/** Where the private pack goes for a public dist folder (server/docsGate.mjs `privateDocsDir`, same rule). */
export const privateDocsDir = (outDir: string) => `${resolve(outDir).replace(/[/\\]+$/, '')}-private`;
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
/** The files the docs gate may serve from source/ (server/docsGate.mjs SOURCE_NAME). */
const SOURCE_NAME = /^[a-z0-9][a-z0-9-]*\.(pdf|jpg|jpeg|png|webp)$/;
function walkDocs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.name.startsWith('.')) return [];
    if (e.isDirectory()) return path + '/' === SHOTS_DIR ? [] : walkDocs(path);
    return e.isFile() ? [path] : [];
  });
}
/**
 * Lane Y6: the private pack the Hoy server gates. docs.json: every markdown file under docs/ (never the in-app
 * screenshots) with its body and docmeta index, both redacted (`redactDemo`), every image under docs/ as a data URL,
 * and docs/source/index.json with each cover as a data URL; source/: the PDFs and covers from public/source/.
 */
export function writePrivateDocsPack(dir: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'source'), { recursive: true });
  const files = walkDocs(join(here, 'docs')).sort();
  const rel = (f: string) => relative(here, f).split('\\').join('/');
  const docs = files.filter((f) => f.endsWith('.md')).map((f) => {
    const body = redactDemo(readFileSync(f, 'utf8'));
    return { path: rel(f), info: docMeta(rel(f), body), body };
  });
  const images = Object.fromEntries(files.filter((f) => IMAGE_TYPES[extname(f).toLowerCase()]).map((f) => [rel(f), `data:${IMAGE_TYPES[extname(f).toLowerCase()]};base64,${readFileSync(f).toString('base64')}`]));
  const publicSource = join(here, 'public', 'source');
  const index = JSON.parse(readFileSync(join(here, 'docs', 'source', 'index.json'), 'utf8')) as { file: string; cover?: string }[];
  const sources = index.map((s) => {
    const cover = s.cover ? join(here, 'public', s.cover) : null;
    const type = cover ? IMAGE_TYPES[extname(cover).toLowerCase()] : undefined;
    return JSON.parse(redactDemo(JSON.stringify({ ...s, cover: cover && type ? `data:${type};base64,${readFileSync(cover).toString('base64')}` : undefined })));
  });
  for (const name of readdirSync(publicSource)) if (SOURCE_NAME.test(name)) copyFileSync(join(publicSource, name), join(dir, 'source', name));
  const pack = JSON.stringify({ version: 1, docs, images, sources });
  writeFileSync(join(dir, 'docs.json'), pack);
  // Served as is to a client that takes gzip (server/docsGate.mjs), so the server never compresses 4 MB per request.
  writeFileSync(join(dir, 'docs.json.gz'), gzipSync(pack, { level: 9 }));
}

/**
 * The docs describe the review build, so they name its demo personas (`usr_super`, Sofía Arango, …), which must never
 * reach production (H-10). Since the docs ship (lane Y3; behind the server's gate since lane Y6), the production build
 * redacts them from every docs file in the private pack: the demo ids (`usr_*`), the demo users' full names and their demo e-mail addresses become `[demo]`.
 * The names are read from src/auth/demoUsers.ts, so a new demo user is redacted too.
 */
const DEMO_FULL_NAMES = [...readFileSync(join(here, 'src/auth/demoUsers.ts'), 'utf8').matchAll(/\bname:\s*'([^']+ [^']+)'/g)].map((m) => m[1]);
// Also the unaccented spelling ("Sofia Arango"): docs are not always typed with accents.
export const DEMO_NAMES = [...new Set(DEMO_FULL_NAMES.flatMap((n) => [n, n.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]))];
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

/** Lane Y6: a review build removes a private pack left beside its outDir by an earlier production build. */
function reviewBuild(): Plugin {
  return {
    name: 'hoy-review-build',
    apply: 'build',
    writeBundle(options) { rmSync(privateDocsDir(resolve(here, options.dir ?? 'dist')), { recursive: true, force: true }); },
  };
}

function productionBuild(): Plugin {
  return {
    name: 'hoy-production-build',
    enforce: 'pre',
    // Lane H-SEO (D11): the website is on real paths (/clases/fuego), and the app's assets are relative (base './', for
    // GitHub Pages). One root base on every production page, `/` included, so ./images and ./brand resolve from the root
    // after the browser moves to a deeper path. The review build keeps './' relative to wherever it is hosted.
    transformIndexHtml(html) {
      return html.replace(/(<meta charset="UTF-8" \/>)/i, '$1\n    <base href="/" />');
    },
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
      // Lane Y6: nothing from docs/ is rendered into a public chunk but the empty stubs `load` gives (the gate is the only way to it).
      const fromDocs = [...rendered].filter((id) => id.split('?')[0].startsWith(DOCS_DIR) && String(this.getModuleInfo(id)?.code ?? '').trim().length > 64);
      // …and no emitted file (an image or font URL, a CSS url()) comes from docs/ or public/source/ either.
      const assetsFromDocs = Object.values(bundle).filter((a) => a.type === 'asset').flatMap((a) => [...((a as { originalFileNames?: string[] }).originalFileNames ?? []), ...(a.names ?? [])].filter((n) => /^(docs|public\/source)\//.test(n.replace(here, '').replace(/^\/+/, ''))).map((n) => `${a.fileName} (${n})`));
      if (assetsFromDocs.length) this.error(`productionBuild: a docs/ or source file emitted into the public bundle (lane Y6):\n  ${assetsFromDocs.join('\n  ')}`);
      if (fromDocs.length) this.error(`productionBuild: docs/ content in the public bundle (lane Y6, docs gate):\n  ${fromDocs.map((i) => i.replace(here, '')).join('\n  ')}`);
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
      // Lane Y6: a glob over docs/ resolves to no files (the content is in the private pack, behind the server's gate).
      return code.replace(/import\.meta\.glob(?:<[^>()]*>)?\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")[^)]*\)/g, (all, pattern: string) => (intoDocs(pattern) ? '({})' : all));
    },
    load(id) {
      const file = id.split('?')[0];
      // Lane Y6: a direct import of anything under docs/ is empty (a JSON file an empty list: Vite's JSON plugin reads it).
      if (!file.startsWith(DOCS_DIR)) return null;
      return file.endsWith('.json') ? '[]' : "export default '';";
    },
    // Lane Y6: the content of docs/ goes to the private pack, never into a public chunk.
    writeBundle(options) {
      const outDir = resolve(here, options.dir ?? 'dist');
      writePrivateDocsPack(privateDocsDir(outDir));
    },
  };
}

export default defineConfig({
  base: './',
  // Keep optimized dependencies local when independent worktrees share installed packages.
  cacheDir: join(here, '.vite'),
  define: {
    __COMPONENT_COUNT__: JSON.stringify(countFiles(join(here, 'src/components'), '.meta.ts')),
    // Lane Y6: production bundles nothing from docs/; the Hub's stat strip still prints the chapter count.
    __MANUAL_CHAPTER_COUNT__: JSON.stringify(readdirSync(join(here, 'docs/ops-manual/es')).filter((f) => f.endsWith('.md')).length),
    // Which build this is, as a constant the bundler folds (src/config/launch.ts `PRODUCTION_BUILD`).
    __HOY_BUILD__: JSON.stringify(PRODUCTION ? 'production' : 'review'),
  },
  plugins: [react(), docMetaPlugin(), ...(PRODUCTION ? [productionBuild()] : [reviewBuild()])],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 1000 },
});
