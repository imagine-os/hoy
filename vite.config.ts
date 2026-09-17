import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps assets relative so the build works at https://imagine-os.github.io/hoy/ and locally.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
});
