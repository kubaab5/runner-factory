import { defineConfig } from 'vite';
import playgamaBridge from '@playgama/bridge/vite';

// The Bridge SDK is copied into the build (mode 'local'): the archive loads nothing from outside.
export default defineConfig({
  base: './',
  plugins: [playgamaBridge({ mode: 'local' })],
  build: { outDir: 'dist', assetsInlineLimit: 0, emptyOutDir: true },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
} as never);
