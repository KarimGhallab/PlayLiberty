import type { Page } from '@playwright/test';

import {
  drainDownloads,
  playlistUrl,
  writeScenario
} from '../support/instance';
import { SERVER_PORT } from '../support/paths';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journeys through the library: adding a playlist, the one path where content
 * enters the instance, and reading the gallery it lands in. The items the browser
 * draws are the server's, so what appears carries the source's own title and
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

  // The dialog closes and the item is the server's: the name is the source's own
  // title, which the browser could not have guessed.
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

/*
 * Journey 2: reading the gallery. A playlist whose tracks are not all stored has
 * to say so before it is opened, because the sync line cannot: the playlist below
 * settled, so it reads as up to date with a track that never downloaded. The mark
 * is one pill whatever is missing, and its detail is one hover away.
 */
test('the gallery marks what is not stored and the tile still opens its playlist', async ({
  page
}) => {
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
  await page.reload();

  /* One pill, carrying the count of tracks whose file is not here, and the count
   * is over the whole playlist rather than one page of it. */
  const mark = page.getByRole('img', {
    name: '1 track is not stored · Failed 1'
  });
  await expect(mark).toBeVisible();

  /* The detail is the reason, not only the number. */
  await mark.hover();
  await expect(mark.getByText('Failed', { exact: true })).toBeVisible();

  /* The tile is still a door: the name opens the playlist the mark belongs to. */
  await openPlaylist(page, 'Evening Jazz');
  await expect(
    page.getByRole('heading', { name: 'Evening Jazz' })
  ).toBeVisible();
});

/*
 * Journey 3: the gallery on a phone. The item is the card at this width and the
 * grid is more than one column, because a tile per row is a playlist per screen.
 * The band holds the play, which is the one control a library item has that starts
 * playback: a press starts the playlist and the same control becomes the pause.
 * The picture is a second way in, because the card puts its play on the artwork
 * and an anchor cannot hold a button.
 */
test('the gallery is a grid of cards on a phone, and a card plays its playlist', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addPlaylist(page, {
    sourceId: 'E2Ephone001',
    title: 'Evening Jazz',
    entries: [
      { videoId: 'e2ephone001', title: 'Blue In Green' },
      { videoId: 'e2ephone002', title: 'Naima' }
    ]
  });
  await drainDownloads(page);
  await page.reload();

  const card = page.locator('[data-arrangement="card"]').first();
  await expect(card).toBeVisible();
  await expect(page.locator('[data-arrangement="tile"]')).toHaveCount(0);

  const columns = await page
    .locator('main ul')
    .evaluate(
      grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length
    );

  expect(columns).toBeGreaterThan(1);

  /* The band's play is the item's own control: it starts the playlist and reports
   * the queue's state, and no step appears beside it. */
  await card.getByRole('button', { name: 'Play this playlist' }).click();
  await expect(
    card.getByRole('button', { name: 'Pause this playlist' })
  ).toBeVisible();
  await expect(card.getByRole('button', { name: 'Track next' })).toHaveCount(0);

  /* The picture opens the playlist, which is the door the band's dead area falls
   * through to. */
  await card.locator('a[aria-hidden="true"]').click();
  await expect(
    page.getByRole('heading', { name: 'Evening Jazz' })
  ).toBeVisible();
});

/*
 * Journey 4: a menu over the docked bar. The bar is chrome the app keeps on screen
 * and a menu is what the reader has just opened, so the menu is the tier above it.
 * The card's overflow is the case it can still happen in: its panel opens downward
 * from the cover's top, so a card partway down the screen puts the panel's own foot
 * in the bar's band. The press is the assertion, because a menu behind the bar is a
 * menu whose items the bar intercepts.
 */
