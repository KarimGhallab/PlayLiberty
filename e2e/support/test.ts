import { test as base } from '@playwright/test';

import { resetInstance } from './instance';

/*
 * Every test starts on an empty instance: the reset is an auto-fixture, so a
 * test that forgets it still gets it, which matters because the suite shares
 * one server and one account.
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
