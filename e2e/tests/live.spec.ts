import { playlistUrl, writeScenario } from '../support/instance';
import { expect, test } from '../support/test';

/*
 * The live stream, proved through the browser.
 *
 * The playlist is created through the API rather than the add dialog, and that is
 * the whole design of the test: a create made by the dialog invalidates the
 * library itself, so the row would appear without the stream and prove nothing. A
 * create made outside the tab is a change the tab never asked about, so the only
 * way the library can gain the item is the event the server pushed.
 *
 * The title is the source's own, which the tab never fetched before the event, so
 * a passing assertion means the refetch happened rather than that a cached row
 * was re-rendered.
 */

const SOURCE = 'E2Elive0001';
const TITLE = 'Live Evening Jazz';

test('a playlist created outside this tab appears in the library without a reload', async ({
  page
}) => {
  writeScenario({
    sources: {
      [SOURCE]: {
        title: TITLE,
        entries: [
          { videoId: 'e2elive001', title: 'Blue In Green' },
          { videoId: 'e2elive002', title: 'Naima' }
        ]
      }
    }
  });

  await page.goto('/');
  await expect(page.getByText('No playlists yet')).toBeVisible();

  await page.evaluate(async url => {
    await fetch('/api/v1/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PlayLiberty-Client': 'web'
      },
      body: JSON.stringify({ url })
    });
  }, playlistUrl(SOURCE));

  // No reload and no navigation: the stream is what makes the tab ask again.
  await expect(page.getByRole('link', { name: TITLE })).toBeVisible();
  await expect(page.getByText('Up to date')).toBeVisible();
});
