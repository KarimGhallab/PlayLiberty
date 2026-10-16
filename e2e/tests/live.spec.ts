import {
  drainDownloads,
  playlistUrl,
  videoUrl,
  writeScenario
} from '../support/instance';
import { SERVER_PORT } from '../support/paths';
import {
  addPlaylist,
  openHeaderMenu,
  openPlaylist
} from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * The tab never asked for this create, so the only way the library gains the
 * item is the pushed event. The title is the source's own, never fetched by the
 * tab, so a pass means the refetch happened rather than a re-render.
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
});

/* The detail never asked for this add, so only the worker's events make the row
 * appear; the download is slowed so `Downloading` is observable. */

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

  /* The worker answers while the download is in flight, so the state is the
   * stream's to deliver; nothing here reloads. */
  await drainDownloads(page);

  /* Scoped to the track list: the "Downloading" filter chip carries the same
   * word. */
  await expect(
    page.getByRole('list').getByText('Downloading', { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Play ${ADDED.title}` })
  ).toBeVisible();
});

/* Two contexts, one account, so the event is the only thing that can carry the
 * rename: the second tab never requests and never reloads. */

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

/* The partner is a second context supplying its own `Remote-*` headers, so the
 * grant and the revoke are what move the item, never a reload. */

const SHARE_SOURCE = 'E2Elive4001';
const SHARE_TITLE = 'Live Shared Jazz';
const SHARE_TRACK = { videoId: 'e2elive40a', title: 'Blue In Green' };
const PARTNER = {
  id: 'e2e-live-partner',
  name: 'Priya Partner',
  email: 'priya@example.test'
};

test('a granted share appears in the other account and a revoke takes it away, without a reload', async ({
  page,
  browser,
  request
}) => {
  await addPlaylist(page, {
    sourceId: SHARE_SOURCE,
    title: SHARE_TITLE,
    entries: [SHARE_TRACK]
  });
  await openPlaylist(page, SHARE_TITLE);
  const playlistId = new URL(page.url()).pathname.split('/').pop() ?? '';

  const partnerIdentity = {
    'Remote-User': PARTNER.id,
    'Remote-Name': PARTNER.name,
    'Remote-Email': PARTNER.email
  };

  // The partner account is created by its own first read, as any account is.
  const created = await request.get(
    `http://127.0.0.1:${SERVER_PORT}/api/v1/me`,
    { headers: partnerIdentity }
  );
  expect(created.ok()).toBe(true);
  const partnerBody: unknown = await created.json();
  const partnerAccountId =
    typeof partnerBody === 'object' &&
    partnerBody !== null &&
    'id' in partnerBody &&
    typeof partnerBody.id === 'string'
      ? partnerBody.id
      : '';

  if (partnerAccountId === '') {
    throw new Error('The partner account read answered without an id.');
  }

  const partnerContext = await browser.newContext({
    extraHTTPHeaders: partnerIdentity
  });
  const partnerPage = await partnerContext.newPage();

  try {
    await partnerPage.goto('/');
    await expect(partnerPage.getByText('No playlists yet')).toBeVisible();

    const ownerHeaders = {
      'Remote-User': 'dev-user',
      'X-PlayLiberty-Client': 'web'
    };

    // Granted over the API, so the owner's tab does not invalidate locally and
    // the stream carries the share.
    const granted = await request.post(
      `http://127.0.0.1:${SERVER_PORT}/api/v1/playlists/${playlistId}/shares`,
      {
        headers: ownerHeaders,
        data: { accountId: partnerAccountId, level: 'read' }
      }
    );
    expect(granted.ok()).toBe(true);

    await expect(
      partnerPage.getByRole('link', { name: SHARE_TITLE })
    ).toBeVisible();

    // Open the detail, so the revoke has a screen that must read as gone.
    await partnerPage.getByRole('link', { name: SHARE_TITLE }).click();
    await expect(
      partnerPage.getByRole('heading', { name: SHARE_TITLE })
    ).toBeVisible();

    const revoked = await request.delete(
      `http://127.0.0.1:${SERVER_PORT}/api/v1/playlists/${playlistId}/shares/${partnerAccountId}`,
      { headers: ownerHeaders }
    );
    expect(revoked.ok()).toBe(true);

    await expect(
      partnerPage.getByRole('heading', { name: 'This playlist is not here' })
    ).toBeVisible();
  } finally {
    await partnerContext.close();
  }
});
