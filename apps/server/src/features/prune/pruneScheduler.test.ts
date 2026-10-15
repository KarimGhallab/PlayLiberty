import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';
import { seedTrack } from '../../app/testing/fixtures.js';

import { tracks } from '../../platform/database/schema.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

/*
 * The close hook has to end the instance whether or not a prune is running, and
 * the scheduled job has to be the service rather than a stub. A cron that fires
 * every second puts a real tick inside the test's lifetime, so both can be
 * asserted without waiting a week. What the prune removes belongs to the service
 * tests; this is about the wiring and the close.
 */
describe('the prune scheduler', () => {
  it('runs the service on its tick and closes cleanly', async () => {
    context = await createTestContext(
      { PRUNE_CRON: '* * * * * *' },
      { startBackgroundJobs: true }
    );
    const { trackId } = seedTrack(context.database, {
      title: 'Orphan',
      durationSeconds: null
    });

    // Wait for the tick, polling rather than sleeping a fixed second, so the test
    // is as fast as the job is and no slower.
    let reclaimed = false;
    for (let attempt = 0; attempt < 50 && !reclaimed; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      reclaimed =
        context.database.db
          .select()
          .from(tracks)
          .where(eq(tracks.id, trackId))
          .get() === undefined;
    }

    expect(reclaimed).toBe(true);

    // The close stops the clock and signals any run in flight rather than waiting
    // on it, so it resolves rather than hanging.
    await expect(context.cleanup()).resolves.toBeUndefined();
    context = undefined;
  });
});
