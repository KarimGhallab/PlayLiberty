import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { playlistUrl, writeScenario } from './instance';
import type { Scenario } from './instance';

/*
 * The setup every curation and sharing journey shares: pick what the fake source
 * answers with, add the playlist through the library dialog, and open its detail.
 *
 * A test names a source and the entries the fake should return; this owns the
 * three steps around it so a journey reads as the action it is about. A test that
 * changes the source mid-journey, as a sync and a retry do, writes the scenario
 * again with the same call.
 */

export interface PlaylistSeed {
  readonly sourceId: string;
  readonly title: string;
  readonly entries: Scenario['sources'][string]['entries'];
  readonly downloads?: Scenario['downloads'];
}

/** Script the fake adapter's answer for one source. */
export function scriptPlaylist(seed: PlaylistSeed): void {
  writeScenario({
    sources: {
      [seed.sourceId]: { title: seed.title, entries: [...seed.entries] }
    },
    ...(seed.downloads === undefined ? {} : { downloads: seed.downloads })
  });
}

/** Add the playlist from the library and wait for the item the server returns. */
export async function addPlaylist(
  page: Page,
  seed: PlaylistSeed
): Promise<void> {
  scriptPlaylist(seed);

  await page.goto('/');
  await page
    .getByRole('button', { name: 'Add a playlist', exact: true })
    .first()
    .click();
  await page.getByLabel('Playlist link').fill(playlistUrl(seed.sourceId));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('link', { name: seed.title })).toBeVisible();
}

/** Open a playlist's detail from the library item. */
export async function openPlaylist(page: Page, title: string): Promise<void> {
  await page.getByRole('link', { name: title }).click();
}

/** Open the detail header's overflow menu. */
export async function openHeaderMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More actions' }).click();
}

/*
 * Reload until a locator is there. The detail's reads are fetched when it mounts
 * and after a mutation, and nothing polls: a state the server reaches on its own
 * (a download finishing, or a background reconcile adding a track) is only read
 * again when something asks. Reloading is that ask, and it is what a person does
 * to look again, so a journey that waits on the server waits this way rather than
 * on a fixed sleep.
 *
 * The wait after a reload is `waitFor` rather than an immediate look, because the
 * reads land after the load event: a check made the moment `reload` resolves asks
 * before the query has answered, and a brand-new page renders no state until it
 * has.
 */
export async function reloadUntil(
  page: Page,
  locator: Locator,
  timeout = 45_000
): Promise<void> {
  const deadline = Date.now() + timeout;

  for (;;) {
    await page.reload();

    try {
      await locator.waitFor({ state: 'visible', timeout: 5_000 });
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
    }
  }
}
