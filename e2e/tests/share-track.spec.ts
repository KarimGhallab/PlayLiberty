import type { APIRequestContext, Browser, Page } from '@playwright/test';

import { mutePlayback } from '../support/audio';
import { drainDownloads } from '../support/instance';
import { addPlaylist, openPlaylist } from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey: a track link, one account to another. The dev proxy fixes the
 * browser's identity, so the recipient is a second context whose requests carry
 * the partner's edge headers, exactly as a first request would create them.
 */

const SOURCE = 'E2EshareTrack01';
const TITLE = 'Evening Jazz';
const FIRST = { videoId: 'e2eshares01', title: 'Blue In Green' };
const SHARED = { videoId: 'e2eshares02', title: 'Naima' };
const LAST = { videoId: 'e2eshares03', title: 'Flamenco Sketches' };

const PARTNER = {
  id: 'e2e-share-track-partner',
  name: 'Priya Partner',
  email: 'priya.track@example.test'
};
const PARTNER_HEADERS = {
  'Remote-User': PARTNER.id,
  'Remote-Name': PARTNER.name,
  'Remote-Email': PARTNER.email
};

async function partnerAccount(request: APIRequestContext): Promise<string> {
  const partner = await request.get('/api/v1/me', {
    headers: PARTNER_HEADERS
  });
  expect(partner.ok()).toBe(true);

  return (await partner.json()).id;
}

async function shareRead(
  request: APIRequestContext,
  playlistId: string,
  partnerId: string
): Promise<void> {
  const granted = await request.post(`/api/v1/playlists/${playlistId}/shares`, {
    headers: { 'X-PlayLiberty-Client': 'web' },
    data: { accountId: partnerId, level: 'read' }
  });
  expect(granted.ok()).toBe(true);
}

async function openAsPartner(
  browser: Browser,
  baseURL: string | undefined
): Promise<{
  context: Awaited<ReturnType<Browser['newContext']>>;
  page: Page;
}> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: PARTNER_HEADERS
  });
  const page = await context.newPage();
  await mutePlayback(page);

  return { context, page };
}

function playlistIdOf(page: Page): string {
  const playlistId = new URL(page.url()).pathname.split('/').at(-1);

  if (playlistId === undefined) {
    throw new Error('The playlist page has no id in its address.');
  }

  return playlistId;
}

async function playAndPause(page: Page, title: string): Promise<string> {
  await page.getByRole('button', { name: `Play ${title}` }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('track'))
    .toBeTruthy();

  const trackId = new URL(page.url()).searchParams.get('track');

  if (trackId === null) {
    throw new Error('The playlist link names no track.');
  }

  return trackId;
}

async function trackIdOf(
  request: APIRequestContext,
  playlistId: string,
  videoId: string
): Promise<string> {
  const response = await request.get(`/api/v1/playlists/${playlistId}/tracks`, {
    headers: { 'Remote-User': 'dev-user' }
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    items: { track: { id: string; videoId: string } }[];
  };
  const item = body.items.find(entry => entry.track.videoId === videoId);

  if (item === undefined) {
    throw new Error(`The playlist read answered no track for ${videoId}.`);
  }

  return item.track.id;
}

test('a read share opens the playlist at the shared track', async ({
  page,
  request,
  browser,
  baseURL
}) => {
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [FIRST, SHARED, LAST]
  });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPlaylist(page, TITLE);

  const playlistId = new URL(page.url()).pathname.split('/').at(-1);

  if (playlistId === undefined) {
    throw new Error('The playlist page has no id in its address.');
  }

  /* The partner exists by reading their own account with the edge headers. */
  const partner = await request.get('/api/v1/me', {
    headers: PARTNER_HEADERS
  });
  expect(partner.ok()).toBe(true);
  const partnerId: string = (await partner.json()).id;

  /* The grant is the owner's, set up through the route the dialog uses. */
  const granted = await request.post(`/api/v1/playlists/${playlistId}/shares`, {
    headers: { 'X-PlayLiberty-Client': 'web' },
    data: { accountId: partnerId, level: 'read' }
  });
  expect(granted.ok()).toBe(true);

  /* The address bar names the track, which is the link the owner copies. */
  await page.getByRole('button', { name: `Play ${SHARED.title}` }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();

  await expect
    .poll(() => new URL(page.url()).searchParams.get('track'))
    .toBeTruthy();

  const link = page.url();
  const sharedTrackId = new URL(link).searchParams.get('track');

  if (sharedTrackId === null) {
    throw new Error('The shared link names no track.');
  }

  const partnerContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders: PARTNER_HEADERS
  });
  const partnerPage = await partnerContext.newPage();
  await mutePlayback(partnerPage);

  try {
    await partnerPage.goto(link);

    const bar = partnerPage.getByLabel('Player');
    await expect(bar).toBeVisible();

    /* The fake is two seconds; hold the shared track before the queue moves. */
    const pause = partnerPage.getByRole('button', {
      name: 'Pause',
      exact: true
    });

    if (await pause.isVisible()) {
      await pause.click();
    }

    await expect
      .poll(() => new URL(partnerPage.url()).searchParams.get('track'))
      .toBe(sharedTrackId);
    await expect(bar.getByText(SHARED.title)).toBeVisible();
    await expect(
      partnerPage.getByRole('button', { name: `Shuffle ${TITLE}` })
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(
      partnerPage.getByRole('button', { name: 'Previous track' })
    ).toBeEnabled();
    await expect(
      partnerPage.getByRole('button', { name: 'Next track' })
    ).toBeEnabled();
    await expect(
      partnerPage.getByRole('button', {
        name: new RegExp(`^(Play|Pause) ${SHARED.title}$`)
      })
    ).toBeVisible();
  } finally {
    await partnerContext.close();
  }
});

