import { defineConfig, devices } from '@playwright/test';

import {
  ROOT_DIR,
  TEST_RESULTS_DIR,
  TEST_RESULTS_ROOT,
  e2eInstanceIndices,
  instancePaths
} from './support/paths';

/*
 * A real server and database driven through a browser; only the YouTube adapter
 * (`NODE_ENV=test`) and the edge identity (injected by the Vite dev proxy) are
 * faked. Every worker gets its own server, database, media root and scenario.
 */

const instances = e2eInstanceIndices();
const primary = instancePaths(instances[0]);
const sharedResults = process.env.E2E_INSTANCE === undefined;

/* One CI leg runs one engine and names it; a local run keeps Chromium. */
const engines = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari']
};

type EngineName = keyof typeof engines;

function isEngine(name: string): name is EngineName {
  return Object.hasOwn(engines, name);
}

const engineName = process.env.E2E_BROWSER ?? 'chromium';

if (!isEngine(engineName)) {
  throw new Error(
    `E2E_BROWSER must be one of ${Object.keys(engines).join(', ')}, not "${engineName}".`
  );
}

const engine = engines[engineName];

export default defineConfig({
  testDir: './tests',
  globalSetup: './support/global-setup.ts',
  outputDir: sharedResults ? TEST_RESULTS_ROOT : TEST_RESULTS_DIR,
  fullyParallel: true,
  workers: instances.length,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: primary.webUrl,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: engineName,
      testIgnore: /phone\.spec\.ts/,
      use: { ...engine }
    },
    {
      name: 'phone',
      testMatch: /phone\.spec\.ts/,
      use: {
        ...engine,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      }
    }
  ],
  // The stack must be built first: `pnpm run build` produces the dist booted
  // here and the workspace packages the dev server resolves.
  webServer: instances.flatMap(index => {
    const instance = instancePaths(index);
    const serverEnv: Record<string, string> = {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(instance.serverPort),
      LOG_LEVEL: 'warn',
      MEDIA_ROOT: instance.mediaRoot,
      DATABASE_PATH: instance.databasePath,
      E2E_FAKE_SCRIPT: instance.fakeScript,
      PRUNE_CRON: '0 0 1 1 *',
      DOWNLOAD_SLEEP_REQUESTS: '0'
    };
    const webEnv: Record<string, string> = {
      VITE_API_TARGET: instance.serverUrl,
      VITE_CACHE_DIR: instance.viteCacheDir,
      VITE_NO_OPEN: '1'
    };

    return [
      {
        name: `server-${index}`,
        command:
          `node -e "require('node:fs').mkdirSync(require('node:path').dirname(process.env.DATABASE_PATH),{recursive:true})" && ` +
          'node apps/server/dist/main.js',
        cwd: ROOT_DIR,
        url: `${instance.serverUrl}/healthz`,
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120_000,
        env: serverEnv
      },
      {
        name: `web-${index}`,
        command: `pnpm --filter @playliberty/web exec vite --port ${instance.webPort} --strictPort --host 127.0.0.1`,
        cwd: ROOT_DIR,
        url: instance.webUrl,
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120_000,
        env: webEnv
      }
    ];
  })
});
