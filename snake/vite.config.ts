import { defineConfig } from 'vite';
import playgamaBridge from '@playgama/bridge/vite';

// The Bridge SDK is copied into the build (mode 'local'): the archive loads nothing from outside.
export default defineConfig({
  base: './',
  plugins: process.env.PREVIEW ? [] : [playgamaBridge({ mode: 'local' })],
  build: { outDir: process.env.PREVIEW ? 'dist-preview' : 'dist', assetsInlineLimit: 0, emptyOutDir: true },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
} as never);
