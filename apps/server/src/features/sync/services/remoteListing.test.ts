import { afterEach, describe, expect, it } from 'vitest';

import {
  PlaylistSchema,
  SyncRunSchema,
  SyncRunStatus,
  createPageSchema
} from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import {
  EgressSourceUnavailableError,
  YoutubeSourceKind
} from '@playliberty/youtube';
import type { IEgressAgentClient, YoutubeSource } from '@playliberty/youtube';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import { TEST_SOURCE_ID } from '../../../app/testing/fakeYoutube.js';

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
      probe: async () => {
        throw new Error('the probe is not used by this test');
      },
      list: async (url: string): Promise<YoutubeSource> => {
        calls.push(url);
        return list(url);
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
});
