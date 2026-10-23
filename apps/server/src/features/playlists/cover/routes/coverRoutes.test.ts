import { randomBytes } from 'node:crypto';
import { chmod, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import {
  LiveEventType,
  PlaylistSchema,
  ProblemSchema,
  ShareLevel
} from '@playliberty/contracts';

import type { TestContext } from '../../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../../app/testing/createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedTrack
} from '../../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../../platform/database/client.js';
import { playlists } from '../../../../platform/database/schema.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function database(): DatabaseHandle {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database;
}

function upload(
  playlistId: string,
  pangolinUserId: string,
  image: Buffer,
  contentType = 'image/jpeg',
  query = ''
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url: `/api/v1/playlists/${playlistId}/cover${query}`,
    headers: {
      'remote-user': pangolinUserId,
      'x-playliberty-client': 'test',
      'content-type': contentType
    },
    payload: image
  });
}

function get(url: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: { 'remote-user': pangolinUserId }
  });
}

function del(url: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'DELETE',
    url,
    headers: {
      'remote-user': pangolinUserId,
      'x-playliberty-client': 'test'
    }
  });
}

function patch(
  url: string,
  pangolinUserId: string,
  payload: Record<string, unknown>
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'PATCH',
    url,
    headers: {
      'remote-user': pangolinUserId,
      'x-playliberty-client': 'test'
    },
    payload
  });
}

function coverUrl(playlistId: string, version: string): string {
  return `/api/v1/playlists/${playlistId}/cover?v=${encodeURIComponent(version)}`;
}

async function storedCover(
  playlistId: string,
  pangolinUserId: string,
  coverUpdatedAt: string | null
): Promise<Buffer> {
  const response = await get(
    coverUrl(playlistId, coverUpdatedAt ?? ''),
    pangolinUserId
  );

  expect(response.statusCode).toBe(200);

  return response.rawPayload;
}

function coverRow(playlistId: string) {
  return database()
    .db.select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();
}

function mediaRoot(): string {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.mediaPaths.root;
}

async function fileExists(path: string): Promise<boolean> {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}

async function image(
  format: 'jpeg' | 'png' | 'webp',
  width = 2000,
  height = 1000
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 120, b: 80 }
    }
  })
    .withMetadata({
      orientation: 6,
      exif: { IFD0: { Copyright: 'PlayLiberty test' } }
    })
    .toFormat(format)
    .toBuffer();
}

interface Colour {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const RED: Colour = { r: 210, g: 30, b: 30 };
const GREEN: Colour = { r: 30, g: 170, b: 70 };
const BLUE: Colour = { r: 30, g: 60, b: 200 };

/* Three equal vertical bands, so the colour of a stored region says which part
 * of the image the server kept, not only how large it is. */
async function bands(
  colours: readonly Colour[],
  format: 'png' | 'jpeg',
  orientation?: number
): Promise<Buffer> {
  const bandWidth = 300;
  const height = 300;
  const width = bandWidth * colours.length;
  const raw = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const colour = colours[Math.floor(x / bandWidth)];
      const at = (y * width + x) * 3;
      raw[at] = colour.r;
      raw[at + 1] = colour.g;
      raw[at + 2] = colour.b;
    }
  }

  let pipeline = sharp(raw, { raw: { width, height, channels: 3 } });

  if (orientation !== undefined) {
    pipeline = pipeline.withMetadata({ orientation });
  }

  return format === 'png'
    ? pipeline.png().toBuffer()
    : pipeline.jpeg({ quality: 95 }).toBuffer();
}

async function solid(
  width: number,
  height: number,
  colour: Colour = GREEN
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: colour }
  })
    .png()
    .toBuffer();
}

interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly at: (x: number, y: number) => Colour;
}

async function pixels(encoded: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(encoded)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width: info.width,
    height: info.height,
    at: (x, y) => {
      const at = (y * info.width + x) * info.channels;

      return { r: data[at], g: data[at + 1], b: data[at + 2] };
    }
  };
}

