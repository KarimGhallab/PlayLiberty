import { afterEach, describe, expect, it } from 'vitest';

import {
  AccountSchema,
  LiveEventSchema,
  LiveEventType,
  SyncRunSchema
} from '@playliberty/contracts';
import type { LiveEvent, SyncRun } from '@playliberty/contracts';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';
import {
  createFakeYoutube,
  testEntry,
  testSource
} from '../../app/testing/fakeYoutube.js';

/*
 * The live stream over a real socket, because a hijacked response that never ends
 * is not something `inject` can read: the test listens, opens the stream with
 * `fetch`, and parses the frames a browser's `EventSource` would receive. The
 * fake adapter resolves at once, so a sync's background run finishes rather than
 * reaching for yt-dlp.
 */

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';
const HEARTBEAT_MS = 50;

let context: TestContext | undefined;
const openControllers: AbortController[] = [];

afterEach(async () => {
  for (const controller of openControllers) {
    controller.abort();
  }

  openControllers.length = 0;

  // Give the abort a tick to reach the server, so `close` is not waiting on a
  // connection the test has already given up.
  await new Promise(resolve => setTimeout(resolve, 10));

  await context?.cleanup();
  context = undefined;
});

/*
 * A reader for the frames of an event stream. A frame is separated by a blank
 * line; a comment frame is the heartbeat and has no data line, so `nextEvent`
 * skips it while `nextFrame` returns it.
 */
class SseReader {
  private _buffer = '';
  private readonly _decoder = new TextDecoder();

  constructor(
    private readonly _reader: ReadableStreamDefaultReader<Uint8Array>
  ) {}

  async nextFrame(): Promise<string> {
    for (;;) {
      const boundary = this._buffer.indexOf('\n\n');

      if (boundary !== -1) {
        const frame = this._buffer.slice(0, boundary);
        this._buffer = this._buffer.slice(boundary + 2);
        return frame;
      }

      const { value, done } = await this._reader.read();

      if (done) {
        throw new Error('the stream closed before the next frame');
      }

      this._buffer += this._decoder.decode(value, { stream: true });
    }
  }

  async nextEvent(): Promise<LiveEvent> {
    for (;;) {
      const frame = await this.nextFrame();
      const line = frame.split('\n').find(part => part.startsWith('data: '));

      if (line === undefined) {
        continue;
      }

      const body: unknown = JSON.parse(line.slice('data: '.length));
      return LiveEventSchema.parse(body);
    }
  }
}

async function start(): Promise<string> {
  context = await createTestContext(
    {},
    {
      youtube: createFakeYoutube(testSource([testEntry('a')])),
      sseHeartbeatMs: HEARTBEAT_MS
    }
  );

  return context.app.listen({ port: 0, host: '127.0.0.1' });
}

async function openStream(
  baseUrl: string,
  pangolinUserId: string
): Promise<SseReader> {
  const controller = new AbortController();
  openControllers.push(controller);

  const response = await fetch(`${baseUrl}/api/v1/events`, {
    headers: { 'remote-user': pangolinUserId },
    signal: controller.signal
  });

  if (response.status !== 200 || response.body === null) {
    throw new Error(`the stream answered ${response.status}`);
  }

  return new SseReader(response.body.getReader());
}

async function createPlaylist(
  baseUrl: string,
  pangolinUserId: string
): Promise<SyncRun> {
  const response = await fetch(`${baseUrl}/api/v1/playlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-playliberty-client': 'test',
      'remote-user': pangolinUserId
    },
    body: JSON.stringify({ url: PLAYLIST_URL })
  });

  const body: unknown = await response.json();
  return SyncRunSchema.parse(body);
}

async function within<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>(resolve => {
      setTimeout(() => resolve('timeout'), ms);
    })
  ]);
}

async function currentAccountId(
  baseUrl: string,
  pangolinUserId: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { 'remote-user': pangolinUserId }
  });

  const body: unknown = await response.json();
  return AccountSchema.parse(body).id;
}

async function grantShare(
  baseUrl: string,
  playlistId: string,
  ownerPangolinUserId: string,
  accountId: string
): Promise<void> {
  await fetch(`${baseUrl}/api/v1/playlists/${playlistId}/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-playliberty-client': 'test',
      'remote-user': ownerPangolinUserId
    },
    body: JSON.stringify({ accountId, level: 'read' })
  });
}

async function startSync(
  baseUrl: string,
  playlistId: string,
  pangolinUserId: string
): Promise<void> {
  await fetch(`${baseUrl}/api/v1/playlists/${playlistId}/sync`, {
    method: 'POST',
    headers: {
      'x-playliberty-client': 'test',
      'remote-user': pangolinUserId
    }
  });
}

describe('GET /events', () => {
  it('refuses a connection without the edge identity', async () => {
    const baseUrl = await start();

    const response = await fetch(`${baseUrl}/api/v1/events`);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('sends ready on connect and a heartbeat while idle', async () => {
    const baseUrl = await start();
    const reader = await openStream(baseUrl, 'owner-1');

    expect(await reader.nextEvent()).toEqual({ type: LiveEventType.Ready });
    expect(await reader.nextFrame()).toBe(': keepalive');
  });

  it('delivers a playlist change to the account that can see it', async () => {
    const baseUrl = await start();
    const reader = await openStream(baseUrl, 'owner-1');
    await reader.nextEvent();

    const run = await createPlaylist(baseUrl, 'owner-1');

    expect(await reader.nextEvent()).toEqual({
      type: LiveEventType.PlaylistChanged,
      playlistId: run.playlistId
    });
  });

  it('delivers a playlist change to a collaborator as well as the owner', async () => {
    const baseUrl = await start();
    const owner = await openStream(baseUrl, 'owner-1');
    await owner.nextEvent();

    const run = await createPlaylist(baseUrl, 'owner-1');
    const collaboratorId = await currentAccountId(baseUrl, 'collaborator-1');
    await grantShare(baseUrl, run.playlistId, 'owner-1', collaboratorId);

    const collaborator = await openStream(baseUrl, 'collaborator-1');
    await collaborator.nextEvent();

    await startSync(baseUrl, run.playlistId, 'owner-1');

    expect(await collaborator.nextEvent()).toEqual({
      type: LiveEventType.PlaylistChanged,
      playlistId: run.playlistId
    });
  });

  it('does not deliver a playlist to an account that cannot see it', async () => {
    const baseUrl = await start();
    const owner = await openStream(baseUrl, 'owner-1');
    const stranger = await openStream(baseUrl, 'stranger-1');
    await owner.nextEvent();
    await stranger.nextEvent();

    await createPlaylist(baseUrl, 'owner-1');

    expect(await owner.nextEvent()).toMatchObject({
      type: LiveEventType.PlaylistChanged
    });
    expect(await within(stranger.nextEvent(), 300)).toBe('timeout');
  });
});
