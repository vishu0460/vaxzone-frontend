import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.VITE_FRONTEND_URL || 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'powershell -ExecutionPolicy Bypass -File run-local.ps1',
      url: 'http://localhost:8080/api/health',
      cwd: '../backend',
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
      env: {
        ...process.env,
        DEV_AUTO_VERIFY_EMAIL: process.env.DEV_AUTO_VERIFY_EMAIL || 'true',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
