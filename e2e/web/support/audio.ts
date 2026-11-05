import type { Page } from '@playwright/test';

/* A runner with no audio device fails an unmuted AAC stream in Firefox; the
 * silent fixtures only prove the clock, which a muted element keeps. */
export async function mutePlayback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;

    HTMLMediaElement.prototype.play = function playMuted(
      this: HTMLMediaElement
    ) {
      this.muted = true;

      return play.call(this);
    };
  });
}
