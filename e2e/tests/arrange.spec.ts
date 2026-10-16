import type { Locator, Page } from '@playwright/test';

import { drainDownloads, videoUrl, writeScenario } from '../support/instance';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey: arranging the track list. The saved order, the whole-playlist chip
 * counts and the controls going inert while shuffled are true only of the
 * assembled product.
 */

const SOURCE = 'E2Earrange01';
const TITLE = 'Arranging Journey';

const A = { videoId: 'e2earrange1a', title: 'Track A' };
const B = { videoId: 'e2earrange1b', title: 'Track B' };
const C = { videoId: 'e2earrange1c', title: 'Track C' };
/* Added last, so it is the newest and the one that fails to download. */
const FAILED = { videoId: 'e2earrange1d', title: 'Track D' };

/** The titles the list draws, in the order drawn, the failed row included. */
async function rowTitles(page: Page): Promise<string[]> {
  const rows = await page.getByRole('listitem').allInnerTexts();

  return rows
    .map(row => row.split('\n')[0].trim())
    .filter(title => title.length > 0);
}

function currentRow(page: Page): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('img', { name: /^(Playing|Paused)$/ }) });
}

async function addTrack(
  page: Page,
  video: { videoId: string; title: string }
): Promise<void> {
  await page.getByRole('button', { name: 'Add a track' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add a track' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Video link').fill(videoUrl(video.videoId));
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function chooseSort(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /^Sort by: / }).click();
  await page.getByRole('option', { name: label }).click();
  await expect(
    page.getByRole('button', { name: `Sort by: ${label}` })
  ).toBeVisible();
}

/* Three stored tracks and one that fails, so the list holds two states. Tracks
 * B, C and D arrive one at a time, each with its own added-at. */
async function seed(page: Page): Promise<void> {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [A],
    downloads: { [FAILED.videoId]: 'fail' }
  });
  await openPlaylist(page, TITLE);

  // The sync's association lands before the dialog adds, so append order and
  // added-at order agree.
  await expect(page.getByRole('button', { name: 'All 1' })).toBeVisible();

  for (const video of [B, C, FAILED]) {
    writeScenario({
      sources: { [video.videoId]: { title: video.title, entries: [video] } },
      downloads: { [FAILED.videoId]: 'fail' }
    });
    await addTrack(page, video);
  }

  await drainDownloads(page);
  await page.reload();

  await expect(page.getByRole('button', { name: 'Stored 3' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Failed 1' })).toBeVisible();

  /* Two-second fixture: looping the element leaves the manual step the only
   * thing that moves the queue on a slow runner. */
  await page.locator('audio').evaluate(element => {
    (element as HTMLAudioElement).loop = true;
  });
}

test('the saved sort re-orders the list, survives a reload and is the order the transport walks', async ({
  page
}) => {
  await seed(page);

  await expect(
    page.getByRole('button', { name: 'Sort by: Playlist order' })
  ).toBeVisible();
  await expect
    .poll(() => rowTitles(page))
    .toEqual([A.title, B.title, C.title, FAILED.title]);

  await chooseSort(page, 'Newest first');
  await expect
    .poll(() => rowTitles(page))
    .toEqual([FAILED.title, C.title, B.title, A.title]);

  // Server-owned: a reload opens the list in the saved order again.
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Sort by: Newest first' })
  ).toBeVisible();
  await expect
    .poll(() => rowTitles(page))
    .toEqual([FAILED.title, C.title, B.title, A.title]);

  /* Unshuffled, the transport walks the saved order, skipping the failed newest
   * row: C, then B, then A. */
  await page.getByRole('button', { name: 'Play this playlist' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(C.title));
  await page.getByRole('button', { name: 'Track next' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(B.title));
  await page.getByRole('button', { name: 'Track next' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(A.title));

  await chooseSort(page, 'Oldest first');
  await expect
    .poll(() => rowTitles(page))
    .toEqual([A.title, B.title, C.title, FAILED.title]);

  await chooseSort(page, 'Playlist order');
  await expect(
    page.getByRole('button', { name: 'Sort by: Playlist order' })
  ).toBeVisible();
  await expect
    .poll(() => rowTitles(page))
    .toEqual([A.title, B.title, C.title, FAILED.title]);
});
