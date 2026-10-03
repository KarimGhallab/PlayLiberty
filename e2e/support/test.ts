import { test as base } from '@playwright/test';

import { resetInstance } from './instance';

/*
 * Every E2E test starts on an empty instance. The reset is an auto-fixture, so a
 * test that forgets to ask for it still gets it, which matters because the whole
 * suite shares one server and one account.
 *
 * It needs a `page`, because the reset goes through the browser to carry the edge
 * identity the Vite proxy injects; a direct request from the test process would
 * arrive without it and be refused as unauthenticated.
 */
export const test = base.extend<{ reset: void }>({
  reset: [
    async ({ page }, use) => {
      /*
       * The reset is a relative request, so the page needs an origin first: a
       * fresh `about:blank` cannot resolve it. Landing on the app also warms the
       * bundle, and the test's own `goto('/')` then reloads onto the emptied
       * instance.
       */
      await page.goto('/');
      await resetInstance(page);
      await use();
    },
    { auto: true }
  ]
});

export { expect } from '@playwright/test';