test('a playlist’s action menu covers the docked bar', async ({ page }) => {
  /* Short enough that the first card's panel reaches the bar's band: the card's top
   * and the panel's 48 + 170 are more than a 360px viewport leaves above a 98px bar. */
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
  await page.reload();

  /* The bar docks when a playlist plays, which is what puts it under the menu. */
  await page
    .getByRole('button', { name: 'Play this playlist' })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause this playlist' }).first()
  ).toBeVisible();

  await page
    .getByRole('button', { name: /More actions/ })
    .first()
    .click();

  const item = await page
    .getByRole('menuitem', { name: 'Delete playlist' })
    .boundingBox();
  const dock = await page.locator('footer').boundingBox();

  expect(item).not.toBeNull();
  expect(dock).not.toBeNull();
  /* Asserted rather than assumed: a layout that moved the panel clear of the bar
   * would leave this journey passing without testing anything. */
  expect(item!.y + item!.height).toBeGreaterThan(dock!.y);

  await page.getByRole('menuitem', { name: 'Delete playlist' }).click();

  /* The deferred delete the press starts is the proof that the press was the
   * menu's: if the bar took it, the undo window would never open. */
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

/*
 * Journey 5: the pinned gallery. Three facts are true only once the product is
 * assembled, so this is the one place they are asserted together: the pin is
 * written by the server and read again after a reload, a pinned playlist leaves
 * the list below rather than being drawn in both, and an account that can only
 * read a playlist still pins it.
 *
 * The dev proxy fixes one browser identity, so the browser is the reader of the
 * second playlist and the other account is arranged over the API, exactly as the
 * share journey arranges it. Two accounts, one browser.
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

/*
 * The pin's write landing and the drawn move are two things, and the reload that
 * follows the press reads the server. So the press is paired with the response it
 * starts rather than with the optimistic move, or the reload could outrun the
 * write and read a gallery the server has not changed yet.
 */
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

  /*
   * A second playlist owned by another account and shared with the browser's at
   * the read level. The partner is created by reading their own account with the
   * edge headers, then pastes the link over the API; the fake answers the source
   * the scenario names now that the owned playlist is already synced.
   */
  const partner = {
    'Remote-User': PIN_PARTNER.id,
    'Remote-Name': PIN_PARTNER.name,
    'Remote-Email': PIN_PARTNER.email,
    'X-PlayLiberty-Client': 'web'
  };

  const seen = await request.get(`${PIN_API}/me`, { headers: partner });
  expect(seen.ok()).toBe(true);

  /*
   * The share names an account by its id, and the browser's is not the edge's
   * `dev-user` but the row the identity hook created for it, so it is read back
   * through the same headers the proxy injects.
   */
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

  await page.reload();
  await expect(page.getByRole('link', { name: PIN_OWN_TITLE })).toBeVisible();
  await expect(
    page.getByRole('link', { name: PIN_SHARED_TITLE })
  ).toBeVisible();

  /* Nothing is pinned, so the gallery is the one list it has always been. */
  await expect(page.getByRole('heading', { name: 'Pinned' })).toHaveCount(0);

  /* Pin the account's own playlist from its menu. */
  await pinPlaylist(page, PIN_OWN_TITLE, 'Pin');

  const pinned = page.getByRole('region', { name: 'Pinned' });
  await expect(pinned.getByRole('link', { name: PIN_OWN_TITLE })).toBeVisible();
  /* Drawn once: in the section, and nowhere in the list below. */
  await expect(page.getByRole('link', { name: PIN_OWN_TITLE })).toHaveCount(1);
  await expect(
    pinned.getByRole('link', { name: PIN_SHARED_TITLE })
  ).toHaveCount(0);

  /* The pin is the server's fact and not the tab's. */
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'Pinned' })
      .getByRole('link', { name: PIN_OWN_TITLE })
  ).toBeVisible();

  /* A reader's menu holds the pin alone, which is the action visibility allows. */
  await page
    .getByRole('button', { name: `More actions for ${PIN_SHARED_TITLE}` })
    .click();
  await expect(page.getByRole('menuitem')).toHaveCount(1);
  await expect(page.getByRole('menuitem')).toHaveAccessibleName('Pin');
  await page.getByRole('menuitem', { name: 'Pin', exact: true }).click();

  /* Each group in name order. The pinned one was pinned first and this one most
   * recently, so the section's order is the name and no longer the pin instant. */
  const section = page.getByRole('region', { name: 'Pinned' });
  const sectionItems = section.getByRole('link');
  await expect(sectionItems).toHaveCount(2);
  await expect(sectionItems.nth(0)).toHaveAccessibleName(PIN_OWN_TITLE);
  await expect(sectionItems.nth(1)).toHaveAccessibleName(PIN_SHARED_TITLE);

  /* Unpin both: the section withdraws and the list holds both in name order. */
  await pinPlaylist(page, PIN_SHARED_TITLE, 'Unpin');
  await pinPlaylist(page, PIN_OWN_TITLE, 'Unpin');

  await expect(page.getByRole('heading', { name: 'Pinned' })).toHaveCount(0);
  const list = page.locator('main ul');
  await expect(list).toHaveCount(1);
  const listItems = list.getByRole('link');
  await expect(listItems).toHaveCount(2);
  await expect(listItems.nth(0)).toHaveAccessibleName(PIN_OWN_TITLE);
  await expect(listItems.nth(1)).toHaveAccessibleName(PIN_SHARED_TITLE);
});
