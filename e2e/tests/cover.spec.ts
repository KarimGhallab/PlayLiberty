import type { APIRequestContext, Locator, Page } from '@playwright/test';

import {
  drainDownloads,
  playlistUrl,
  writeScenario
} from '../support/instance';
import { SERVER_PORT } from '../support/paths';
import {
  openHeaderMenu,
  openPlaylist,
  reloadUntil
} from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey: a playlist cover. The browser is the dev account; a partner owns the
 * shared playlists and sets their first cover through the API, so the share and
 * the access level are the server's facts. The upload itself always goes
 * through the dialog and the real file input.
 */

const API = `http://127.0.0.1:${SERVER_PORT}/api/v1`;

const OWN_SOURCE = 'E2Ecoverown1';
const OWN_TITLE = 'Cover Journey';
const OWN_TRACK = { videoId: 'e2ecoverown1', title: 'Blue In Green' };

const EMPTY_SOURCE = 'E2Ecoverempty1';
const EMPTY_TITLE = 'Empty Cover';

const READ_SOURCE = 'E2Ecoverread1';
const READ_TITLE = 'Shared Read Cover';
const READ_TRACK = { videoId: 'e2ecoverread', title: 'Naima' };

const WRITE_SOURCE = 'E2Ecoverwrite1';
const WRITE_TITLE = 'Shared Write Cover';
const WRITE_TRACK = { videoId: 'e2ecoverwrit', title: 'Maiden Voyage' };

const PHONE_SOURCE = 'E2Ecoverphone1';
const PHONE_TITLE = 'Phone Cover';
const PHONE_TRACK = { videoId: 'e2ecoverphon', title: 'Blue In Green' };

const CROP_SOURCE = 'E2Ecovercrop1';
const CROP_TITLE = 'Crop Journey';
const CROP_TRACK = { videoId: 'e2ecovercrop', title: 'Blue In Green' };

/* 64 and 48px solid PNGs, the formats the dialog accepts. */
const COVER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGUExURS+efv///7b1ZuAAAAABYktHRAH/Ai3eAAAAB3RJTUUH6goUDQ4L70kteAAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0xMC0yMFQxMzoxNDoxMSswMDowME1LbtsAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMTAtMjBUMTM6MTQ6MTErMDA6MDA8FtZnAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTEwLTIwVDEzOjE0OjExKzAwOjAwawP3uAAAAA9JREFUKM9jYBgFo4B8AAACQAABjMWrdwAAAABJRU5ErkJggg==',
  'base64'
);
const COVER_PNG_2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGUExURUyskP///9XUxvkAAAABYktHRAH/Ai3eAAAAB3RJTUUH6goUDQ4L70kteAAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0xMC0yMFQxMzoxNDoxMSswMDowME1LbtsAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMTAtMjBUMTM6MTQ6MTErMDA6MDA8FtZnAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTEwLTIwVDEzOjE0OjExKzAwOjAwawP3uAAAAA1JREFUGNNjYBgF1AQAAVAAAafi2hYAAAAASUVORK5CYII=',
  'base64'
);

/* 1000x800, red on the left and green on the right: a short edge over 640px so
 * the stage can zoom, and bands deep enough that a pan is visible in a trace. */
const WIDE_COVER_PNG = Buffer.from(
  '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',
  'base64'
);

