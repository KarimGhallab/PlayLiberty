import { defineConfig, devices } from '@playwright/test';

import {
  DATABASE_PATH,
  FAKE_SCRIPT,
  MEDIA_ROOT,
  ROOT_DIR,
  SERVER_PORT,
  WEB_PORT
} from './support/paths';

/*
 * A real server and database driven through a browser; only the YouTube adapter
 * (`NODE_ENV=test`) and the edge identity (injected by the Vite dev proxy) are
 * faked. One worker, because server and database are one shared instance.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './support/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  // The stack must be built first: `pnpm run build` produces the dist booted
  // here and the workspace packages the dev server resolves.
  webServer: [
    {
      name: 'server',
      command:
        `node -e "require('node:fs').mkdirSync(require('node:path').dirname(process.env.DATABASE_PATH),{recursive:true})" && ` +
        'node apps/server/dist/main.js',
      cwd: ROOT_DIR,
      url: `http://127.0.0.1:${SERVER_PORT}/healthz`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: String(SERVER_PORT),
        LOG_LEVEL: 'warn',
        MEDIA_ROOT,
        DATABASE_PATH,
        E2E_FAKE_SCRIPT: FAKE_SCRIPT,
        PRUNE_CRON: '0 0 1 1 *',
        DOWNLOAD_SLEEP_REQUESTS: '0'
      }
    },
    {
      name: 'web',
      command: `pnpm --filter @playliberty/web exec vite --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: ROOT_DIR,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
      env: {
        VITE_API_TARGET: `http://127.0.0.1:${SERVER_PORT}`,
        VITE_NO_OPEN: '1'
      }
    }
  ]
});
