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
 * A second sync, and so the idempotence the spec promises, is driven from the
 * library's overflow: the failure case creates a playlist, settles it, removes
 * its source and resyncs, so the detail's band has something to keep and explain.
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
  // A source with two tracks, so the playlist has something to keep when the
  // next reconcile fails.
  writeScenario({
    sources: {
      [PLAYLIST_ID]: {
        title: 'Evening Jazz',
        entries: [
          { videoId: 'e2esyncfail01', title: 'Blue In Green' },
          { videoId: 'e2esyncfail02', title: 'Naima' }
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

  // It settles with its tracks.
  await expect(page.getByText('Up to date')).toBeVisible({ timeout: 15_000 });

  // The source is gone now, so the next reconcile throws.
  writeScenario({ sources: {} });

  // Start that reconcile from the library's overflow.
  await page
    .getByRole('button', { name: 'More actions for Evening Jazz' })
    .click();
  await page.getByRole('menuitem', { name: 'Sync now' }).click();

  // The row says the sync failed rather than going quiet.
  await expect(page.getByText('Sync failed')).toBeVisible({
    timeout: 15_000
  });

  // Opening it explains the fault, reassures and offers the retry, and the
  // server's own words are one control away.
  await page.getByRole('link', { name: 'Evening Jazz' }).click();
  await expect(
    page.getByText(
      'Could not reach YouTube, so this playlist is not up to date with its source.'
    )
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/still here and still playable/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible();

  await page.getByRole('button', { name: 'Show details' }).click();
  await expect(page.getByText(/no source for/)).toBeVisible();
});