interface Person {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

const READER: Person = {
  id: 'e2e-cover-reader',
  name: 'Rita Reader',
  email: 'rita@example.test'
};
const WRITER: Person = {
  id: 'e2e-cover-writer',
  name: 'Walt Writer',
  email: 'walt@example.test'
};

function personHeaders(person: Person): Record<string, string> {
  return {
    'Remote-User': person.id,
    'Remote-Name': person.name,
    'Remote-Email': person.email,
    'X-PlayLiberty-Client': 'web'
  };
}

/* A playlist owned by a partner account, so the browser reaches it through a
 * share and the access level is real. */
async function createAs(
  request: APIRequestContext,
  person: Person,
  sourceId: string
): Promise<string> {
  const response = await request.post(`${API}/playlists`, {
    headers: personHeaders(person),
    data: { url: playlistUrl(sourceId) }
  });

  expect(response.status()).toBe(202);

  const run = (await response.json()) as { playlistId: string };

  return run.playlistId;
}

/* A playlist the browser account owns, created through the same proxy the app
 * reads, so the identity is the one the page carries. */
async function createForBrowser(
  request: APIRequestContext,
  sourceId: string
): Promise<string> {
  const response = await request.post('/api/v1/playlists', {
    headers: { 'X-PlayLiberty-Client': 'web' },
    data: { url: playlistUrl(sourceId) }
  });

  expect(response.status()).toBe(202);

  const run = (await response.json()) as { playlistId: string };

  return run.playlistId;
}

async function browserAccountId(request: APIRequestContext): Promise<string> {
  const response = await request.get('/api/v1/me');
  expect(response.ok()).toBe(true);

  const me = (await response.json()) as { id: string };

  return me.id;
}

async function shareWithBrowser(
  request: APIRequestContext,
  owner: Person,
  playlistId: string,
  accountId: string,
  level: 'read' | 'write'
): Promise<void> {
  const response = await request.post(`${API}/playlists/${playlistId}/shares`, {
    headers: personHeaders(owner),
    data: { accountId, level }
  });

  expect(response.ok()).toBe(true);
}

async function uploadAs(
  request: APIRequestContext,
  person: Person,
  playlistId: string,
  image: Buffer = COVER_PNG
): Promise<void> {
  const response = await request.post(`${API}/playlists/${playlistId}/cover`, {
    headers: {
      ...personHeaders(person),
      'content-type': 'image/png'
    },
    data: image
  });

  expect(response.status()).toBe(200);
}

function galleryItem(page: Page, title: string): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: title }) });
}

function coverImage(page: Page, playlistId: string): Locator {
  return page.locator(`img[src*="/playlists/${playlistId}/cover?"]`);
}

function customCoverIn(item: Locator, playlistId: string): Locator {
  return item.locator(`img[src*="/playlists/${playlistId}/cover?"]`);
}

async function chooseImage(
  dialog: Locator,
  name: string,
  image: Buffer
): Promise<void> {
  await dialog.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: image
  });
}

interface CropFields {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/* The four fields the stage sent, or null when the save left the crop alone.
 * The server test owns the region each fraction extracts. */
function cropFields(url: string): CropFields | null {
  const query = new URL(url).searchParams;

  if (!query.has('cropX')) {
    return null;
  }

  return {
    x: Number(query.get('cropX')),
    y: Number(query.get('cropY')),
    width: Number(query.get('cropWidth')),
    height: Number(query.get('cropHeight'))
  };
}

/* The stored square, read off the image the page rendered rather than the
 * bytes, so a cover that failed to decode cannot pass. */
async function expectSquareCover(cover: Locator): Promise<void> {
  await expect
    .poll(() =>
      cover.evaluate(image =>
        'naturalWidth' in image ? Number(image.naturalWidth) : 0
      )
    )
    .toBeGreaterThan(0);

  const size = await cover.evaluate(image => {
    if (!('naturalWidth' in image) || !('naturalHeight' in image)) {
      return { width: 0, height: 0 };
    }

    return {
      width: Number(image.naturalWidth),
      height: Number(image.naturalHeight)
    };
  });

  expect(size.width).toBe(size.height);
}

test('a custom cover reaches the detail and the gallery, survives a reload, and removal returns the first track', async ({
  page,
  request
}) => {
  writeScenario({
    sources: {
      [OWN_SOURCE]: { title: OWN_TITLE, entries: [OWN_TRACK] },
      [EMPTY_SOURCE]: { title: EMPTY_TITLE, entries: [] }
    }
  });

  const ownedId = await createForBrowser(request, OWN_SOURCE);
  await createForBrowser(request, EMPTY_SOURCE);

  await page.goto('/');
  await reloadUntil(page, page.getByRole('link', { name: OWN_TITLE }));
  await reloadUntil(page, page.getByRole('link', { name: EMPTY_TITLE }));
  await drainDownloads(page);

  await openPlaylist(page, OWN_TITLE);
  await expect(
    page.getByRole('button', { name: `Play ${OWN_TRACK.title}` })
  ).toBeVisible();

  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const dialog = page.getByRole('dialog', { name: 'Playlist cover' });
  await chooseImage(dialog, 'cover.png', COVER_PNG);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  await expect(coverImage(page, ownedId)).toBeVisible();

  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(
    customCoverIn(galleryItem(page, OWN_TITLE), ownedId)
  ).toBeVisible();

  /* The gallery opens the same dialog. */
  await galleryItem(page, OWN_TITLE)
    .getByRole('button', { name: `More actions for ${OWN_TITLE}` })
    .click();
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const galleryDialog = page.getByRole('dialog', { name: 'Playlist cover' });
  await expect(galleryDialog).toBeVisible();
  await galleryDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(galleryDialog).toBeHidden();

  /* A reload reads the server, so the cover is durable. */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    customCoverIn(galleryItem(page, OWN_TITLE), ownedId)
  ).toBeVisible();

  await openPlaylist(page, OWN_TITLE);
  await expect(coverImage(page, ownedId)).toBeVisible();
  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const removeDialog = page.getByRole('dialog', { name: 'Playlist cover' });
  await removeDialog.getByRole('button', { name: 'Remove cover' }).click();
  await expect(removeDialog.getByRole('alert')).toContainText(
    'Remove the custom cover?'
  );
  await removeDialog.getByRole('button', { name: 'Remove cover' }).click();
  await expect(removeDialog).toBeHidden();

  /* The removal falls back to the first track's stored thumbnail. */
  await expect(
    page.locator('img[src*="/tracks/"][src*="/thumbnail"]').first()
  ).toBeVisible();

  /* An empty playlist has no image at all, so it draws the sleeve. */
  await page.getByRole('link', { name: 'Back to home' }).click();
  await openPlaylist(page, EMPTY_TITLE);
  await expect(
    page.locator('[data-art="no-art"][data-sleeve]').first()
  ).toBeVisible();
});

