import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end security verification of the deployed app.
 *
 * Run against the published preview URL by default; override with
 *   E2E_BASE_URL=https://staging.example.com bun playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://craft-your-journey-35.lovable.app',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
