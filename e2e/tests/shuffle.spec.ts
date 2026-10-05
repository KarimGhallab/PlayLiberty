import type { Locator, Page } from '@playwright/test';

import { drainDownloads } from '../support/instance';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * The shuffle as an order the transport walks, and the list that shows it.
 *
 * These are end-to-end because the three behaviours under test are only true of
 * the assembled product: the queue is the player store's, the list is the detail
 * page's, and the order they agree on is drawn from a real playlist whose files a
 * real worker stored. A unit test proves the walk over a hand-written queue; only
 * a browser proves that the row pressed, the row drawn and the track sounding are
 * the same track.
 *
 * Five stored tracks and one that fails to download. The failing entry is
 * intentional: it can never be queued, so it is the row the queue order has to
 * leave alone, and it is what makes the list order a thing to assert rather than a
 * re-print of the queue. The downloads are drained rather than waited on, because
 * the worker stores two tracks per pass on a 30-second interval and this scenario
 * needs three passes.
 */

const SOURCE = 'E2Eshuffle1';
const TITLE = 'Evening Jazz';

const A = { videoId: 'e2eshuffle1a', title: 'Track A' };
const B = { videoId: 'e2eshuffle1b', title: 'Track B' };
const C = { videoId: 'e2eshuffle1c', title: 'Track C' };
const D = { videoId: 'e2eshuffle1d', title: 'Track D' };
const E = { videoId: 'e2eshuffle1e', title: 'Track E' };
const FAILED = { videoId: 'e2eshuffle1f', title: 'Track F' };

const STORED = [A, B, C, D, E];
const ENTRIES = [...STORED, FAILED];

/** The titles in the order the list draws them. */
async function rowTitles(page: Page): Promise<string[]> {
  const rows = await page.locator('ul li').allInnerTexts();

  return rows
    .map(row => row.split('\n')[0].trim())
    .filter(title => title.length > 0);
}

/** The titles the queue carries, in the order the list draws them. */
async function audibleTitles(page: Page): Promise<string[]> {
  return (await rowTitles(page)).filter(title => title !== FAILED.title);
}

/** The title of the row the player marks as current. */
async function soundingTitle(page: Page): Promise<string> {
  const text = await page.locator('ul li[data-state="playing"]').innerText();

  return text.split('\n')[0].trim();
}

function shuffleControl(page: Page): Locator {
  return page.getByRole('button', { name: `Shuffle ${TITLE}` });
}

/*
 * Press shuffle and wait for the queue it builds.
 *
 * The first press on a playlist with no queue for it reads the tracks and builds
 * one, so the pressed state is set a moment later. Waiting on `aria-pressed` is
 * that moment; reading the drawn order before it would read the playlist's order
 * and make every assertion after it a race.
 */
async function pressShuffle(page: Page): Promise<void> {
  await shuffleControl(page).click();
  await expect(shuffleControl(page)).toHaveAttribute('aria-pressed', 'true');
}

/*
 * Seed the playlist and wait until every stored entry can play. The drain stores
 * the backlog in one call, so the wait is on the product finishing rather than on
 * the worker's next interval; the last row offering its play control is that
 * finish, and a reload re-reads the list the drain produced.
 */
async function seed(page: Page): Promise<void> {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: ENTRIES,
    /* The failing entry is a download that fails, so it is the one row that can
     * never be queued: a failure is terminal until a retry, and the list still
     * has to draw it. */
    downloads: { [FAILED.videoId]: 'fail' }
  });
  await openPlaylist(page, TITLE);
  await drainDownloads(page);
  await page.reload();

  await expect(
    page.getByRole('button', {
      name: `Play ${STORED[STORED.length - 1].title}`
    })
  ).toBeVisible();
}

test('the queue a shuffle builds leads with the first stored track and the list draws it', async ({
  page
}) => {
  await seed(page);
  await pressShuffle(page);

  /* The first stored track leads the queue, and it is the one sounding. */
  const playing = page.locator('ul li[data-state="playing"]');
  await expect(playing).toHaveCount(1);
  await expect(playing).toHaveText(new RegExp(A.title));

  /* The list is drawn in the queue's order, and the failed row stays in its
   * playlist neighbourhood rather than being promoted or dropped. */
  const titles = await rowTitles(page);
  expect(titles[0]).toBe(A.title);
  expect(titles).toContain(FAILED.title);
  expect(new Set(titles)).toEqual(new Set(ENTRIES.map(entry => entry.title)));
});

test('next walks the shuffled queue and stops at its end rather than re-rolling', async ({
  page
}) => {
  await seed(page);
  await pressShuffle(page);

  /* Read the order once, then walk it with the header's own forward step. */
  const order = await audibleTitles(page);
  expect(order).toHaveLength(STORED.length);
  expect(await soundingTitle(page)).toBe(order[0]);

  for (let step = 1; step < order.length; step += 1) {
    await expect(
      page.getByRole('button', { name: 'Track next' })
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Track next' }).click();
    await expect(page.locator('ul li[data-state="playing"]')).toHaveText(
      new RegExp(order[step])
    );
  }

  /*
   * The last entry is the end. The forward step is disabled and a press changes
   * nothing, which is the whole point: a shuffled queue that re-rolled would move
   * to a track the listener already heard.
   */
  await expect(page.getByRole('button', { name: 'Track next' })).toBeDisabled();
  await page.getByRole('button', { name: 'Track next' }).click({ force: true });
  expect(await soundingTitle(page)).toBe(order[order.length - 1]);
});

test('turning the shuffle off restores the playlist order under the same playhead', async ({
  page
}) => {
  await seed(page);
  await pressShuffle(page);

  /* Walk one step so the playhead is somewhere a restore could move it. */
  await page.getByRole('button', { name: 'Track next' }).click();
  const sounding = await soundingTitle(page);

  await shuffleControl(page).click();
  await expect(shuffleControl(page)).toHaveAttribute('aria-pressed', 'false');

  /* The list is the playlist's order again, and the track that was sounding is
   * still the one sounding, now at its own place in that order. */
  const restored = await audibleTitles(page);
  expect(restored).toEqual(STORED.map(entry => entry.title));
  expect(await soundingTitle(page)).toBe(sounding);

  /* And the forward step is the playlist's next track, not the shuffled one. */
  const index = restored.indexOf(sounding);
  if (index < restored.length - 1) {
    await page.getByRole('button', { name: 'Track next' }).click();
    await expect(page.locator('ul li[data-state="playing"]')).toHaveText(
      new RegExp(restored[index + 1])
    );
  }
});

test('pressing a row walks the shuffled queue rather than rebuilding it', async ({
  page
}) => {
  await seed(page);
  await pressShuffle(page);

  const shuffledOrder = await rowTitles(page);
  const playing = await soundingTitle(page);
  const target = (await audibleTitles(page))
    .filter(title => title !== playing)
    .slice(-1)[0];

  await page.getByRole('button', { name: `Play ${target}` }).click();

  /* The pressed row plays, and the order it was drawn in is untouched. */
  await expect(page.locator('ul li[data-state="playing"]')).toHaveText(
    new RegExp(target)
  );
  expect(await rowTitles(page)).toEqual(shuffledOrder);
});
