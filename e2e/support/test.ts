import type { APIRequestContext } from '@playwright/test';
import { test as base } from '@playwright/test';

import { mutePlayback } from './audio';
import { resetInstance } from './instance';
import { instanceForWorker, instancePaths } from './paths';

/*
 * Every test starts on an empty instance: the reset is an auto-fixture, so a
 * test that forgets it still gets it, which matters because each worker shares
 * one stack and one account.
 */
export const test = base.extend<{ reset: void; request: APIRequestContext }>({
  page: async ({ page }, use) => {
    await mutePlayback(page);
    await use(page);
  },
  baseURL: async ({ baseURL: configured }, use, testInfo) => {
    const instance = instancePaths(instanceForWorker(testInfo.parallelIndex));
    const url = new URL(configured ?? instance.webUrl);

    url.port = String(instance.webPort);
    await use(url.origin);
  },
  request: async ({ playwright, baseURL }, use) => {
    const request = await playwright.request.newContext({ baseURL });

    await use(request);
    await request.dispose();
  },
  reset: [
    async ({ request }, use) => {
      await resetInstance(request);
      await use();
    },
    { auto: true }
  ]
});

export { expect } from '@playwright/test';