/* WebP at the stored quality shifts a solid colour a little, and the fixtures
 * are far enough apart that a tolerance still names the region. */
function expectColour(actual: Colour, expected: Colour): void {
  expect(Math.abs(actual.r - expected.r)).toBeLessThanOrEqual(24);
  expect(Math.abs(actual.g - expected.g)).toBeLessThanOrEqual(24);
  expect(Math.abs(actual.b - expected.b)).toBeLessThanOrEqual(24);
}

describe('setting a playlist cover', () => {
  it('stores an uploaded JPEG as a capped square WebP and serves it to a reader', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const reader = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      await image('jpeg', 4000, 2000),
      'image/jpeg'
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('coverPath');
    const playlist = PlaylistSchema.parse(response.json());
    expect(playlist.coverUpdatedAt).not.toBeNull();

    const detail = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId)
      ).json()
    );
    expect(detail.coverUpdatedAt).toBe(playlist.coverUpdatedAt);

    const cover = await get(
      coverUrl(playlistId, playlist.coverUpdatedAt ?? ''),
      reader.pangolinUserId
    );

    expect(cover.statusCode).toBe(200);
    expect(cover.headers['content-type']).toContain('image/webp');
    expect(cover.headers['cache-control']).toBe('private, max-age=2592000');

    const metadata = await sharp(cover.rawPayload).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(1600);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });

  it.each(['png', 'webp'] as const)(
    'accepts a %s upload and stores WebP at the cap',
    async format => {
      context = await createTestContext();
      const owner = seedAccount(database());
      const { playlistId } = seedPlaylist(database(), owner.accountId);

      const response = await upload(
        playlistId,
        owner.pangolinUserId,
        await image(format, 4000, 2000),
        `image/${format}`
      );

      expect(response.statusCode).toBe(200);
      const playlist = PlaylistSchema.parse(response.json());
      const cover = await get(
        coverUrl(playlistId, playlist.coverUpdatedAt ?? ''),
        owner.pangolinUserId
      );

      expect(cover.statusCode).toBe(200);
      expect(cover.headers['content-type']).toContain('image/webp');

      const metadata = await sharp(cover.rawPayload).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(1600);
      expect(metadata.height).toBe(1600);
    }
  );

  it('does not enlarge an image smaller than the cap', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const playlist = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await image('png', 640, 480),
          'image/png'
        )
      ).json()
    );
    const cover = await get(
      coverUrl(playlistId, playlist.coverUpdatedAt ?? ''),
      owner.pangolinUserId
    );

    const metadata = await sharp(cover.rawPayload).metadata();
    expect(metadata.width).toBe(480);
    expect(metadata.height).toBe(480);
  });

  it('replaces the file and version, and removes the previous file', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const first = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await image('jpeg'),
          'image/jpeg'
        )
      ).json()
    );
    const firstRow = coverRow(playlistId);
    expect(firstRow?.coverPath).not.toBeNull();

    const second = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await image('png'),
          'image/png'
        )
      ).json()
    );
    const secondRow = coverRow(playlistId);

    expect(second.coverUpdatedAt).not.toBe(first.coverUpdatedAt);
    expect(secondRow?.coverPath).not.toBe(firstRow?.coverPath);
    expect(await fileExists(join(mediaRoot(), firstRow?.coverPath ?? ''))).toBe(
      false
    );
    expect(
      await fileExists(join(mediaRoot(), secondRow?.coverPath ?? ''))
    ).toBe(true);
  });

  it('keeps the previous cover when the new file cannot be written', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const before = coverRow(playlistId);
    const validRoot = mediaRoot();

    context.mediaPaths.root = join(context.directory, 'missing-root');

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      await image('png'),
      'image/png'
    );

    expect(response.statusCode).toBe(500);
    expect(coverRow(playlistId)).toMatchObject({
      coverPath: before?.coverPath,
      coverUpdatedAt: before?.coverUpdatedAt
    });
    expect(await fileExists(join(validRoot, before?.coverPath ?? ''))).toBe(
      true
    );
  });

  it('leaves the cover alone across the other playlist mutations', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const before = coverRow(playlistId);

    expect(
      (
        await patch(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId, {
          name: 'Renamed'
        })
      ).statusCode
    ).toBe(200);
    expect(
      (
        await patch(
          `/api/v1/playlists/${playlistId}/skip-non-music`,
          owner.pangolinUserId,
          { skipNonMusic: false }
        )
      ).statusCode
    ).toBe(200);
    expect(
      (
        await patch(
          `/api/v1/playlists/${playlistId}/sort`,
          owner.pangolinUserId,
          { sort: 'newest_first' }
        )
      ).statusCode
    ).toBe(200);

    expect(coverRow(playlistId)).toMatchObject({
      coverPath: before?.coverPath,
      coverUpdatedAt: before?.coverUpdatedAt
    });
  });

  it('refuses a type outside JPEG, PNG and WebP', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    const before = coverRow(playlistId);

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      Buffer.from('GIF89a'),
      'image/gif'
    );

    expect(response.statusCode).toBe(415);
    expect(ProblemSchema.parse(response.json()).code).toBe('request_error');
    expect(coverRow(playlistId)).toEqual(before);
  });

  it('refuses a non-image body and leaves the previous cover untouched', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const before = coverRow(playlistId);

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      Buffer.from('not an image'),
      'image/jpeg'
    );

    expect(response.statusCode).toBe(422);
    expect(coverRow(playlistId)).toEqual(before);
  });

  it('refuses an image beyond 64 megapixels and leaves the previous cover untouched', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const before = coverRow(playlistId);
    const oversized = await image('png', 8200, 8200);

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      oversized,
      'image/png'
    );

    expect(response.statusCode).toBe(422);
    expect(coverRow(playlistId)).toEqual(before);
  });

  it('refuses a valid image over 5 MB and leaves the previous cover untouched', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const before = coverRow(playlistId);
    const noisy = await sharp(randomBytes(1600 * 1600 * 3), {
      raw: { width: 1600, height: 1600, channels: 3 }
    })
      .png()
      .toBuffer();

    expect(noisy.length).toBeGreaterThan(5 * 1024 * 1024);

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      noisy,
      'image/png'
    );

    expect(response.statusCode).toBe(413);
    expect(coverRow(playlistId)).toEqual(before);
  });

  it('lets only the owner and a write collaborator upload', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const writer = seedAccount(database());
    const reader = seedAccount(database());
    const stranger = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, writer.accountId, {
      level: ShareLevel.Write
    });
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });
    const jpeg = await image('jpeg');

    const owned = PlaylistSchema.parse(
      (await upload(playlistId, owner.pangolinUserId, jpeg)).json()
    );
    const collaborated = PlaylistSchema.parse(
      (await upload(playlistId, writer.pangolinUserId, jpeg)).json()
    );

    expect(owned.coverUpdatedAt).not.toBeNull();
    expect(collaborated.coverUpdatedAt).not.toBe(owned.coverUpdatedAt);

    expect(
      (await upload(playlistId, reader.pangolinUserId, jpeg)).statusCode
    ).toBe(404);
    expect(
      (await upload(playlistId, stranger.pangolinUserId, jpeg)).statusCode
    ).toBe(404);
    expect(
      (await upload('missing', owner.pangolinUserId, jpeg)).statusCode
    ).toBe(404);
  });

  it('refuses an unreadable playlist and a missing cover as not-found', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const stranger = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const noCover = await get(
      coverUrl(playlistId, 'missing-version'),
      owner.pangolinUserId
    );
    expect(noCover.statusCode).toBe(404);
    expect(ProblemSchema.parse(noCover.json()).code).toBe('cover_not_found');

    const unreachable = await get(
      coverUrl(playlistId, 'missing-version'),
      stranger.pangolinUserId
    );
    expect(unreachable.statusCode).toBe(404);
    expect(ProblemSchema.parse(unreachable.json()).code).toBe(
      'playlist_not_found'
    );

    const missing = await get(
      coverUrl('missing', 'missing-version'),
      owner.pangolinUserId
    );
    expect(missing.statusCode).toBe(404);
    expect(ProblemSchema.parse(missing.json()).code).toBe('playlist_not_found');
  });

  it('answers not-found when the stored cover file is gone', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId, {
      coverPath: 'covers/missing.webp',
      coverUpdatedAt: '2026-10-20T12:00:00.000Z'
    });

    const response = await get(
      coverUrl(playlistId, '2026-10-20T12:00:00.000Z'),
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    expect(ProblemSchema.parse(response.json()).code).toBe('cover_not_found');
  });

  it('publishes one playlist change after the row carries the cover', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const reader = seedAccount(database());
    const stranger = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    const ownerEvents: unknown[] = [];
    const readerEvents: unknown[] = [];
    const strangerEvents: unknown[] = [];
    const filesAtEvent: string[] = [];
    context.events.subscribe(owner.accountId, event => {
      ownerEvents.push(event);
      filesAtEvent.push(coverRow(playlistId)?.coverPath ?? '');
    });
    context.events.subscribe(reader.accountId, event =>
      readerEvents.push(event)
    );
    context.events.subscribe(stranger.accountId, event =>
      strangerEvents.push(event)
    );

    const response = await upload(
      playlistId,
      owner.pangolinUserId,
      await image('jpeg')
    );

    expect(response.statusCode).toBe(200);
    expect(ownerEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
    expect(readerEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
    expect(strangerEvents).toEqual([]);
    expect(filesAtEvent).toHaveLength(1);
    expect(await fileExists(join(mediaRoot(), filesAtEvent[0] ?? ''))).toBe(
      true
    );
  });

  it('publishes nothing when a read collaborator is refused', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const reader = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    const events: unknown[] = [];
    context.events.subscribe(owner.accountId, event => events.push(event));

    const response = await upload(
      playlistId,
      reader.pangolinUserId,
      await image('jpeg')
    );

    expect(response.statusCode).toBe(404);
    expect(events).toEqual([]);
  });

  it('removes the cover as the owner or a write collaborator and returns the first track', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const writer = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, writer.accountId, {
      level: ShareLevel.Write
    });
    const { trackId } = seedTrack(database());
    associate(database(), playlistId, trackId);

    const uploaded = await upload(
      playlistId,
      owner.pangolinUserId,
      await image('jpeg')
    );
    expect(uploaded.statusCode).toBe(200);
    const file = join(mediaRoot(), coverRow(playlistId)?.coverPath ?? '');
    expect(await fileExists(file)).toBe(true);

    const response = await del(
      `/api/v1/playlists/${playlistId}/cover`,
      writer.pangolinUserId
    );

    expect(response.statusCode).toBe(204);
    expect(coverRow(playlistId)?.coverPath).toBeNull();
    expect(coverRow(playlistId)?.coverUpdatedAt).toBeNull();
    expect(await fileExists(file)).toBe(false);

    const detail = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId)
      ).json()
    );
    expect(detail.coverUpdatedAt).toBeNull();
    expect(detail.coverTrackId).toBe(trackId);
  });

  it('refuses a read collaborator, a stranger and a missing playlist without an event', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const reader = seedAccount(database());
    const stranger = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const before = coverRow(playlistId);
    const file = join(mediaRoot(), before?.coverPath ?? '');
    const events: unknown[] = [];
    context.events.subscribe(owner.accountId, event => events.push(event));

    const attempts: [string, string][] = [
      [playlistId, reader.pangolinUserId],
      [playlistId, stranger.pangolinUserId],
      ['missing', owner.pangolinUserId]
    ];

    for (const [id, userId] of attempts) {
      const response = await del(`/api/v1/playlists/${id}/cover`, userId);

      expect(response.statusCode).toBe(404);
      expect(ProblemSchema.parse(response.json()).code).toBe(
        'playlist_not_found'
      );
    }

    expect(coverRow(playlistId)).toEqual(before);
    expect(await fileExists(file)).toBe(true);
    expect(events).toEqual([]);
  });

  it('deletes idempotently when the playlist has no cover', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    const events: unknown[] = [];
    context.events.subscribe(owner.accountId, event => events.push(event));

    const first = await del(
      `/api/v1/playlists/${playlistId}/cover`,
      owner.pangolinUserId
    );
    const second = await del(
      `/api/v1/playlists/${playlistId}/cover`,
      owner.pangolinUserId
    );

    expect(first.statusCode).toBe(204);
    expect(second.statusCode).toBe(204);
    expect(coverRow(playlistId)?.coverPath).toBeNull();
    expect(coverRow(playlistId)?.coverUpdatedAt).toBeNull();
    expect(events).toEqual([]);
  });

  it('publishes one playlist change after the row is cleared', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const reader = seedAccount(database());
    const stranger = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));

    const ownerEvents: unknown[] = [];
    const readerEvents: unknown[] = [];
    const strangerEvents: unknown[] = [];
    const pathsAtEvent: (string | null)[] = [];
    context.events.subscribe(owner.accountId, event => {
      ownerEvents.push(event);
      pathsAtEvent.push(coverRow(playlistId)?.coverPath ?? null);
    });
    context.events.subscribe(reader.accountId, event =>
      readerEvents.push(event)
    );
    context.events.subscribe(stranger.accountId, event =>
      strangerEvents.push(event)
    );

    const response = await del(
      `/api/v1/playlists/${playlistId}/cover`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(204);
    expect(ownerEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
    expect(readerEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
    expect(strangerEvents).toEqual([]);
    expect(pathsAtEvent).toEqual([null]);
  });

  it('keeps its answer when the file cannot be removed and leaves it to the prune', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
    const file = join(mediaRoot(), coverRow(playlistId)?.coverPath ?? '');
    await chmod(context.mediaPaths.coversDir, 0o500);

    try {
      const response = await del(
        `/api/v1/playlists/${playlistId}/cover`,
        owner.pangolinUserId
      );

      expect(response.statusCode).toBe(204);
      expect(coverRow(playlistId)?.coverPath).toBeNull();
      expect(coverRow(playlistId)?.coverUpdatedAt).toBeNull();
      expect(await fileExists(file)).toBe(true);
    } finally {
      await chmod(context.mediaPaths.coversDir, 0o700);
    }
  });
});

