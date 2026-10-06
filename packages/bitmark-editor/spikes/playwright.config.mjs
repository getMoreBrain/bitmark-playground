import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './tests/results',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { browserName: 'chromium', headless: true },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://localhost:4603/',
    reuseExistingServer: true,
  },
});
