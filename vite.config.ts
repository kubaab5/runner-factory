import { defineConfig } from 'vite';

// One build per game: VITE_GAME=gym vite build --outDir dist/gym
export default defineConfig({
  base: './',
  build: { outDir: process.env.OUT_DIR || 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 2500, emptyOutDir: true },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
} as never);
