// Playwright configuration for www.freddy-epr.com E2E testing
// 包装法授权代表在线功能测试（仅包装法，不涉及 WEEE/电池）
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Sequential to avoid overwhelming the server
  reporter: [
    ['html', { outputFolder: 'test-reports/freddy-epr-html' }],
    ['json', { outputFile: 'test-reports/freddy-epr-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://www.freddy-epr.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
