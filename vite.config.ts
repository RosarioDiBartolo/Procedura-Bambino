import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
const posterSource = fileURLToPath(new URL('./fonti/Poster Rianimazione 2025 DEFINITIVO.pdf', import.meta.url));
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'original-poster',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/sources/poster-sin-2025.pdf') return next();
        res.setHeader('Content-Type', 'application/pdf');
        res.end(readFileSync(posterSource));
      });
    },
    generateBundle() {
      this.emitFile({type:'asset', fileName:'sources/poster-sin-2025.pdf', source:readFileSync(posterSource)});
    },
  }],
  base: './',
  css: {postcss: {plugins: []}},
  resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
  test: {environment:'jsdom', setupFiles:['./src/testSetup.ts'], include:['src/**/*.test.{ts,tsx}'], restoreMocks:true},
});
