import type { Locator, Page } from '@playwright/test';

import { drainDownloads, videoUrl, writeScenario } from '../support/instance';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey: arranging the track list.
 *
 * These facts are true only of the assembled product: the order a sort saves is
 * the order the server reads back and the order the transport walks, the counts
 * the chips carry are the whole playlist's rather than the rows drawn, and the
 * controls go inert while the shuffled queue is the list on screen. The
 * read-collaborator view is left to the route and component tests, because the
 * dev proxy fixes one browser identity.
 *
 * The associations are made one at a time. A single sync stamps every entry with
 * one instant, and a date sort over equal instants tiebreaks on the playlist's
 * own position, so it would be a no-op; distinct added-at times are what make
 * the date sort a different order from the playlist's own.
 */

const SOURCE = 'E2Earrange01';
const TITLE = 'Arranging Journey';

const A = { videoId: 'e2earrange1a', title: 'Track A' };
const B = { videoId: 'e2earrange1b', title: 'Track B' };
const C = { videoId: 'e2earrange1c', title: 'Track C' };
/* Added last, so it is the newest and the one that fails to download. */
const FAILED = { videoId: 'e2earrange1d', title: 'Track D' };

const STORED = [A, B, C];

/** The titles the list draws, in the order drawn, the failed row included. */
async function rowTitles(page: Page): Promise<string[]> {
  const rows = await page.getByRole('listitem').allInnerTexts();

  return rows
    .map(row => row.split('\n')[0].trim())
    .filter(title => title.length > 0);
}

/** The row the player marks as current. */
function currentRow(page: Page): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('img', { name: /^(Playing|Paused)$/ }) });
}

/** The number on the header's count line, which names the list's total. */
function headerCount(page: Page): Locator {
  return page.locator('[data-arrangement="card"]').getByText(/^\d+$/);
}

/** Add one video to the playlist on screen, preselected in the dialog. */
async function addTrack(
  page: Page,
  video: { videoId: string; title: string }
): Promise<void> {
  await page.getByRole('button', { name: 'Add a track' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add a track' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Video link').fill(videoUrl(video.videoId));
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();

  // Every chosen playlist took it, so the dialog closes.
  await expect(dialog).toBeHidden();
}

/** Pick an order from the sort control and wait for the button to read it. */
async function chooseSort(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /^Sort by: / }).click();
  await page.getByRole('option', { name: label }).click();
  await expect(
    page.getByRole('button', { name: `Sort by: ${label}` })
  ).toBeVisible();
}

function shuffleControl(page: Page): Locator {
  return page.getByRole('button', { name: `Shuffle ${TITLE}` });
}

async function pressShuffle(page: Page): Promise<void> {
  await shuffleControl(page).click();
  await expect(shuffleControl(page)).toHaveAttribute('aria-pressed', 'true');
}

/*
 * One playlist with three stored tracks and one that fails to download, so the
 * list holds two states at once. The first track arrives by sync; the other
 * three by the add dialog, one at a time, so each association carries its own
 * added-at and the date sort has something to order by.
 */
async function seed(page: Page): Promise<void> {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [A],
    downloads: { [FAILED.videoId]: 'fail' }
  });
  await openPlaylist(page, TITLE);

  // The sync's association lands before the dialog adds the rest, so the append
  // order and the added-at order agree.
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

  /*
   * The fixture is two seconds long and the player advances when a track ends,
   * so a walk slower than the file would be overtaken by the track finishing and
   * the queue would move on its own. Looping the element leaves the manual step
   * the only thing that moves the queue.
   */
  await page.locator('audio').evaluate(element => {
    (element as HTMLAudioElement).loop = true;
  });
}

