import { playlistUrl, writeScenario } from '../support/instance';
import { expect, test } from '../support/test';

/*
 * Journey 1: open the library and add a playlist, the one path where content
 * enters the instance. The list the browser draws is the server's, so the item
 * that appears carries the source's own title and count, which the client never
 * knew before the request.
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