test('an owner crops a new cover and the stored square survives a reload', async ({
  page,
  request
}) => {
  writeScenario({
    sources: {
      [CROP_SOURCE]: { title: CROP_TITLE, entries: [CROP_TRACK] }
    }
  });

  const playlistId = await createForBrowser(request, CROP_SOURCE);

  await page.goto('/');
  await reloadUntil(page, page.getByRole('link', { name: CROP_TITLE }));
  await drainDownloads(page);
  await openPlaylist(page, CROP_TITLE);

  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const dialog = page.getByRole('dialog', { name: 'Playlist cover' });
  await chooseImage(dialog, 'wide.png', WIDE_COVER_PNG);

  /* The stage appears once the image decodes; two steps reach 1.2x, inside the
   * 1.25x this source allows. */
  const zoom = dialog.getByRole('slider', { name: 'Zoom' });
  await expect(zoom).toBeVisible();
  await zoom.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  const box = await dialog.getByRole('group').boundingBox();

  if (box === null) {
    throw new Error('the crop stage has no box');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 - 60,
    box.y + box.height / 2 + 20,
    { steps: 4 }
  );
  await page.mouse.up();

  const adjusted = page.waitForRequest(
    sent =>
      sent.method() === 'POST' &&
      sent.url().includes(`/playlists/${playlistId}/cover`)
  );

  await dialog.getByRole('button', { name: 'Save' }).click();

  const fields = cropFields((await adjusted).url());

  if (fields === null) {
    throw new Error('the adjusted upload carried no crop');
  }

  for (const value of Object.values(fields)) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }

  expect(fields.x + fields.width).toBeLessThanOrEqual(1);
  expect(fields.y + fields.height).toBeLessThanOrEqual(1);
  expect(fields.width).toBeLessThan(1);
  expect(fields.x).toBeGreaterThan((1 - fields.width) / 2);
  expect(fields.y).not.toBeCloseTo((1 - fields.height) / 2);

  await expect(dialog).toBeHidden();

  const detailCover = coverImage(page, playlistId);
  await expect(detailCover).toBeVisible();
  await expectSquareCover(detailCover);

  await page.getByRole('link', { name: 'Back to home' }).click();
  const cardCover = customCoverIn(galleryItem(page, CROP_TITLE), playlistId);
  await expect(cardCover).toBeVisible();
  await expectSquareCover(cardCover);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(cardCover).toBeVisible();
  await expectSquareCover(cardCover);

  /* A second upload untouched proves the centered default through the dialog. */
  await openPlaylist(page, CROP_TITLE);
  const before = await coverImage(page, playlistId).getAttribute('src');
  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const secondDialog = page.getByRole('dialog', { name: 'Playlist cover' });

  await chooseImage(secondDialog, 'centered.png', COVER_PNG);
  await expect(
    secondDialog.getByRole('slider', { name: 'Zoom' })
  ).toBeVisible();

  const untouched = page.waitForRequest(
    sent =>
      sent.method() === 'POST' &&
      sent.url().includes(`/playlists/${playlistId}/cover`)
  );

  await secondDialog.getByRole('button', { name: 'Save' }).click();

  expect(cropFields((await untouched).url())).toBeNull();
  await expect(secondDialog).toBeHidden();

  const replaced = coverImage(page, playlistId);
  await expect(replaced).toBeVisible();
  await expect.poll(() => replaced.getAttribute('src')).not.toBe(before);
  await expectSquareCover(replaced);
});

