import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { docMetaPlugin } from './scripts/lib/docmeta.mjs';

// base './' keeps assets relative so the build works at https://imagine-os.github.io/hoy/ and locally.
// docMetaPlugin serves `*.md?docmeta` (title, header meta, headings, decisions…) so the docs browser and
// the manual index the markdown at build time while the bodies load on demand as `?raw` chunks.
export default defineConfig({
  base: './',
  plugins: [react(), docMetaPlugin()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 1000 },
});
