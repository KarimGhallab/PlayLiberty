import { afterEach, describe, expect, it } from 'vitest';

import { EgressStatus } from '@playliberty/contracts';
import {
  EgressCircuitOpenError,
  EgressSourceUnavailableError,
  YoutubeSourceKind,
  YoutubeVideoUnavailableError
} from '@playliberty/youtube';
import type {
  EgressAgentStatus,
  IEgressAgentClient,
  IYoutubeClient,
  YoutubeSource
} from '@playliberty/youtube';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';

import type { EgressConfigRow } from '../../../platform/database/schema.js';
import { egressConfigs } from '../../../platform/database/schema.js';
import { EgressPolicyClient } from './egressPolicy.js';

const POOL: EgressAgentStatus = {
  pool: [
    { name: '01-fr', endpoint: '185.0.0.1:51820' },
    { name: '02-ch', endpoint: '185.0.0.2:51820' },
    { name: '03-us', endpoint: '185.0.0.3:51820' }
  ],
  active: '01-fr',
  loadedSince: '2026-10-23T10:00:00.000Z'
};

const SOURCE: YoutubeSource = {
  kind: YoutubeSourceKind.Playlist,
  sourceId: 'PL1234567890abcdef',
  title: 'Evening Jazz',
  entries: []
};

interface Harness {
  policy: EgressPolicyClient;
  switched: string[];
  downloads: number;
  rows(): EgressConfigRow[];
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

async function harness(
  options: {
    list?: () => Promise<YoutubeSource>;
    limit?: number;
    cooldownMs?: number;
  } = {}
): Promise<Harness> {
  let status = POOL;
  const switched: string[] = [];
  const counts = { downloads: 0 };
  const agent: IEgressAgentClient = {
    status: async () => status,
    probe: async () => {
      throw new Error('the policy does not probe');
    },
    list: async () => {
      throw new Error('the policy talks to the inner client');
    },
    fetchTrack: async () => {
      throw new Error('the policy talks to the inner client');
    },
    switch: async (name: string): Promise<EgressAgentStatus> => {
      switched.push(name);
      status = { ...status, active: name };

      return status;
    }
  };
  const inner: IYoutubeClient = {
    listSource: async () => {
      if (options.list !== undefined) {
        return options.list();
      }

      throw new EgressSourceUnavailableError('blocked');
    },
    downloadTrack: async () => {
      counts.downloads += 1;
      throw new EgressSourceUnavailableError('blocked');
    },
    fetchThumbnail: async () => undefined
  };

  context = await createTestContext({}, { egressAgent: agent });
  const policy = new EgressPolicyClient(inner, {
    database: context.database,
    agent,
    failureLimit: options.limit ?? 5,
    switchCooldownMs: options.cooldownMs ?? 0,
    drainTimeoutMs: 60_000
  });

  return {
    policy,
    switched,
    get downloads(): number {
      return counts.downloads;
    },
    rows: (): EgressConfigRow[] =>
      context?.database.db.select().from(egressConfigs).all() ?? []
  };
}

function byName(rows: EgressConfigRow[]): Record<string, EgressConfigRow> {
  return Object.fromEntries(rows.map(row => [row.name, row]));
}

async function fail(policy: EgressPolicyClient, times: number): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await expect(
      policy.listSource('https://www.youtube.com/playlist?list=PL1')
    ).rejects.toBeInstanceOf(EgressSourceUnavailableError);
  }
}

describe('the egress rotation policy', () => {
  it('counts four failures, then rotates on the fifth and retries once', async () => {
    const h = await harness();

    await fail(h.policy, 4);
    expect(h.switched).toEqual([]);

    await fail(h.policy, 1);

    expect(h.switched).toEqual(['02-ch']);

    const rows = byName(h.rows());
    expect(rows['01-fr']).toMatchObject({
      status: EgressStatus.Failed,
      consecutiveFailures: 5,
      active: false
    });
    expect(rows['02-ch']).toMatchObject({
      status: EgressStatus.Failed,
      consecutiveFailures: 1,
      active: true
    });
  });

  it('resets the counter on a success and never switches', async () => {
    let calls = 0;
    const h = await harness({
      list: async () => {
        calls += 1;

        if (calls <= 4) {
          throw new EgressSourceUnavailableError('blocked');
        }

        return SOURCE;
      }
    });

    await fail(h.policy, 4);

    expect(
      await h.policy.listSource('https://www.youtube.com/playlist?list=PL1')
    ).toEqual(SOURCE);
    expect(h.switched).toEqual([]);

    const row = byName(h.rows())['01-fr'];
    expect(row).toMatchObject({
      status: EgressStatus.Ok,
      consecutiveFailures: 0
    });
    expect(row?.lastAttemptAt).not.toBeNull();
  });

  it('exhausts the pool into an open circuit after every config fails', async () => {
    const h = await harness();

    /* Five on the first, five on the second, then the retry on the last one is
     * already the whole pool failed. */
    await fail(h.policy, 8);

    await expect(
      h.policy.listSource('https://www.youtube.com/playlist?list=PL1')
    ).rejects.toBeInstanceOf(EgressCircuitOpenError);

    expect(h.switched).toEqual(['02-ch', '03-us']);

    const rows = byName(h.rows());
    expect(rows['01-fr']?.consecutiveFailures).toBe(5);
    expect(rows['02-ch']?.consecutiveFailures).toBe(5);
    expect(rows['03-us']?.consecutiveFailures).toBe(1);
    expect(h.rows().every(row => row.status === EgressStatus.Failed)).toBe(
      true
    );
  });

  it('keeps a burst on the new config while the cooldown runs', async () => {
    const h = await harness({ cooldownMs: 60_000 });

    await fail(h.policy, 5);
    expect(h.switched).toEqual(['02-ch']);

    await fail(h.policy, 5);

    expect(h.switched).toEqual(['02-ch']);
    expect(byName(h.rows())['02-ch']).toMatchObject({
      active: true,
      status: EgressStatus.Failed
    });
  });

  it('does not ask the exit for a download while the circuit is open', async () => {
    const h = await harness();

    await fail(h.policy, 8);
    await expect(
      h.policy.listSource('https://www.youtube.com/playlist?list=PL1')
    ).rejects.toBeInstanceOf(EgressCircuitOpenError);

    await expect(
      h.policy.downloadTrack({
        videoId: 'jNQXAC9IVRw',
        outputPath: '/tmp/stored.m4a',
        tempDir: '/tmp',
        skipNonMusic: false
      })
    ).rejects.toBeInstanceOf(EgressCircuitOpenError);

    expect(h.downloads).toBe(0);
  });

  it('never counts a gone video as an exit failure', async () => {
    const h = await harness({
      list: async () => {
        throw new YoutubeVideoUnavailableError('jNQXAC9IVRw');
      }
    });

    await expect(
      h.policy.listSource('https://www.youtube.com/playlist?list=PL1')
    ).rejects.toBeInstanceOf(YoutubeVideoUnavailableError);

    expect(h.switched).toEqual([]);
    expect(byName(h.rows())['01-fr']).toMatchObject({
      consecutiveFailures: 0,
      status: EgressStatus.Unknown
    });
  });

  it('never counts an unavailable source as an exit failure', async () => {
    const h = await harness({
      list: async () => {
        throw new EgressSourceUnavailableError('unavailable');
      }
    });

    await expect(
      h.policy.listSource('https://www.youtube.com/playlist?list=PL1')
    ).rejects.toBeInstanceOf(EgressSourceUnavailableError);

    expect(h.switched).toEqual([]);
    expect(byName(h.rows())['01-fr']?.consecutiveFailures).toBe(0);
  });
});
