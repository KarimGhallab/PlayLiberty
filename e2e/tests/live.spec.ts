import {
  drainDownloads,
  playlistUrl,
  videoUrl,
  writeScenario
} from '../support/instance';
import {
  addPlaylist,
  openHeaderMenu,
  openPlaylist
} from '../support/playlists';
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

/*
 * The other half of the stream: a track's own state. The video is added through
 * the API rather than the dialog, so the detail never asked about it and only the
 * worker's events can make its row appear and change. The download is slowed, so
 * the downloading state is observable rather than gone before the browser reads
 * it.
 */

const TRACK_SOURCE = 'E2Elive2001';
const TRACK_TITLE = 'Live Evening Jazz';
const STORED = { videoId: 'e2elive20a', title: 'Blue In Green' };
const ADDED = { videoId: 'e2elive20b', title: 'Naima' };

test('an added video moves through the download states to playable without a reload', async ({
  page
}) => {
  await addPlaylist(page, {
    sourceId: TRACK_SOURCE,
    title: TRACK_TITLE,
    entries: [STORED]
  });
  await drainDownloads(page);
  await page.reload();
  await openPlaylist(page, TRACK_TITLE);
  await expect(
    page.getByRole('button', { name: `Play ${STORED.title}` })
  ).toBeVisible();

  writeScenario({
    sources: {
      [TRACK_SOURCE]: { title: TRACK_TITLE, entries: [STORED] },
      [ADDED.videoId]: { title: ADDED.title, entries: [ADDED] }
    },
    downloadDelayMs: 1500
  });

  const playlistId = new URL(page.url()).pathname.split('/').pop() ?? '';

  await page.evaluate(
    async ({ url, id }) => {
      await fetch('/api/v1/tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PlayLiberty-Client': 'web'
        },
        body: JSON.stringify({ url, playlistIds: [id] })
      });
    },
    { url: videoUrl(ADDED.videoId), id: playlistId }
  );

  /*
   * The worker claims the track and answers while the download is still in
   * flight, so the row's downloading state is the stream's to deliver; nothing
   * here reloads the page.
   */
  await drainDownloads(page);

  await expect(page.getByText('Downloading')).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Play ${ADDED.title}` })
  ).toBeVisible();
});

/*
 * A mutation in one tab reaching another. The two tabs are two browser contexts
 * and the same account, because the edge identity is the Vite proxy's, so the
 * event is the only thing that can carry the rename across: the second tab never
 * made a request and never reloads.
 */

const OTHER_SOURCE = 'E2Elive3001';
const OTHER_TITLE = 'Live Sunday Jazz';
const OTHER_TRACK = { videoId: 'e2elive30a', title: 'Flamenco Sketches' };

test('a rename in one tab appears in another without a reload', async ({
  page,
  browser
}) => {
  await addPlaylist(page, {
    sourceId: OTHER_SOURCE,
    title: OTHER_TITLE,
    entries: [OTHER_TRACK]
  });

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();

  try {
    await otherPage.goto('/');
    await expect(
      otherPage.getByRole('link', { name: OTHER_TITLE })
    ).toBeVisible();

    await openHeaderMenu(page);
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Playlist name').fill('Morning Jazz');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    await expect(
      otherPage.getByRole('link', { name: 'Morning Jazz' })
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});
