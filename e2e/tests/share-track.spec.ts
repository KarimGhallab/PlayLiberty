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

test('a read share opens the playlist at the shared track', async ({
  page,
  request,
  browser,
  baseURL
}) => {
  await mutePlayback(page);
  await addPlaylist(page, {
    sourceId: SOURCE,
    title: TITLE,
    entries: [FIRST, SHARED, LAST]
  });
  await drainDownloads(page);
  await page.reload();
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
