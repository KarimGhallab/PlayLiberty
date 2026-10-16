import type { APIRequestContext, Page } from '@playwright/test';

import { videoUrl, writeScenario } from '../support/instance';
import { SERVER_PORT } from '../support/paths';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey: the skip-non-music setting. The switch round-trips and survives a
 * reload, and a track keeps the value it was born with when its playlist
 * changes, because the write is not retroactive.
 */

const OWNER = 'dev-user';
const SOURCE_A = 'E2EskipA001';
const SOURCE_B = 'E2EskipB001';
const TITLE_A = 'Morning Run';
const TITLE_B = 'Evening Wind';
const FIRST = { videoId: 'e2eskipa01', title: 'Blue In Green' };
const SECOND = { videoId: 'e2eskipb01', title: 'Naima' };
/* In no playlist's source, so its track is born when it is added by hand. */
const THIRD = { videoId: 'e2eskipc01', title: 'Flamenco Sketches' };

function playlistIdFromUrl(page: Page): string {
  const match = /\/playlists\/([^/?#]+)/.exec(page.url());

  if (match?.[1] === undefined) {
    throw new Error('The detail URL carries no playlist id.');
  }

  return match[1];
}

async function addTrack(
  page: Page,
  video: { videoId: string; title: string }
): Promise<void> {
  await page.getByRole('button', { name: 'Add a track' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add a track' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Video link').fill(videoUrl(video.videoId));
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function readTrack(
  request: APIRequestContext,
  playlistId: string,
  videoId: string
): Promise<{ id: string; skipNonMusic: boolean }> {
  const response = await request.get(
    `http://127.0.0.1:${SERVER_PORT}/api/v1/playlists/${playlistId}/tracks`,
    { headers: { 'Remote-User': OWNER } }
  );

  expect(response.ok()).toBe(true);

  const body = (await response.json()) as {
    items: {
      track: { id: string; videoId: string; skipNonMusic: boolean };
    }[];
  };
  const item = body.items.find(entry => entry.track.videoId === videoId);

  if (item === undefined) {
    throw new Error(`The playlist read answered no track for ${videoId}.`);
  }

  return item.track;
}

test('the skip switch flips both ways on the detail and survives a reload', async ({
  page
}) => {
  await addPlaylist(page, {
    sourceId: SOURCE_A,
    title: TITLE_A,
    entries: [FIRST]
  });
  await openPlaylist(page, TITLE_A);

  const control = page.getByRole('switch', { name: 'Skip non-music parts' });
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  await expect(control).toHaveAttribute('aria-checked', 'true');

  // Optimistic: the thumb moves on the press, before the server has answered.
  await control.click();
  await expect(control).toHaveAttribute('aria-checked', 'false');

  // The value survives a reload, so it is the server's fact and not local state.
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Skip non-music parts' })
  ).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('switch', { name: 'Skip non-music parts' }).click();
  await expect(
    page.getByRole('switch', { name: 'Skip non-music parts' })
  ).toHaveAttribute('aria-checked', 'true');

  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Skip non-music parts' })
  ).toHaveAttribute('aria-checked', 'true');
});

test('a track already created keeps its setting when a playlist changes', async ({
  page,
  request
}) => {
  await addPlaylist(page, {
    sourceId: SOURCE_A,
    title: TITLE_A,
    entries: [FIRST]
  });
  await addPlaylist(page, {
    sourceId: SOURCE_B,
    title: TITLE_B,
    entries: [SECOND]
  });

  /* The dialog takes a video and the fake keys by video id, so these are
   * scripted under their own ids now that the playlists are synced. */
  writeScenario({
    sources: {
      [FIRST.videoId]: { title: FIRST.title, entries: [FIRST] },
      [THIRD.videoId]: { title: THIRD.title, entries: [THIRD] }
    }
  });

  // The video joins the first playlist; its track was born with A's default on.
  await openPlaylist(page, TITLE_A);
  await addTrack(page, FIRST);
  const firstPlaylist = playlistIdFromUrl(page);
  const born = await readTrack(request, firstPlaylist, FIRST.videoId);
  expect(born.skipNonMusic).toBe(true);

  // The same video joins the second playlist, which reuses the one track.
  await page.getByRole('link', { name: 'Back to home' }).click();
  await openPlaylist(page, TITLE_B);
  await addTrack(page, FIRST);
  const secondPlaylist = playlistIdFromUrl(page);
  expect((await readTrack(request, secondPlaylist, FIRST.videoId)).id).toBe(
    born.id
  );

  const control = page.getByRole('switch', { name: 'Skip non-music parts' });
  await control.click();
  await expect(control).toHaveAttribute('aria-checked', 'false');
  await expect(control).toBeEnabled();

  const persisted = await request.get(
    `http://127.0.0.1:${SERVER_PORT}/api/v1/playlists/${secondPlaylist}`,
    { headers: { 'Remote-User': OWNER } }
  );
  expect((await persisted.json()).skipNonMusic).toBe(false);

  // The shared track does not move: the write is not retroactive.
  expect(
    (await readTrack(request, firstPlaylist, FIRST.videoId)).skipNonMusic
  ).toBe(true);

  await addTrack(page, THIRD);
  expect(
    (await readTrack(request, secondPlaylist, THIRD.videoId)).skipNonMusic
  ).toBe(false);
});