describe('choosing the stored region', () => {
  it('stores the centered square when the request carries no crop', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const playlist = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await bands([RED, GREEN, BLUE], 'png'),
          'image/png'
        )
      ).json()
    );
    const cover = await storedCover(
      playlistId,
      owner.pangolinUserId,
      playlist.coverUpdatedAt
    );
    const stored = await pixels(cover);

    expect(stored.width).toBe(300);
    expect(stored.height).toBe(300);
    expectColour(stored.at(10, 10), GREEN);
    expectColour(stored.at(150, 150), GREEN);
    expectColour(stored.at(290, 290), GREEN);
  });

  it('stores the requested region when the request carries a crop', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    const rightThird =
      '?cropX=0.6666666666666666&cropY=0&cropWidth=0.3333333333333333&cropHeight=1';

    const playlist = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await bands([RED, GREEN, BLUE], 'png'),
          'image/png',
          rightThird
        )
      ).json()
    );
    const cover = await storedCover(
      playlistId,
      owner.pangolinUserId,
      playlist.coverUpdatedAt
    );
    const stored = await pixels(cover);

    expect(stored.width).toBe(300);
    expect(stored.height).toBe(300);
    expectColour(stored.at(10, 10), BLUE);
    expectColour(stored.at(150, 150), BLUE);
    expectColour(stored.at(290, 290), BLUE);
  });

  it('orients the image before it applies the crop', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    /* Stored 900x300, shown 300x900 after the quarter turn: the left band
     * becomes the top third. A crop measured before the turn would keep a
     * 900x100 strip instead of a 300x300 region. */
    const playlist = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await bands([RED, GREEN, BLUE], 'jpeg', 6),
          'image/jpeg',
          '?cropX=0&cropY=0&cropWidth=1&cropHeight=0.3333333333333333'
        )
      ).json()
    );
    const cover = await storedCover(
      playlistId,
      owner.pangolinUserId,
      playlist.coverUpdatedAt
    );
    const stored = await pixels(cover);

    expect(stored.width).toBe(300);
    expect(stored.height).toBe(300);
    expectColour(stored.at(10, 10), RED);
    expectColour(stored.at(150, 150), RED);
    expectColour(stored.at(290, 290), RED);
  });

  it('caps an extracted region at 1600px and never enlarges it', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const capped = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await solid(4000, 2000),
          'image/png',
          '?cropX=0&cropY=0&cropWidth=0.5&cropHeight=0.5'
        )
      ).json()
    );
    const cappedMetadata = await sharp(
      await storedCover(playlistId, owner.pangolinUserId, capped.coverUpdatedAt)
    ).metadata();

    expect(cappedMetadata.width).toBe(1600);
    expect(cappedMetadata.height).toBe(800);

    const small = PlaylistSchema.parse(
      (
        await upload(
          playlistId,
          owner.pangolinUserId,
          await solid(4000, 2000),
          'image/png',
          '?cropX=0&cropY=0&cropWidth=0.05&cropHeight=0.1'
        )
      ).json()
    );
    const smallMetadata = await sharp(
      await storedCover(playlistId, owner.pangolinUserId, small.coverUpdatedAt)
    ).metadata();

    expect(smallMetadata.width).toBe(200);
    expect(smallMetadata.height).toBe(200);
  });

  it.each([
    ['one field alone', '?cropX=0.1'],
    ['a non-numeric field', '?cropX=abc&cropY=0&cropWidth=1&cropHeight=1'],
    ['a zero width', '?cropX=0&cropY=0&cropWidth=0&cropHeight=1'],
    ['a zero height', '?cropX=0&cropY=0&cropWidth=1&cropHeight=0'],
    ['a negative origin', '?cropX=-0.1&cropY=0&cropWidth=0.5&cropHeight=1'],
    [
      'a width past the right edge',
      '?cropX=0.6&cropY=0&cropWidth=0.5&cropHeight=1'
    ],
    [
      'a height past the bottom edge',
      '?cropX=0&cropY=0.6&cropWidth=1&cropHeight=0.5'
    ],
    ['a width beyond the image', '?cropX=0&cropY=0&cropWidth=1.5&cropHeight=1']
  ])(
    'refuses %s and leaves the previous cover alone',
    async (_reason, query) => {
      context = await createTestContext();
      const owner = seedAccount(database());
      const { playlistId } = seedPlaylist(database(), owner.accountId);

      await upload(playlistId, owner.pangolinUserId, await image('jpeg'));
      const before = coverRow(playlistId);
      const file = join(mediaRoot(), before?.coverPath ?? '');

      const response = await upload(
        playlistId,
        owner.pangolinUserId,
        await image('png'),
        'image/png',
        query
      );

      expect(response.statusCode).toBe(422);
      expect(ProblemSchema.parse(response.json()).code).toBe(
        'unprocessable_request'
      );
      expect(coverRow(playlistId)).toEqual(before);
      expect(await fileExists(file)).toBe(true);
    }
  );

  it('keeps an existing non-square cover as it is', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const existing = await sharp({
      create: { width: 2000, height: 500, channels: 3, background: BLUE }
    })
      .webp()
      .toBuffer();
    await writeFile(join(mediaRoot(), 'covers/existing.webp'), existing);

    const { playlistId } = seedPlaylist(database(), owner.accountId, {
      coverPath: 'covers/existing.webp',
      coverUpdatedAt: '2026-10-20T12:00:00.000Z'
    });
    const { playlistId: otherId } = seedPlaylist(database(), owner.accountId);

    await upload(otherId, owner.pangolinUserId, await image('jpeg'));

    const served = await get(
      coverUrl(playlistId, '2026-10-20T12:00:00.000Z'),
      owner.pangolinUserId
    );

    expect(served.statusCode).toBe(200);
    expect(served.rawPayload.equals(existing)).toBe(true);
  });
});
