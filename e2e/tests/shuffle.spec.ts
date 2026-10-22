import type { Locator, Page } from '@playwright/test';

import { drainDownloads } from '../support/instance';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * The shuffle as an order the transport walks and the list that shows it. The
 * failing track can never be queued, so the list order is a thing to assert
 * rather than a re-print of the queue.
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

async function rowTitles(page: Page): Promise<string[]> {
  const rows = await page.getByRole('listitem').allInnerTexts();

  return rows
    .map(row => row.split('\n')[0].trim())
    .filter(title => title.length > 0);
}

async function audibleTitles(page: Page): Promise<string[]> {
  return (await rowTitles(page)).filter(title => title !== FAILED.title);
}

function currentRow(page: Page): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByText(/^(Playing|Paused)$/) });
}

async function soundingTitle(page: Page): Promise<string> {
  const text = await currentRow(page).innerText();

  return text.split('\n')[0].trim();
}

function shuffleControl(page: Page): Locator {
  return page.getByRole('button', { name: `Shuffle ${TITLE}` });
}

/* The first press builds the queue, so `aria-pressed` is the moment to wait
 * for; reading the drawn order before it would be a race. */
async function pressShuffle(page: Page): Promise<void> {
  await shuffleControl(page).click();
  await expect(shuffleControl(page)).toHaveAttribute('aria-pressed', 'true');
}

/* The drain stores the backlog in one call, so the last row offering its play
 * control is the finish; a reload re-reads the list it produced. */
async function seed(page: Page): Promise<void> {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: ENTRIES,
    /* The failing entry can never be queued, yet the list still draws it. */
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

  /* Looping the two-second fixture keeps `ended` from firing, so the manual
   * step is the only thing that moves the queue on a slow runner. */
  await page.locator('audio').evaluate(element => {
    (element as HTMLAudioElement).loop = true;
  });
}

test('the queue a shuffle builds leads with a stored track and the list draws it', async ({
  page
}) => {
  await seed(page);
  await pressShuffle(page);

  const playing = currentRow(page);
  await expect(playing).toHaveCount(1);
  const sounding = await soundingTitle(page);
  expect(STORED.map(entry => entry.title)).toContain(sounding);

  /* The list follows the queue, led by the sounding track; the failed row stays
   * in its playlist neighbourhood. */
  const titles = await rowTitles(page);
  expect(titles[0]).toBe(sounding);
  expect(titles).toContain(FAILED.title);
  expect(new Set(titles)).toEqual(new Set(ENTRIES.map(entry => entry.title)));
});

test('next walks the shuffled queue and stops at its end rather than re-rolling', async ({
  page
}) => {
  await seed(page);
  await pressShuffle(page);

  const order = await audibleTitles(page);
  expect(order).toHaveLength(STORED.length);
  expect(await soundingTitle(page)).toBe(order[0]);

  for (let step = 1; step < order.length; step += 1) {
    await expect(
      page.getByRole('button', { name: 'Track next' })
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Track next' }).click();
    await expect(currentRow(page)).toHaveText(new RegExp(order[step]));
  }

  /* A press at the end changes nothing: a queue that re-rolled would move to a
   * track already heard. */
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

  const restored = await audibleTitles(page);
  expect(restored).toEqual(STORED.map(entry => entry.title));
  expect(await soundingTitle(page)).toBe(sounding);

  const index = restored.indexOf(sounding);
  if (index < restored.length - 1) {
    await page.getByRole('button', { name: 'Track next' }).click();
    await expect(currentRow(page)).toHaveText(new RegExp(restored[index + 1]));
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

  await expect(currentRow(page)).toHaveText(new RegExp(target));
  expect(await rowTitles(page)).toEqual(shuffledOrder);
});
