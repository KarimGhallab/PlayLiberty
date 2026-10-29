import type { Page } from '@playwright/test';

import {
  drainDownloads,
  playlistUrl,
  writeScenario
} from '../support/instance';
import { SERVER_PORT } from '../support/paths';
import { addPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journeys through the library: adding a playlist and reading the gallery it
 * lands in. The items are the server's, carrying the source's own title and
 * count, which the client never knew before the request.
 */

const PLAYLIST_ID = 'E2Eplaylist1';
test('adding a playlist creates it and the item arrives from the server', async ({
  page
}) => {
  writeScenario({
    sources: {
      [PLAYLIST_ID]: {
        title: 'Evening Jazz',
        entries: [
          { videoId: 'e2evideo001', title: 'Blue In Green' },
          { videoId: 'e2evideo002', title: 'Naima' },
          { videoId: 'e2evideo003', title: 'Flamenco Sketches' }
        ]
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

  // The name is the source's own, which the browser could not have guessed.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Evening Jazz' })).toBeVisible();
});

test('a refused create shows the server problem beside the field', async ({
  page
}) => {
  // A Vimeo URL is refused by the server's own URL check, not by the schema,
  // because the schema only requires a URL.
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Add a playlist', exact: true })
    .first()
    .click();

  await page.getByLabel('Playlist link').fill('https://vimeo.com/album/12345');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText(
    'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
  );
  await expect(page.getByRole('dialog')).toBeVisible();
});

/* A settled playlist reads up to date while holding a track that never
 * downloaded, so the mark is the only thing that says so. */
test('the gallery marks what is not stored', async ({ page }) => {
  await addPlaylist(page, {
    sourceId: 'E2Egallery1',
    title: 'Evening Jazz',
    entries: [
      { videoId: 'e2egallery01', title: 'Blue In Green' },
      { videoId: 'e2egallery02', title: 'Naima' },
      { videoId: 'e2egallery03', title: 'Flamenco Sketches' }
    ],
    downloads: { e2egallery03: 'fail' }
  });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });

  /* The count is over the whole playlist, not one page of it. */
  await expect(
    page.getByRole('img', { name: '1 track is not stored · Failed 1' })
  ).toBeVisible();
});

/*
 * The bar is chrome and a menu is the fresher tier, so a card partway down puts
 * the panel's foot in the bar's band and the press proves it was not swallowed.
 */
test('a playlist’s action menu covers the docked bar', async ({ page }) => {
  /* Short enough that the first card's panel reaches the bar's band. */
  await page.setViewportSize({ width: 390, height: 360 });
  await addPlaylist(page, {
    sourceId: 'E2Emenu0001',
    title: 'Evening Jazz',
    entries: [
      { videoId: 'e2emenu001', title: 'Blue In Green' },
      { videoId: 'e2emenu002', title: 'Naima' }
    ]
  });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });

  /* The bar docks when a playlist plays, which is what puts it under the menu. */
  await page.getByRole('button', { name: 'Play Evening Jazz' }).first().click();
  await expect(
    page.getByRole('button', { name: 'Pause Evening Jazz' }).first()
  ).toBeVisible();

  await page
    .getByRole('button', { name: /More actions/ })
    .first()
    .click();

  const item = await page
    .getByRole('menuitem', { name: 'Delete' })
    .boundingBox();
  const dock = await page.locator('footer').boundingBox();

  expect(item).not.toBeNull();
  expect(dock).not.toBeNull();
  /* Asserted, not assumed: a panel clear of the bar would pass vacuously. */
  expect(item!.y + item!.height).toBeGreaterThan(dock!.y);

  await page.getByRole('menuitem', { name: 'Delete' }).click();

  /* The undo window proves the press reached the menu and not the bar. */
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

/*
 * Only the assembled product has these: the pin survives a reload, a pinned
 * playlist leaves the list below, and a read-level account can still pin.
 */

const PIN_OWN_SOURCE = 'E2Epinown01';
const PIN_SHARED_SOURCE = 'E2Epinshare1';
const PIN_OWN_TITLE = 'Evening Jazz';
const PIN_SHARED_TITLE = 'Focus 2009';
const PIN_OWN_TRACK = { videoId: 'e2epinown01', title: 'Blue In Green' };
const PIN_SHARED_TRACK = { videoId: 'e2epinsh01', title: 'Naima' };
const PIN_PARTNER = {
  id: 'e2e-pin-partner',
  name: 'Ada Owner',
  email: 'ada@example.test'
};

const PIN_API = `http://127.0.0.1:${SERVER_PORT}/api/v1`;

/* The reload reads the server, so the press is paired with the write's response
 * rather than the optimistic move, or it could outrun the write. */
async function pinPlaylist(
  page: Page,
  title: string,
  label: 'Pin' | 'Unpin'
): Promise<void> {
  await page.getByRole('button', { name: `More actions for ${title}` }).click();

  await Promise.all([
    page.waitForResponse(response =>
      /\/api\/v1\/playlists\/[^/]+\/pin$/.test(new URL(response.url()).pathname)
    ),
    page.getByRole('menuitem', { name: label, exact: true }).click()
  ]);
}

test('a pinned playlist leaves the list for a section above, and a reader can pin too', async ({
  page,
  request
}) => {
  await addPlaylist(page, {
    sourceId: PIN_OWN_SOURCE,
    title: PIN_OWN_TITLE,
    entries: [PIN_OWN_TRACK]
  });

  /* A second playlist owned by another account and shared read-level: the
   * partner exists by reading their own account with the edge headers. */
  const partner = {
    'Remote-User': PIN_PARTNER.id,
    'Remote-Name': PIN_PARTNER.name,
    'Remote-Email': PIN_PARTNER.email,
    'X-PlayLiberty-Client': 'web'
  };

  const seen = await request.get(`${PIN_API}/me`, { headers: partner });
  expect(seen.ok()).toBe(true);

  /* The share names an account by id, and the browser's row is not the edge's
   * `dev-user`, so it is read back through the proxy's headers. */
  const me = await request.get(`${PIN_API}/me`, {
    headers: { 'Remote-User': 'dev-user' }
  });
  expect(me.ok()).toBe(true);
  const readerId: string = (await me.json()).id;

  writeScenario({
    sources: {
      [PIN_SHARED_SOURCE]: {
        title: PIN_SHARED_TITLE,
        entries: [PIN_SHARED_TRACK]
      }
    }
  });

  const created = await request.post(`${PIN_API}/playlists`, {
    headers: partner,
    data: { url: playlistUrl(PIN_SHARED_SOURCE) }
  });
  expect(created.status()).toBe(202);
  const sharedId: string = (await created.json()).playlistId;

  const granted = await request.post(
    `${PIN_API}/playlists/${sharedId}/shares`,
    { headers: partner, data: { accountId: readerId, level: 'read' } }
  );
  expect(granted.ok()).toBe(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: PIN_OWN_TITLE })).toBeVisible();
  await expect(
    page.getByRole('link', { name: PIN_SHARED_TITLE })
  ).toBeVisible();

  await pinPlaylist(page, PIN_OWN_TITLE, 'Pin');

  const pinned = page.getByRole('region', { name: 'Pinned' });
  await expect(pinned.getByRole('link', { name: PIN_OWN_TITLE })).toBeVisible();
  await expect(page.getByRole('link', { name: PIN_OWN_TITLE })).toHaveCount(1);
  await expect(
    pinned.getByRole('link', { name: PIN_SHARED_TITLE })
  ).toHaveCount(0);

  /* The pin is the server's fact and not the tab's. */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page
      .getByRole('region', { name: 'Pinned' })
      .getByRole('link', { name: PIN_OWN_TITLE })
  ).toBeVisible();

  /* A reader's menu holds the pin alone. */
  await page
    .getByRole('button', { name: `More actions for ${PIN_SHARED_TITLE}` })
    .click();
  await page.getByRole('menuitem', { name: 'Pin', exact: true }).click();

  /* The section is in name order, not pin order: the pinned one was first and
   * this one most recent. */
  const section = page.getByRole('region', { name: 'Pinned' });
  const sectionItems = section.getByRole('link');
  await expect(sectionItems).toHaveCount(2);
  await expect(sectionItems.nth(0)).toHaveAccessibleName(PIN_OWN_TITLE);
  await expect(sectionItems.nth(1)).toHaveAccessibleName(PIN_SHARED_TITLE);

  await pinPlaylist(page, PIN_SHARED_TITLE, 'Unpin');
  await pinPlaylist(page, PIN_OWN_TITLE, 'Unpin');

  await expect(page.getByRole('heading', { name: 'Pinned' })).toHaveCount(0);
  const list = page.getByRole('list');
  const listItems = list.getByRole('link');
  await expect(listItems).toHaveCount(2);
  await expect(listItems.nth(0)).toHaveAccessibleName(PIN_OWN_TITLE);
  await expect(listItems.nth(1)).toHaveAccessibleName(PIN_SHARED_TITLE);
});
