import { readFileSync } from 'node:fs';
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

const bridge = readFileSync(new URL('./scripts/fixtures/meta-measurement/meta-measurement-frame.html', import.meta.url));
export default mergeConfig(base, defineConfig({
  plugins: [{
    name: 'local-meta-browser-fixture',
    configureServer(server) {
      server.middlewares.use('/meta-measurement-frame.html', (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'self'; sandbox allow-scripts");
        res.end(bridge);
      });
    },
  }],
}));
