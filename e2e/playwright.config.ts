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
 * End-to-end tests run against a real server and a real database, driven through a
 * browser. Two seams are faked and nothing else: the YouTube adapter (external and
 * non-deterministic) through `NODE_ENV=test`, and the edge identity, which the Vite
 * dev server already injects on its API proxy.
 *
 * One worker, because the server and its database are one shared instance. Tests
 * reset it between runs through the test-only reset route rather than by starting a
 * second server.
 *
 * The scenario file is written by the tests and read by the server's fake adapter
 * on every call, so the stack can boot before any test has chosen a scenario.
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
  webServer: [
    {
      /*
       * The data directory must exist before `better-sqlite3` opens the file, and
       * Playwright starts `webServer` before `globalSetup`, so the directory is
       * made here rather than there. `globalSetup` still clears the scenario and
       * the media between runs.
       */
      command:
        `node -e "require('node:fs').mkdirSync(require('node:path').dirname(process.env.DATABASE_PATH),{recursive:true})" && ` +
        'pnpm --filter @playliberty/server build && node apps/server/dist/main.js',
      cwd: ROOT_DIR,
      url: `http://127.0.0.1:${SERVER_PORT}/healthz`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
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
      command: `pnpm --filter @playliberty/web exec vite --port ${WEB_PORT} --strictPort`,
      cwd: ROOT_DIR,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_TARGET: `http://127.0.0.1:${SERVER_PORT}`,
        VITE_NO_OPEN: '1'
      }
    }
  ]
});
