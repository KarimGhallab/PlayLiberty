import { expect } from '@playwright/test';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { playlistUrl, writeScenario } from './instance';
import type { Scenario } from './instance';

/* Names a source and the entries the fake returns; a test that changes the
 * source mid-journey writes the scenario again with the same call. */

export interface PlaylistSeed {
  readonly sourceId: string;
  readonly title: string;
  readonly entries: Scenario['sources'][string]['entries'];
  readonly downloads?: Scenario['downloads'];
}

export function scriptPlaylist(seed: PlaylistSeed): void {
  writeScenario({
    sources: {
      [seed.sourceId]: { title: seed.title, entries: [...seed.entries] }
    },
    ...(seed.downloads === undefined ? {} : { downloads: seed.downloads })
  });
}

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

export async function openPlaylist(page: Page, title: string): Promise<void> {
  await page.getByRole('link', { name: title }).click();
}

/* A playlist created through the route, for a test that needs more names in a
 * picker than a journey should click through. A create answers 202 with its run. */
export async function createPlaylist(
  request: APIRequestContext,
  sourceId: string
): Promise<void> {
  const response = await request.post('/api/v1/playlists', {
    headers: { 'X-PlayLiberty-Client': 'web' },
    data: { url: playlistUrl(sourceId) }
  });

  if (response.status() !== 202) {
    throw new Error(
      `Creating ${sourceId} answered ${response.status()}, not 202.`
    );
  }
}

export async function openHeaderMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More actions' }).click();
}

/* Nothing polls: a state the server reaches on its own is read again only when
 * something asks, and a reload is that ask rather than a fixed sleep. The wait
 * is the document, not every resource: the reads land after it. */
export async function reloadUntil(
  page: Page,
  locator: Locator,
  timeout = 45_000
): Promise<void> {
  const deadline = Date.now() + timeout;

  for (;;) {
    await page.reload({ waitUntil: 'domcontentloaded' });

    try {
      // The reads land after the document, so wait rather than look at once.
      await locator.waitFor({ state: 'visible', timeout: 5_000 });
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
    }
  }
}
