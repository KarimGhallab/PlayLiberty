import { afterEach, describe, expect, it } from 'vitest';

import type { SyncRun } from '@playliberty/contracts';
import {
  PlaylistSchema,
  PlaylistSyncStatus,
  SyncRunSchema,
  SyncRunStatus,
  TrackFileStatus,
  createPageSchema
} from '@playliberty/contracts';
import type { IEgressAgentClient, YoutubeSource } from '@playliberty/youtube';
import {
  EGRESS_BLOCKED_REASON,
  EgressSourceUnavailableError,
  YoutubeSourceKind
} from '@playliberty/youtube';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import { TEST_SOURCE_ID } from '../../../app/testing/fakeYoutube.js';

import { tracks } from '../../../platform/database/schema.js';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';
const USER = 'owner-1';
const PageSchema = createPageSchema(PlaylistSchema);

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function post(url: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url: '/api/v1/playlists',
    headers: { 'remote-user': USER, 'x-playliberty-client': 'test' },
    payload: { url }
  });
}

function postSync(playlistId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url: `/api/v1/playlists/${playlistId}/sync`,
    headers: { 'remote-user': USER, 'x-playliberty-client': 'test' }
  });
}

function get(url: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: { 'remote-user': USER }
  });
}

/* The run's outcome read as a client would; the poll loop is a flake guard. */
async function runFinished(playlistId: string): Promise<SyncRun> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const response = await get(
      `/api/v1/playlists/${playlistId}/sync-runs/latest`
    );

    if (response.statusCode === 200) {
      const run = SyncRunSchema.parse(response.json());

      if (run.status !== SyncRunStatus.Running) {
        return run;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  throw new Error('the sync run did not finish');
}

function fakeAgent(list: (url: string) => Promise<YoutubeSource>): {
  agent: IEgressAgentClient;
  calls: string[];
} {
  const calls: string[] = [];

  return {
    calls,
    agent: {
      status: async () => ({ pool: [], active: null, loadedSince: null }),
      switch: async () => {
        throw new Error('the switch is not used by this test');
      },
      check: async () => {
        throw new Error('the check is not used by this test');
      },
      applyConfig: async () => ({
        pool: [],
        active: null,
        loadedSince: null
      }),
      list: async (url: string): Promise<YoutubeSource> => {
        calls.push(url);
        return list(url);
      },
      fetchTrack: async () => {
        throw new Error('this test only lists');
      }
    }
  };
}

function source(entries: string[]): YoutubeSource {
  return {
    kind: YoutubeSourceKind.Playlist,
    sourceId: TEST_SOURCE_ID,
    title: 'Evening Jazz',
    entries: entries.map(videoId => ({
      videoId,
      title: `Track ${videoId}`,
      durationSeconds: 180,
      thumbnailUrl: null
    }))
  };
}

describe('listing through the egress agent', () => {
  it('reconciles a playlist from the agent and records the exit as the source', async () => {
    const { agent, calls } = fakeAgent(async () => source(['a', 'b']));
    context = await createTestContext(
      { YOUTUBE_TRANSPORT: 'egress-agent' },
      { egressAgent: agent }
    );

    const response = await post(PLAYLIST_URL);
    expect(response.statusCode).toBe(202);
    const run = SyncRunSchema.parse(response.json());

    const finished = await runFinished(run.playlistId);

    expect(finished.status).toBe(SyncRunStatus.Completed);
    expect(finished.addedCount).toBe(2);
    expect(calls).toEqual([PLAYLIST_URL]);

    const playlist = PageSchema.parse((await get('/api/v1/playlists')).json())
      .items[0];
    expect(playlist?.trackCount).toBe(2);
    expect(playlist?.name).toBe('Evening Jazz');
  });

  it('records the source sentence when the exit is refused, not a transport fault', async () => {
    const { agent } = fakeAgent(async () => {
      throw new EgressSourceUnavailableError('blocked');
    });
    context = await createTestContext(
      { YOUTUBE_TRANSPORT: 'egress-agent' },
      { egressAgent: agent }
    );

    const run = SyncRunSchema.parse((await post(PLAYLIST_URL)).json());
    const finished = await runFinished(run.playlistId);

    expect(finished.status).toBe(SyncRunStatus.Failed);
    expect(finished.error).toBe('YouTube refused the request from the exit.');
  });

  it('records a transport fault with its own sentence', async () => {
    const { agent } = fakeAgent(async () => {
      throw new Error('The egress agent did not answer in time.');
    });
    context = await createTestContext(
      { YOUTUBE_TRANSPORT: 'egress-agent' },
      { egressAgent: agent }
    );

    const run = SyncRunSchema.parse((await post(PLAYLIST_URL)).json());
    const finished = await runFinished(run.playlistId);

    expect(finished.status).toBe(SyncRunStatus.Failed);
    expect(finished.error).toBe('The egress agent did not answer in time.');
  });

  it('rotates five times and blocks the playlist with the pending tracks intact', async () => {
    const pool = [
      { name: '01-fr', endpoint: '185.0.0.1:51820' },
      { name: '02-ch', endpoint: '185.0.0.2:51820' },
      { name: '03-us', endpoint: '185.0.0.3:51820' }
    ];
    let active = '01-fr';
    let calls = 0;
    const switched: string[] = [];
    const agent: IEgressAgentClient = {
      status: async () => ({ pool, active, loadedSince: null }),
      switch: async () => {
        throw new Error('this test does not switch');
      },
      check: async () => {
        throw new Error('this test does not check');
      },
      applyConfig: async (name: string) => {
        switched.push(name);
        active = name;

        return { pool, active, loadedSince: null };
      },
      list: async (): Promise<YoutubeSource> => {
        calls += 1;

        if (calls === 1) {
          return source(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
        }

        throw new EgressSourceUnavailableError('blocked');
      },
      fetchTrack: async () => {
        throw new Error('this test does not fetch');
      }
    };

    context = await createTestContext(
      { YOUTUBE_TRANSPORT: 'egress-agent', EGRESS_SWITCH_COOLDOWN_MS: '0' },
      { egressAgent: agent }
    );

    const first = SyncRunSchema.parse((await post(PLAYLIST_URL)).json());
    await runFinished(first.playlistId);

    /* The first sync lists once. The next eight failures count on 01 and then
     * 02; the ninth switches to the last config and exhausts the pool. */
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await postSync(first.playlistId);
      await runFinished(first.playlistId);
    }

    await postSync(first.playlistId);
    const blocked = await runFinished(first.playlistId);

    expect(blocked.status).toBe(SyncRunStatus.Failed);
    expect(blocked.error).toBe(EGRESS_BLOCKED_REASON);
    expect(switched).toEqual(['02-ch', '03-us']);

    const playlist = PageSchema.parse((await get('/api/v1/playlists')).json())
      .items[0];
    expect(playlist?.syncStatus).toBe(PlaylistSyncStatus.Blocked);

    const rows = context.database.db
      .select({ fileStatus: tracks.fileStatus })
      .from(tracks)
      .all();
    expect(rows.map(row => row.fileStatus)).toEqual([
      TrackFileStatus.Pending,
      TrackFileStatus.Pending
    ]);
  });
});
