import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'frontend',
      testMatch: 'tests/frontend/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
    },
    {
      name: 'admin',
      testMatch: 'tests/admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3003',
      },
    },
    {
      name: 'landing',
      testMatch: 'tests/landing/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3004',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev --prefix ../frontend',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { PATH: `/Users/simplysui/.nvm/versions/node/v24.14.1/bin:${process.env.PATH}` },
    },
    {
      command: 'npm run dev -- --port 3003',
      cwd: '../admin',
      url: 'http://localhost:3003',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { PATH: `/Users/simplysui/.nvm/versions/node/v24.14.1/bin:${process.env.PATH}` },
    },
    {
      command: 'npm run dev -- --port 3004',
      cwd: '../landing',
      url: 'http://localhost:3004',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { PATH: `/Users/simplysui/.nvm/versions/node/v24.14.1/bin:${process.env.PATH}` },
    },
  ],
});
