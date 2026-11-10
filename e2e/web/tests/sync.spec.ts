import { playlistUrl, writeScenario } from '../support/instance';
import { expect, test } from '../support/test';

/*
 * Journey 2: the sync a create starts. The create answers before the reconcile
 * finishes, but the fake settles at once, so `Syncing` is asserted only as "not
 * the settled state".
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

  await expect(page.getByRole('link', { name: 'Evening Jazz' })).toBeVisible();

  await expect(page.getByText('Syncing').filter({ visible: true })).toHaveCount(
    0,
    { timeout: 15_000 }
  );
  await expect(page.getByText('Up to date')).toBeVisible();
});

test('a failed sync leaves the playlist marked as failed rather than silent', async ({
  page
}) => {
  // Two tracks, so the playlist has something to keep when the next reconcile
  // fails.
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

  await expect(page.getByText('Up to date')).toBeVisible({ timeout: 15_000 });

  // No source now, so the reconcile throws.
  writeScenario({ sources: {} });

  await page
    .getByRole('button', { name: 'More actions for Evening Jazz' })
    .click();
  await page.getByRole('menuitem', { name: 'Sync' }).click();

  await expect(page.getByText('Sync failed')).toBeVisible({
    timeout: 15_000
  });

  await page.getByRole('link', { name: 'Evening Jazz' }).click();

  // The server's own words, which only the real server can produce.
  await page.getByRole('button', { name: 'Show details' }).click();
  await expect(page.getByText(/no source for/)).toBeVisible();
});