test('the saved sort re-orders the list, survives a reload and is the order the transport walks', async ({
  page
}) => {
  await seed(page);

  // Untouched, the list is the playlist's own order.
  await expect(
    page.getByRole('button', { name: 'Sort by: Playlist order' })
  ).toBeVisible();
  await expect
    .poll(() => rowTitles(page))
    .toEqual([A.title, B.title, C.title, FAILED.title]);

  // Newest first reverses it, and the failed row is the newest of all.
  await chooseSort(page, 'Newest first');
  await expect
    .poll(() => rowTitles(page))
    .toEqual([FAILED.title, C.title, B.title, A.title]);

  // The order is the server's fact, so a reload opens the list in it again.
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Sort by: Newest first' })
  ).toBeVisible();
  await expect
    .poll(() => rowTitles(page))
    .toEqual([FAILED.title, C.title, B.title, A.title]);

  /*
   * While unshuffled, the saved order is the order the transport walks: the
   * first playable is C, then B, then A, because the newest row is the failed
   * one and cannot be queued.
   */
  await page.getByRole('button', { name: 'Play this playlist' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(C.title));
  await page.getByRole('button', { name: 'Track next' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(B.title));
  await page.getByRole('button', { name: 'Track next' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(A.title));

  // Oldest first reverses the newest, and the playlist's own order is reachable
  // again.
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

test('the chips carry the whole-playlist counts and narrow the list and the count line', async ({
  page
}) => {
  await seed(page);

  // Every state's count is the whole playlist's, drawn before any press.
  await expect(page.getByRole('button', { name: 'All 4' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stored 3' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pending 0' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Downloading 0' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Failed 1' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Unavailable 0' })
  ).toBeVisible();

  /*
   * A chip narrows the list and the header's count line to the filtered total,
   * while the counts themselves stay the whole playlist's.
   */
  await page.getByRole('button', { name: 'Stored 3' }).click();
  await expect(headerCount(page)).toHaveText('3');
  await expect.poll(() => rowTitles(page)).toEqual([A.title, B.title, C.title]);
  await expect(page.getByRole('button', { name: 'Failed 1' })).toBeVisible();

  // All restores both.
  await page.getByRole('button', { name: 'All 4' }).click();
  await expect(headerCount(page)).toHaveText('4');
  await expect
    .poll(() => rowTitles(page))
    .toEqual([A.title, B.title, C.title, FAILED.title]);

  // A state with one row narrows to that row alone.
  await page.getByRole('button', { name: 'Failed 1' }).click();
  await expect(headerCount(page)).toHaveText('1');
  await expect.poll(() => rowTitles(page)).toEqual([FAILED.title]);

  // A state with no rows draws the named empty state, whose action clears it.
  await page.getByRole('button', { name: 'Unavailable 0' }).click();
  await expect(headerCount(page)).toHaveText('0');
  await expect(page.getByText('No unavailable tracks')).toBeVisible();

  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(headerCount(page)).toHaveText('4');
  await expect
    .poll(() => rowTitles(page))
    .toEqual([A.title, B.title, C.title, FAILED.title]);
});

test('the controls go inert while the shuffled queue is the list on screen', async ({
  page
}) => {
  await seed(page);

  await pressShuffle(page);

  // Both controls belong to the unshuffled list, so both are disabled.
  await expect(page.getByRole('button', { name: /^Sort by: / })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'All 4' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Stored 3' })).toBeDisabled();

  /*
   * The list draws the shuffled queue's order: its playable rows are a
   * permutation of the stored tracks, led by the one sounding, and the transport
   * walks them in the order drawn.
   */
  const playable = (await rowTitles(page)).filter(
    title => title !== FAILED.title
  );
  const leader = playable[0];
  const second = playable[1];

  if (leader === undefined || second === undefined) {
    throw new Error('The shuffled queue should carry every stored track.');
  }

  expect(playable).toHaveLength(STORED.length);
  expect(new Set(playable)).toEqual(new Set(STORED.map(video => video.title)));
  await expect(currentRow(page)).toHaveText(new RegExp(leader));

  await page.getByRole('button', { name: 'Track next' }).click();
  await expect(currentRow(page)).toHaveText(new RegExp(second));
});
