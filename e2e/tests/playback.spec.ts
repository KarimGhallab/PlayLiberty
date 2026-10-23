import { mutePlayback } from '../support/audio';
import { playlistUrl, writeScenario } from '../support/instance';
import { expect, test } from '../support/test';

/*
 * Journey 3: play a stored track and seek, in a real browser. The fake copies a
 * real two-second M4A, so `currentTime` is the browser's own number and a seek
 * is actually heard, which a fake element cannot prove.
 */

const PLAYLIST_ID = 'E2Eplaylist';

test('a stored track plays and the seeker moves the real playhead', async ({
  page
}) => {
  await mutePlayback(page);

  writeScenario({
    sources: {
      [PLAYLIST_ID]: {
        title: 'Evening Jazz',
        entries: [{ videoId: 'e2eplay001', title: 'Blue In Green' }]
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

  await page.getByRole('link', { name: 'Evening Jazz' }).click();
  const play = page.getByRole('button', { name: 'Play Blue In Green' });
  await expect(play).toBeVisible({ timeout: 30_000 });

  /* A silent file still advances `currentTime`, which is what proves the
   * browser plays rather than the UI claiming it. */
  await play.click();
  const audio = page.locator('audio');
  const currentTime = (): Promise<number> =>
    audio.evaluate(element => (element as HTMLAudioElement).currentTime);

  await expect.poll(currentTime, { timeout: 10_000 }).toBeGreaterThan(0.8);
  await expect
    .poll(async () =>
      audio.evaluate(element => !(element as HTMLAudioElement).paused)
    )
    .toBe(true);

  /* Pause first: the two-second file could end and overtake a seek measured
   * while it plays. */
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(async () =>
      audio.evaluate(element => (element as HTMLAudioElement).paused)
    )
    .toBe(true);
  const before = await currentTime();

  /* The seeker is the UI control, not the element: a paused, backward-jumping
   * reading can only be the seek. */
  const scrub = page.getByRole('slider', { name: 'Position in track' });
  const box = await scrub.boundingBox();

  if (box === null) {
    throw new Error('The seeker has no box to click.');
  }

  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);

  await expect.poll(currentTime, { timeout: 5_000 }).toBeLessThan(before);
  expect(await currentTime()).toBeLessThan(0.5);
});
