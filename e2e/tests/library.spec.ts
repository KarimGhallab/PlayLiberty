import {
  drainDownloads,
  playlistUrl,
  writeScenario
} from '../support/instance';
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