test('a read collaborator sees the cover and has no Cover item', async ({
  page,
  request
}) => {
  writeScenario({
    sources: {
      [READ_SOURCE]: { title: READ_TITLE, entries: [READ_TRACK] }
    }
  });

  const playlistId = await createAs(request, READER, READ_SOURCE);
  await shareWithBrowser(
    request,
    READER,
    playlistId,
    await browserAccountId(request),
    'read'
  );
  await uploadAs(request, READER, playlistId);

  await page.goto('/');
  await reloadUntil(page, page.getByRole('link', { name: READ_TITLE }));
  await openPlaylist(page, READ_TITLE);

  await expect(coverImage(page, playlistId)).toBeVisible();

  /* The reader's menu lives on the gallery item, where Pin is their one item. */
  await page.getByRole('link', { name: 'Back to home' }).click();
  await galleryItem(page, READ_TITLE)
    .getByRole('button', { name: `More actions for ${READ_TITLE}` })
    .click();

  await expect(page.getByRole('menuitem', { name: 'Pin' })).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Update the cover' })
  ).toHaveCount(0);
});

test('a write collaborator replaces the cover from the gallery', async ({
  page,
  request
}) => {
  writeScenario({
    sources: {
      [WRITE_SOURCE]: { title: WRITE_TITLE, entries: [WRITE_TRACK] }
    }
  });

  const playlistId = await createAs(request, WRITER, WRITE_SOURCE);
  await shareWithBrowser(
    request,
    WRITER,
    playlistId,
    await browserAccountId(request),
    'write'
  );
  await uploadAs(request, WRITER, playlistId, COVER_PNG);

  await page.goto('/');
  await reloadUntil(page, page.getByRole('link', { name: WRITE_TITLE }));

  const cardCover = customCoverIn(galleryItem(page, WRITE_TITLE), playlistId);
  const before = await cardCover.getAttribute('src');

  await galleryItem(page, WRITE_TITLE)
    .getByRole('button', { name: `More actions for ${WRITE_TITLE}` })
    .click();
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const dialog = page.getByRole('dialog', { name: 'Playlist cover' });
  await chooseImage(dialog, 'replacement.png', COVER_PNG_2);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  /* A replacement is a new version, so a cached image cannot hide it. */
  await expect.poll(() => cardCover.getAttribute('src')).not.toBe(before);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(cardCover).toBeVisible();

  await openPlaylist(page, WRITE_TITLE);
  await expect(coverImage(page, playlistId)).toBeVisible();
});

test('the 390px arrangement opens the cover dialog and saves', async ({
  page,
  request
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  writeScenario({
    sources: {
      [PHONE_SOURCE]: { title: PHONE_TITLE, entries: [PHONE_TRACK] }
    }
  });

  const playlistId = await createForBrowser(request, PHONE_SOURCE);

  await page.goto('/');
  await reloadUntil(page, page.getByRole('link', { name: PHONE_TITLE }));
  await drainDownloads(page);

  await openPlaylist(page, PHONE_TITLE);
  await expect(
    page.locator('[data-arrangement="row"][data-heading="true"]')
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Play ${PHONE_TRACK.title}` })
  ).toBeVisible();

  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Update the cover' }).click();

  const dialog = page.getByRole('dialog', { name: 'Playlist cover' });
  await expect(dialog).toBeVisible();
  await chooseImage(dialog, 'phone-cover.png', COVER_PNG);
  await expect(dialog.getByRole('group')).toBeVisible();
  await expect(dialog.getByRole('slider', { name: 'Zoom' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  await expect(coverImage(page, playlistId)).toBeVisible();

  await page.getByRole('link', { name: /^Back( to home)?$/ }).click();
  await expect(
    customCoverIn(galleryItem(page, PHONE_TITLE), playlistId)
  ).toBeVisible();
});
