import { videoUrl } from '../support/instance';
import {
  addPlaylist,
  openHeaderMenu,
  openPlaylist,
  reloadUntil,
  scriptPlaylist
} from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey 4: curate a playlist. The detail offers every control; the library
 * item offers the same ones through its own overflow, so rename and delete are
 * journeyed from both screens. Rename, delete and remove are owner actions; the
 * retry belongs to any account that can write a playlist holding the failed
 * track.
 *
 * Rename, delete and remove are deferred: the press opens the undo window and the
 * call runs when it closes on its own, so a test that expects the change waits for
 * the window rather than for the press. The retry and the sync call the server at
 * once, and the state they produce is read again by reloading, because nothing
 * polls.
 */

const SOURCE = 'E2Ecurate01';
const TITLE = 'Evening Jazz';
const FIRST = { videoId: 'e2ecurate01', title: 'Blue In Green' };
const SECOND = { videoId: 'e2ecurate02', title: 'Naima' };

test('renaming a playlist updates the detail and the library', async ({
  page
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await openPlaylist(page, TITLE);
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();

  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Rename' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Playlist name').fill('Morning Jazz');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Morning Jazz' })
  ).toBeVisible();

  // The library item carries the new name too, because the read it draws is the
  // server's.
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.getByRole('link', { name: 'Morning Jazz' })).toBeVisible();
});

test('deleting a playlist removes it once the undo window closes', async ({
  page
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await openPlaylist(page, TITLE);

  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Delete playlist' }).click();
  await expect(page.getByText('Deleting playlist')).toBeVisible();

  /*
   * The window closes on its own and the deletion lands, which navigates back to
   * the library. The empty gallery is the deletion's own evidence, and the item
   * is gone rather than merely hidden.
   */
  await expect(page.getByText('No playlists yet')).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByRole('link', { name: TITLE })).toHaveCount(0);
});

test('renaming from the library item updates it in place', async ({ page }) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });

  // The item's own overflow, not the detail's: the library is where we stand.
  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Rename' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Playlist name').fill('Morning Jazz');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('link', { name: 'Morning Jazz' })).toBeVisible();
});

test('deleting from the library item removes it once the undo window closes', async ({
  page
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });

  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Delete playlist' }).click();
  await expect(page.getByText('Deleting playlist')).toBeVisible();

  // The window closes on its own and the empty gallery is the deletion's proof.
  await expect(page.getByText('No playlists yet')).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByRole('link', { name: TITLE })).toHaveCount(0);
});

test('removing a track takes it out of the playlist once the undo window closes', async ({
  page
}) => {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [FIRST, SECOND]
  });
  await openPlaylist(page, TITLE);
  await expect(page.getByText(FIRST.title)).toBeVisible();
  await expect(page.getByText(SECOND.title)).toBeVisible();

  await page
    .getByRole('button', { name: `Actions for ${FIRST.title}` })
    .click();
  await page.getByRole('menuitem', { name: 'Remove from playlist' }).click();
  await expect(page.getByText('Removing track')).toBeVisible();

  await expect(page.getByText(FIRST.title)).toHaveCount(0, {
    timeout: 15_000
  });
  await expect(page.getByText(SECOND.title)).toBeVisible();
});

test('retrying a failed track re-queues it and it recovers', async ({
  page
}) => {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [FIRST],
    downloads: { [FIRST.videoId]: 'fail' }
  });
  await openPlaylist(page, TITLE);

  const rowActions = page.getByRole('button', {
    name: `Actions for ${FIRST.title}`
  });
  await reloadUntil(page, rowActions);
  /*
   * Scoped to the row: the summary's lower-case "failed" and the control row's
   * "Failed" filter chip are both on the page, so an unscoped match is
   * ambiguous.
   */
  const failedState = page
    .getByRole('listitem')
    .getByText('Failed', { exact: true });
  await expect(failedState).toBeVisible();

  // The video is downloadable now, and the retry queues it for the worker. The
  // retry lives in the row's actions menu, so the press is two: open, then pick.
  scriptPlaylist({ sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await rowActions.click();
  await page.getByRole('menuitem', { name: 'Retry' }).click();

  // The row leaves the failed state, which is the retry's own, immediate effect.
  await expect(failedState).toBeHidden({
    timeout: 15_000
  });

  // The worker stores it on its next pass, and the row offers its play control.
  await reloadUntil(
    page,
    page.getByRole('button', { name: `Play ${FIRST.title}` })
  );
});

