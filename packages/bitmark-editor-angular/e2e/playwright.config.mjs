import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: './results',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { browserName: 'chromium', headless: true },
  webServer: { command: 'node serve.mjs', url: 'http://localhost:4621/', reuseExistingServer: true, cwd: '.' },
});
