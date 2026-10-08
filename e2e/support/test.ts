import { test as base } from '@playwright/test';

import { resetInstance } from './instance';

/*
 * Every E2E test starts on an empty instance. The reset is an auto-fixture, so a
 * test that forgets to ask for it still gets it, which matters because the whole
 * suite shares one server and one account.
 *
 * It uses the `request` fixture rather than a `page`, so a test no longer pays for
 * an app load before it starts: the reset is one request through the Vite dev
 * server, which carries the edge identity the server fails closed without.
 */
export const test = base.extend<{ reset: void }>({
  reset: [
    async ({ request }, use) => {
      await resetInstance(request);
      await use();
    },
    { auto: true }
  ]
});

export { expect } from '@playwright/test';