test('adding one video to two playlists puts the same track in both', async ({
  page
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await addPlaylist(page, {
    sourceId: 'E2Ecurate02',
    title: 'Late Night',
    entries: [SECOND]
  });

  /*
   * The video URL names the video by its own id, and the fake adapter keys the
   * scenario by the id it extracts, so the entry has to exist under the video id
   * as well as inside the playlist above. Adding a track takes a video and not a
   * playlist, so this URL is the video's own.
   */
  scriptPlaylist({
    sourceId: FIRST.videoId,
    title: FIRST.title,
    entries: [FIRST]
  });

  await openPlaylist(page, TITLE);
  await page.getByRole('button', { name: 'Add a track' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add a track' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Video link').fill(videoUrl(FIRST.videoId));

  // The second playlist is chosen by its name.
  await dialog.getByRole('checkbox', { name: 'Late Night' }).check();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();

  /*
   * Every chosen playlist took it, so the dialog closes and there is no refusal
   * to read. One request carried both ids, which is the batch route's whole
   * shape.
   */
  await expect(dialog).toBeHidden();

  // Both playlists carry the track, and it is the same one.
  await expect(page.getByText(FIRST.title)).toBeVisible();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await openPlaylist(page, 'Late Night');
  await expect(page.getByText(FIRST.title)).toBeVisible();
});

test('an added video is fetched once and becomes playable', async ({
  page
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await addPlaylist(page, {
    sourceId: 'E2Ecurate02',
    title: 'Late Night',
    entries: [SECOND]
  });

  scriptPlaylist({
    sourceId: FIRST.videoId,
    title: FIRST.title,
    entries: [FIRST]
  });

  await openPlaylist(page, TITLE);
  await page.getByRole('button', { name: 'Add a track' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add a track' });
  await dialog.getByLabel('Video link').fill(videoUrl(FIRST.videoId));
  await dialog.getByRole('checkbox', { name: 'Late Night' }).check();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toBeHidden();

  /*
   * The worker stores the one file both associations share, so both playlists
   * offer the play control. The row is read again by reloading, because nothing
   * polls and the download finishes on the server's own schedule.
   */
  await reloadUntil(
    page,
    page.getByRole('button', { name: `Play ${FIRST.title}` })
  );
  await expect(
    page.getByRole('button', { name: `Play ${FIRST.title}` })
  ).toBeVisible();

  await page.getByRole('link', { name: 'Back to home' }).click();
  await openPlaylist(page, 'Late Night');
  await reloadUntil(
    page,
    page.getByRole('button', { name: `Play ${FIRST.title}` })
  );
  await expect(
    page.getByRole('button', { name: `Play ${FIRST.title}` })
  ).toBeVisible();
});

test('syncing a playlist picks up new source tracks and a second sync changes nothing', async ({
  page
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await openPlaylist(page, TITLE);
  /*
   * The create starts a run of its own, and a second one is refused while it
   * runs. The track can be visible before the run is marked complete, so the
   * settled state is what says the first run is over.
   */
  await reloadUntil(page, page.getByText('Up to date'));
  await expect(page.getByText(FIRST.title)).toBeVisible();

  // The source gains a track; the sync brings it in behind the 202.
  scriptPlaylist({ sourceId: SOURCE, title: TITLE, entries: [FIRST, SECOND] });
  await openHeaderMenu(page);
  const firstSync = page.waitForResponse(
    response =>
      response.url().endsWith('/sync') && response.request().method() === 'POST'
  );
  await page.getByRole('menuitem', { name: 'Sync now' }).click();
  await firstSync;
  await reloadUntil(page, page.getByText(SECOND.title));
  await expect(page.getByText(SECOND.title)).toBeVisible();

  // A second sync of the same source changes nothing: two tracks, no duplicates.
  await openHeaderMenu(page);
  const secondSync = page.waitForResponse(
    response =>
      response.url().endsWith('/sync') && response.request().method() === 'POST'
  );
  await page.getByRole('menuitem', { name: 'Sync now' }).click();
  await secondSync;
  await reloadUntil(page, page.getByText('Up to date'));
  await expect(page.getByText(FIRST.title)).toHaveCount(1);
  await expect(page.getByText(SECOND.title)).toHaveCount(1);
});
