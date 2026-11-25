import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const html = readFileSync(new URL('./scripts/fixtures/meta-measurement/meta-measurement-frame.html', import.meta.url), 'utf8');
const existing = html.match(/<script>([\s\S]+)<\/script>/)?.[1];
if (!existing) throw new Error('Missing QA frame script');

const productionPixel = '963759066544104';
const testPixel = process.env.HOY_QA_TEST_PIXEL_ID ?? '';
const testOrigin = process.env.HOY_QA_TEST_ORIGIN ?? '';
if (testPixel || testOrigin) {
  const url = new URL(testOrigin);
  // Only an explicitly chosen, separate host may run this synthetic collector.
  if (!/^\d{12,20}$/.test(testPixel) || testPixel === productionPixel ||
      url.protocol !== 'https:' || url.origin !== testOrigin ||
      /(^|\.)hoyhumanclub\.com\.?$/.test(url.hostname)) {
    throw new Error('Use a separately verified test Pixel ID and an isolated HTTPS QA origin.');
  }
}
const disabled = !testPixel;
const oldHash = createHash('sha256').update(existing).digest('base64');
if (!html.includes("'sha256-" + oldHash + "'") || !existing.includes("const pixel = '" + productionPixel + "';")) {
  throw new Error('Unexpected QA bridge template');
}
const next = disabled ? '// Collector disabled in this build.' : existing.replace(
  "const pixel = '" + productionPixel + "';",
  'if (parentOrigin !== ' + JSON.stringify(testOrigin) + ') return;\n  const pixel = ' + JSON.stringify(testPixel) + ';',
);
const newHash = createHash('sha256').update(next).digest('base64');
// Default artifact has no executable loader and no permitted third-party destination.
const frame = disabled
  ? '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"><title>QA collector disabled</title></head><body></body></html>'
  : html.replace(existing, next).replace(oldHash, newHash);

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'emit-isolated-static-meta-qa',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'meta-measurement-frame.html', source: frame });
      },
    },
  ],
  build: {
    outDir: 'dist-meta-qa',
    rollupOptions: { input: fileURLToPath(new URL('./meta-qa.html', import.meta.url)) },
  },
});
