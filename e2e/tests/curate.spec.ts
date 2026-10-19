import { videoUrl, writeScenario } from '../support/instance';
import {
  addPlaylist,
  createPlaylist,
  openHeaderMenu,
  openPlaylist,
  reloadUntil,
  scriptPlaylist
} from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey 4: curate a playlist, from the detail and from the library item's
 * own overflow. Rename, delete and remove are deferred: a test waits for the
 * undo window, not the press. Retry and sync call at once and are reloaded.
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

  // The library's read is the server's, so it carries the new name.
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

  /* The item is gone, not merely hidden. */
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
  /* Scoped to the row: the summary's "failed" and the "Failed" filter chip are
   * both on the page. */
  const failedState = page
    .getByRole('listitem')
    .getByText('Failed', { exact: true });
  await expect(failedState).toBeVisible();

  // Downloadable now; the retry queues it for the worker.
  scriptPlaylist({ sourceId: SOURCE, title: TITLE, entries: [FIRST] });
  await rowActions.click();
  await page.getByRole('menuitem', { name: 'Retry' }).click();

  await expect(failedState).toBeHidden({
    timeout: 15_000
  });

  await reloadUntil(
    page,
    page.getByRole('button', { name: `Play ${FIRST.title}` })
  );
});

test('a failed track leads with a sentence and reveals the raw diagnostic', async ({
  page
}) => {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [FIRST],
    downloads: { [FIRST.videoId]: 'fail' }
  });
  await openPlaylist(page, TITLE);

  const row = page.getByRole('listitem').filter({ hasText: FIRST.title });
  const details = row.getByRole('button', {
    name: `Show details for ${FIRST.title}`
  });
  await reloadUntil(page, details);

  await expect(row.getByText('The download failed.')).toBeVisible();
  await expect(row.getByText(/E2E fake/)).toHaveCount(0);

  await details.click();

  await expect(row.getByText(/E2E fake/)).toBeVisible();
  await expect(
    row.getByRole('button', { name: `Hide details for ${FIRST.title}` })
  ).toBeVisible();
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

  /* The fake keys a scenario by the id it extracts, and this dialog takes a
   * video, so the entry must exist under the video id too. */
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
  await dialog.getByRole('checkbox', { name: 'Late Night' }).check();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();

  /* One request carried both ids, which is the batch route's shape. */
  await expect(dialog).toBeHidden();

  await expect(page.getByText(FIRST.title)).toBeVisible();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await openPlaylist(page, 'Late Night');
  await expect(page.getByText(FIRST.title)).toBeVisible();
});

/*
 * The picker lists every writable playlist, so its list is the one part of a
 * dialog that grows with the account: a dialog taller than the viewport has to
 * keep its own Add on screen and scroll the list instead.
 */
test('the picker keeps its own actions in view with a long playlist list', async ({
  page,
  request
}) => {
  const COUNT = 20;
  const sources = Array.from(
    { length: COUNT },
    (_, index) => `E2Epicker${String(index).padStart(2, '0')}`
  );
  const titles = Array.from({ length: COUNT }, (_, index) => `Picker ${index}`);

  /* Empty sources: the picker needs the names and nothing else, so no sync has
   * a track to download. */
  writeScenario({
    sources: Object.fromEntries(
      sources.map((source, index) => [
        source,
        { title: titles[index], entries: [] }
      ])
    )
  });

  for (const source of sources) {
    await createPlaylist(request, source);
  }

  await page.goto('/');
  await openPlaylist(page, titles[0]);

  await page.getByRole('button', { name: 'Add a track' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add a track' });
  const add = dialog.getByRole('button', { name: 'Add', exact: true });
  await expect(dialog).toBeVisible();

  /* The title, the field and the Add are inside the viewport while the list
   * above the actions is what carries the overflow. */
  await expect(
    dialog.getByRole('heading', { name: 'Add a track' })
  ).toBeInViewport();
  await expect(dialog.getByLabel('Video link')).toBeInViewport();
  await expect(add).toBeInViewport();

  // The same at the phone height, where the dialog has the least room.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByLabel('Video link')).toBeInViewport();
  await expect(add).toBeInViewport();
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

  /* One file shared by both associations, stored on the server's own schedule,
   * so the row is re-read by reloading. */
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
  /* A create starts its own run and a second is refused while it runs, so the
   * settled state is what says the first run is over. */
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
