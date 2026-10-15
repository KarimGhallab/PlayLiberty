import { playlistUrl, writeScenario } from '../support/instance';
import { expect, test } from '../support/test';

/*
 * Journey 3: play a stored track and seek within it, in a real browser.
 *
 * This is the spec's own verification and the reason it is an end-to-end test
 * rather than a unit: a fake audio element can prove the queue, the order and the
 * refusals, but it cannot prove that a seek is heard. The fake adapter copies a
 * real silent M4A and reports its real two-second length, so the element that
 * plays here is a browser playing a file and `currentTime` is the browser's own
 * number, not a stub's.
 *
 * Autoplay is not blocked because the press is a gesture: the click on the row's
 * play control is the user activation the browser requires.
 */

const PLAYLIST_ID = 'E2Eplaylist';

test('a stored track plays and the seeker moves the real playhead', async ({
  page
}) => {
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

  /*
   * Press play and let the element actually run. A silent file still advances
   * `currentTime`, which is the fact that proves the browser is playing rather
   * than the UI merely claiming it. The whole row is the control, and the button
   * that carries the label spans it, so the press lands on the row itself.
   */
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

  /*
   * Pause before seeking so the element is not racing the assertion. The track
   * is two seconds long, so a backward seek measured while it played could be
   * overtaken by the file reaching its end.
   */
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(async () =>
      audio.evaluate(element => (element as HTMLAudioElement).paused)
    )
    .toBe(true);
  const before = await currentTime();

  /*
   * Seek back toward the start through the seeker, which is the UI control and
   * not the element. A backward jump is the unambiguous proof: forward playback
   * only moves the playhead forward, and the element is paused anyway, so a
   * reading that drops below the fixed half-second mark can only be the seek.
   */
  const scrub = page.getByRole('slider', { name: 'Position in track' });
  const box = await scrub.boundingBox();

  if (box === null) {
    throw new Error('The seeker has no box to click.');
  }

  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);

  await expect.poll(currentTime, { timeout: 5_000 }).toBeLessThan(before);
  expect(await currentTime()).toBeLessThan(0.5);
});
