import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  timeout: 180000,
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: false,
    launchOptions: { args: ['--no-sandbox'] },
  },
  webServer: { command: 'npx vite preview --outDir dist --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
