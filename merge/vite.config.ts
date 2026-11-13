import { defineConfig } from 'vite';
import playgamaBridge from '@playgama/bridge/vite';

// The Bridge SDK is copied into the build (mode 'local'): the archive loads nothing from outside.
export default defineConfig({
  base: './',
  plugins: process.env.PREVIEW ? [] : [playgamaBridge({ mode: 'local' })],
  // SINGLE=1: one flat folder (index.html with JS, CSS and fonts inlined, plus the Bridge files) for portals
  // that refuse archives and nested folders, such as the CrazyGames uploader on a phone.
  build: process.env.SINGLE
    ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000, cssCodeSplit: false, emptyOutDir: true, rollupOptions: { output: { inlineDynamicImports: true } } }
    : { outDir: process.env.PREVIEW ? 'dist-preview' : 'dist', assetsInlineLimit: 0, emptyOutDir: true },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
} as never);
