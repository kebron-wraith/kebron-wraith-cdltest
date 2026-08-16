const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '*.spec.js',
  timeout: 60000,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'tests-report' }]],
  use: {
    headless: false,
    viewport: { width: 1400, height: 900 },
    screenshot: 'on',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
