import { defineConfig } from 'vite';
import playgamaBridge from '@playgama/bridge/vite';

// One build per game: VITE_GAME=gym vite build --outDir dist/gym
// The Bridge SDK is copied into the build (mode 'local'): the archive loads nothing from outside (rule 1.2.5).
export default defineConfig({
  base: './',
  plugins: [playgamaBridge({ mode: 'local' })],
  build: { outDir: process.env.OUT_DIR || 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 2500, emptyOutDir: true },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
} as never);
