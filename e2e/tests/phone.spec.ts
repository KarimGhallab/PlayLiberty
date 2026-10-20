import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { drainDownloads, writeScenario } from '../support/instance';
import {
  addPlaylist,
  createPlaylist,
  openPlaylist,
  reloadUntil
} from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey: the phone. Runs only in the `phone` project (390x844, touch on), the
 * one place the phone arrangement is rendered and a gesture is real, and the one
 * place a hit area is measured where it is drawn.
 */

const SOURCE = 'E2Ephone001';
const TITLE = 'Phone Journey';
const TRACK = { videoId: 'e2ephone01', title: 'Blue In Green' };

/* The target a thumb is owed, and what each control draws. */
const TARGET = 44;
const MUTE = 36;
const SWITCH_WIDTH = 40;
const SWITCH_HEIGHT = 22;
const OVERFLOW = 28;

/*
 * The hit area is invisible, so it is measured by what a point resolves to: 1px
 * inside the edge of the target a control owes must still land on it, whichever
 * box the control draws.
 */
async function measureTarget(
  locator: Locator
): Promise<{ height: number; width: number }> {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();

  const measured = await locator.evaluate((element, target) => {
    const box = element.getBoundingClientRect();
    const centreX = box.left + box.width / 2;
    const centreY = box.top + box.height / 2;
    const reach = target / 2 - 1;
    const probes: [string, number, number][] = [
      ['above', centreX, centreY - reach],
      ['below', centreX, centreY + reach],
      ['left', centreX - reach, centreY],
      ['right', centreX + reach, centreY]
    ];

    return {
      height: box.height,
      width: box.width,
      misses: probes
        .filter(
          ([, x, y]) => !element.contains(document.elementFromPoint(x, y))
        )
        .map(([side]) => side)
    };
  }, TARGET);

  expect(measured.misses, 'the sides of the target').toEqual([]);

  return { height: measured.height, width: measured.width };
}

/* The bar rises into the viewport. A raw touchscreen tap reads its box, so the
 * box must be at rest or the point is measured below the fold. */
async function settleBar(page: Page): Promise<void> {
  await page
    .getByRole('contentinfo', { name: 'Player' })
    .evaluate(element =>
      Promise.allSettled(
        element.getAnimations().map(animation => animation.finished)
      )
    );
}

async function seed(page: Page, request: APIRequestContext): Promise<void> {
  writeScenario({ sources: { [SOURCE]: { title: TITLE, entries: [TRACK] } } });
  await createPlaylist(request, SOURCE);

  await page.goto('/');
  await openPlaylist(page, TITLE);

  /* The worker stores on its own schedule, so the row is re-read by reloading. */
  await reloadUntil(
    page,
    page.getByRole('button', { name: `Play ${TRACK.title}` })
  );
}

test('the gallery draws the phone grid', async ({ page, request }) => {
  const COUNT = 4;
  const sources = Array.from(
    { length: COUNT },
    (_, index) => `E2EphoneGrid${index}`
  );
  const titles = Array.from({ length: COUNT }, (_, index) => `Phone ${index}`);

  writeScenario({
    sources: Object.fromEntries(
      sources.map((source, index) => [
        source,
        { title: titles[index], entries: [] }
      ])
    )
  });

  for (const source of sources) {
    await createPlaylist(request, source);
  }

  await page.goto('/');

  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(COUNT);

  const first = await items.nth(0).boundingBox();
  const second = await items.nth(1).boundingBox();

  if (first === null || second === null) {
    throw new Error('The gallery drew no box for its first two items.');
  }

  /* Two to a row is the card grid's own 160px minimum. The desk's 232px tile
   * could fit one column in 390, so this fails on a desk layout. */
  expect(second.x).toBeGreaterThan(first.x);
  expect(Math.abs(second.y - first.y)).toBeLessThan(1);
});

test('the card keeps the name clear of the failed mark', async ({ page }) => {
  await addPlaylist(page, {
    sourceId: 'E2EphoneName',
    title: 'Etoiles',
    entries: [{ videoId: 'e2ephonename1', title: 'Blue In Green' }],
    downloads: { e2ephonename1: 'fail' }
  });
  await drainDownloads(page);
  await page.reload();

  /* The failed count is the badge's reason to be drawn. */
  await expect(
    page.getByRole('img', { name: '1 track is not stored · Failed 1' })
  ).toBeVisible();

  const name = page.getByRole('link', { name: 'Etoiles' });
  const clipped = await name.evaluate(
    element => element.scrollWidth > element.clientWidth
  );

  expect(clipped).toBe(false);
});

test('a tap above the seeker moves the playhead', async ({ page, request }) => {
  await seed(page, request);

  await page.getByRole('button', { name: `Play ${TRACK.title}` }).tap();

  const audio = page.locator('audio');
  const currentTime = (): Promise<number> =>
    audio.evaluate(element => (element as HTMLAudioElement).currentTime);

  await expect.poll(currentTime, { timeout: 10_000 }).toBeGreaterThan(0.8);

  /* Paused first: the two-second fixture could end and overtake a seek measured
   * while it plays. */
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await expect
    .poll(() => audio.evaluate(element => (element as HTMLAudioElement).paused))
    .toBe(true);

  const before = await currentTime();
  const scrub = page.getByRole('slider', { name: 'Position in track' });
  const box = await scrub.boundingBox();

  if (box === null) {
    throw new Error('The seeker has no box to tap.');
  }

  // 10px above the 4px track: inside the target, outside what it draws.
  await page.touchscreen.tap(
    box.x + box.width * 0.1,
    box.y + box.height / 2 - 10
  );

  await expect.poll(currentTime, { timeout: 5_000 }).toBeLessThan(before);
  expect(await currentTime()).toBeLessThan(0.5);
});

test('a tap above the mute silences the player', async ({ page, request }) => {
  await seed(page, request);

  await page.getByRole('button', { name: `Play ${TRACK.title}` }).tap();
  await settleBar(page);

  const audio = page.locator('audio');
  const muted = (): Promise<boolean> =>
    audio.evaluate(element => (element as HTMLAudioElement).muted);

  await expect.poll(muted).toBe(false);

  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  const box = await mute.boundingBox();

  if (box === null) {
    throw new Error('The mute has no box to tap.');
  }

  // 2px above the 36px button: inside the target, outside the drawn box.
  await page.touchscreen.tap(box.x + box.width / 2, box.y - 2);

  await expect.poll(muted).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Unmute', exact: true })
  ).toBeVisible();
});

test('every control reaches the touch target it owes', async ({
  page,
  request
}) => {
  await seed(page, request);
  await page.getByRole('button', { name: `Play ${TRACK.title}` }).tap();

  expect(
    await measureTarget(page.getByRole('button', { name: 'Mute', exact: true }))
  ).toEqual({ height: MUTE, width: MUTE });

  expect(
    await measureTarget(
      page.getByRole('button', { name: `Actions for ${TRACK.title}` })
    )
  ).toEqual({ height: OVERFLOW, width: OVERFLOW });

  expect(
    await measureTarget(
      page.getByRole('switch', { name: 'Skip non-music parts' })
    )
  ).toEqual({ height: SWITCH_HEIGHT, width: SWITCH_WIDTH });
});
