// Starts the Hoy server (Railway runs `node server/index.mjs` after `npm run build`).
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHandler, createHoyServer } from './app.mjs';
import { clerkSessionVerifier } from './clerk.mjs';
import { loadConfig } from './config.mjs';

let config;
try {
  config = loadConfig();
  await access(resolve(config.distDir, 'index.html'));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const handler = await createHandler(config, { verifySession: clerkSessionVerifier(config) });
const server = createHoyServer(handler);
server.listen(config.port, () => {
  console.log(JSON.stringify({ event: 'server.started', port: config.port, environment: config.environment, tenant: config.tenant }));
});

// Railway sends SIGTERM before replacing a deployment: finish what is in flight, then exit.
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
});
