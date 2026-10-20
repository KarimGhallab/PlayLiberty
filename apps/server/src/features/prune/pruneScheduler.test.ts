import { access, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

async function fileExists(absolutePath: string): Promise<boolean> {
  return access(absolutePath).then(
    () => true,
    () => false
  );
}

/*
 * Close hook must end the instance with a prune running or not; the job must be
 * the service, not a stub. A per-second cron puts a real tick in the test.
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

    // Wait for the tick by polling, not a sleep, so it is as fast as the job.
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

    // The close stops the clock and signals a run, so it resolves, not hangs.
    await expect(context.cleanup()).resolves.toBeUndefined();
    context = undefined;
  });

  it('sweeps an orphaned cover on the same tick', async () => {
    context = await createTestContext(
      { PRUNE_CRON: '* * * * * *' },
      { startBackgroundJobs: true }
    );
    const cover = join(context.mediaPaths.coversDir, 'orphan.webp');
    await writeFile(cover, 'the-cover');
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(cover, old, old);

    let reclaimed = false;
    for (let attempt = 0; attempt < 50 && !reclaimed; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      reclaimed = !(await fileExists(cover));
    }

    expect(reclaimed).toBe(true);

    await expect(context.cleanup()).resolves.toBeUndefined();
    context = undefined;
  });
});
