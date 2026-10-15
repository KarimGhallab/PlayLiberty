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
