import { playlistUrl, writeScenario } from '../support/instance';
import { expect, test } from '../support/test';

/*
 * Journey 2: the sync a create starts, seen from the browser.
 *
 * The create route answers before the reconcile finishes, so the item reads
 * `Syncing` for a moment and then settles. Because the fake adapter answers at
 * once, the settled state is what the browser reliably observes; the transient
 * `Syncing` is asserted only as "not the settled state", which is what the run
 * actually guarantees while it works.
 *
 * A second sync, and so the idempotence the spec promises, needs a sync control
 * and there is none in the library; that belongs to the playlist detail and is
 * deferred with the other unbuilt journeys.
 */

const PLAYLIST_ID = 'E2Esyncplaylist';

test('a created playlist syncs through the adapter and settles with its source tracks', async ({
  page
}) => {
  writeScenario({
    sources: {
      [PLAYLIST_ID]: {
        title: 'Evening Jazz',
        entries: [
          { videoId: 'e2esync001', title: 'Blue In Green' },
          { videoId: 'e2esync002', title: 'Naima' }
        ]
      }
    }
  });

  await page.goto('/');
  await page
    .getByRole('button', { name: 'Add a playlist', exact: true })
    .first()
    .click();
  await page.getByLabel('Playlist link').fill(playlistUrl(PLAYLIST_ID));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  // The source's own title and its two tracks, from the server.
  await expect(page.getByRole('link', { name: 'Evening Jazz' })).toBeVisible();
  await expect(page.getByText('2')).toBeVisible();

  // The run settles: the sync state leaves `Syncing` for the rested word.
  await expect(page.getByText('Syncing').filter({ visible: true })).toHaveCount(
    0,
    { timeout: 15_000 }
  );
  await expect(page.getByText('Up to date')).toBeVisible();
});

test('a failed sync leaves the playlist marked as failed rather than silent', async ({
  page
}) => {
  // No source for this id, so the fake throws and the reconcile fails.
  writeScenario({ sources: {} });

  await page.goto('/');
  await page
    .getByRole('button', { name: 'Add a playlist', exact: true })
    .first()
    .click();
  await page.getByLabel('Playlist link').fill(playlistUrl(PLAYLIST_ID));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Sync failed')).toBeVisible({
    timeout: 15_000
  });
});