test('a track URL plays it alone and yields to the gallery', async ({
  page
}) => {
  const source = 'E2EshareTrack02';
  const title = 'Late Night';
  const track = { videoId: 'e2eshares11', title: 'Naima' };

  await addPlaylist(page, { sourceId: source, title, entries: [track] });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPlaylist(page, title);

  /* The playlist's mirror gives the track id the bare route resolves. */
  await page.getByRole('button', { name: `Play ${track.title}` }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('track'))
    .toBeTruthy();

  const trackId = new URL(page.url()).searchParams.get('track');

  if (trackId === null) {
    throw new Error('The playlist link names no track.');
  }

  await page.goto(`/tracks/${trackId}`);

  const bar = page.getByLabel('Player');
  await expect(bar).toBeVisible();

  /* The fake is two seconds; hold the track before the queue moves. */
  const pause = page.getByRole('button', { name: 'Pause', exact: true });

  if (await pause.isVisible()) {
    await pause.click();
  }

  await expect(bar.getByText(track.title)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/tracks/${trackId}`);
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  /* A reload keeps the bare queue paused and the address on the track. */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Player').getByText(track.title)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/tracks/${trackId}`);

  /* Starting the gallery's playlist makes the address the gallery's. */
  await page.getByRole('button', { name: `Play ${title}` }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.getByLabel('Player').getByText(title)).toBeVisible();
});

test('a track link without the playlist plays the track alone', async ({
  page,
  request,
  browser,
  baseURL
}) => {
  const source = 'E2EshareTrack03';
  const title = 'Hidden Set';
  const track = { videoId: 'e2eshares21', title: 'Naima' };

  await addPlaylist(page, { sourceId: source, title, entries: [track] });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPlaylist(page, title);

  const playlistId = playlistIdOf(page);
  const trackId = await playAndPause(page, track.title);
  await partnerAccount(request);

  const { context, page: partnerPage } = await openAsPartner(browser, baseURL);

  try {
    await partnerPage.goto(`/playlists/${playlistId}?track=${trackId}`);

    const bar = partnerPage.getByLabel('Player');
    await expect(bar).toBeVisible();

    const pause = partnerPage.getByRole('button', {
      name: 'Pause',
      exact: true
    });

    if (await pause.isVisible()) {
      await pause.click();
    }

    expect(new URL(partnerPage.url()).pathname).toBe(`/tracks/${trackId}`);
    await expect(bar.getByText(track.title)).toBeVisible();
    await expect(partnerPage.getByText(title)).toHaveCount(0);
    await expect(
      partnerPage.getByRole('button', { name: 'Add a playlist', exact: true })
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test('a track link whose track left the playlist says so', async ({
  page,
  request,
  browser,
  baseURL
}) => {
  const keptSource = 'E2EshareTrack04';
  const keptTitle = 'Evening Set';
  const kept = { videoId: 'e2eshares31', title: 'Blue In Green' };
  const otherSource = 'E2EshareTrack05';
  const otherTitle = 'Late Set';
  const other = { videoId: 'e2eshares32', title: 'Naima' };

  await addPlaylist(page, {
    sourceId: keptSource,
    title: keptTitle,
    entries: [kept]
  });
  await addPlaylist(page, {
    sourceId: otherSource,
    title: otherTitle,
    entries: [other]
  });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPlaylist(page, otherTitle);
  const absentTrackId = await playAndPause(page, other.title);
  await page.goto('/');
  await openPlaylist(page, keptTitle);
  const playlistId = playlistIdOf(page);
  const partnerId = await partnerAccount(request);
  await shareRead(request, playlistId, partnerId);

  const { context, page: partnerPage } = await openAsPartner(browser, baseURL);

  try {
    await partnerPage.goto(`/playlists/${playlistId}?track=${absentTrackId}`);

    const bar = partnerPage.getByLabel('Player');
    await expect(bar).toBeVisible();

    const pause = partnerPage.getByRole('button', {
      name: 'Pause',
      exact: true
    });

    if (await pause.isVisible()) {
      await pause.click();
    }

    expect(new URL(partnerPage.url()).pathname).toBe(
      `/tracks/${absentTrackId}`
    );
    await expect(bar.getByText(other.title)).toBeVisible();
    await expect(
      partnerPage.getByText(`${other.title} is no longer in that playlist.`)
    ).toBeVisible();
    await expect(
      partnerPage.getByText('It is playing on its own.')
    ).toBeVisible();
    await expect(
      partnerPage.getByRole('link', { name: keptTitle })
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test('a track link whose track cannot play explains it on the playlist', async ({
  page,
  request,
  browser,
  baseURL
}) => {
  const source = 'E2EshareTrack06';
  const title = 'Broken Set';
  const track = { videoId: 'e2eshares41', title: 'Naima' };

  await addPlaylist(page, {
    sourceId: source,
    title,
    entries: [track],
    downloads: { [track.videoId]: 'fail' as const }
  });
  await drainDownloads(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPlaylist(page, title);
  const playlistId = playlistIdOf(page);
  const failedTrackId = await trackIdOf(request, playlistId, track.videoId);
  const partnerId = await partnerAccount(request);
  await shareRead(request, playlistId, partnerId);

  const { context, page: partnerPage } = await openAsPartner(browser, baseURL);

  try {
    await partnerPage.goto(`/playlists/${playlistId}?track=${failedTrackId}`);

    await expect(
      partnerPage.getByText(`${track.title} cannot play.`)
    ).toBeVisible();
    await expect(partnerPage.getByText('Its download failed.')).toBeVisible();
    expect(new URL(partnerPage.url()).pathname).toBe(
      `/playlists/${playlistId}`
    );
    await expect(partnerPage.getByLabel('Player')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
