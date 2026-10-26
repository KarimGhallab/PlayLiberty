import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { EgressStatus } from '@playliberty/contracts';
import type {
  EgressAgentStatus,
  EgressProbeFacts,
  IEgressAgentClient
} from '@playliberty/youtube';
import {
  EgressConfigUnknownError,
  EgressSwitchFailedError
} from '@playliberty/youtube';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';

import { egressConfigs } from '../../../platform/database/schema.js';

const POOL: EgressAgentStatus = {
  pool: [
    { name: '01-fr', endpoint: '185.0.0.1:51820' },
    { name: '02-ch', endpoint: '185.0.0.2:51820' }
  ],
  active: '01-fr',
  loadedSince: '2026-10-23T10:00:00.000Z'
};

const PROBE_OK: EgressProbeFacts = {
  handshake: true,
  listing: true,
  exitIp: '185.0.0.9',
  reason: null,
  active: '01-fr'
};

const ADMIN = { 'remote-user': 'admin-user', 'x-playliberty-client': 'test' };
const USER = { 'remote-user': 'plain-user', 'x-playliberty-client': 'test' };

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

interface FakeAgent {
  client: IEgressAgentClient;
  calls: number;
  probes: string[];
  switches: string[];
  drains: number[];
  setPool(status: EgressAgentStatus): void;
  fail(next: boolean): void;
  setProbe(result: EgressProbeFacts | Error): void;
  setSwitchError(error: Error | null): void;
}

function fakeAgent(status: EgressAgentStatus = POOL): FakeAgent {
  let current = status;
  let failing = false;
  let probe: EgressProbeFacts | Error = PROBE_OK;
  let switchError: Error | null = null;
  const agent: FakeAgent = {
    calls: 0,
    probes: [],
    switches: [],
    drains: [],
    client: {
      status: async (): Promise<EgressAgentStatus> => {
        agent.calls += 1;

        if (failing) {
          throw new Error('The agent is down.');
        }

        return current;
      },
      probe: async (name?: string): Promise<EgressProbeFacts> => {
        agent.probes.push(name ?? '');

        if (probe instanceof Error) {
          throw probe;
        }

        return probe;
      },
      fetchTrack: async () => {
        throw new Error('the egress routes do not fetch a track');
      },
      switch: async (
        name: string,
        drainTimeoutMs: number
      ): Promise<EgressAgentStatus> => {
        agent.switches.push(name);
        agent.drains.push(drainTimeoutMs);

        if (switchError !== null) {
          throw switchError;
        }

        current = { ...current, active: name };

        return current;
      }
    },
    setPool: (next: EgressAgentStatus): void => {
      current = next;
    },
    fail: (next: boolean): void => {
      failing = next;
    },
    setProbe: (result: EgressProbeFacts | Error): void => {
      probe = result;
    },
    setSwitchError: (error: Error | null): void => {
      switchError = error;
    }
  };

  return agent;
}

async function adminApp(agent: FakeAgent): Promise<TestContext> {
  context = await createTestContext(
    { ADMIN_PANGOLIN_USER_IDS: 'admin-user' },
    { egressAgent: agent.client }
  );
  return context;
}

async function read(app: TestContext, headers = ADMIN) {
  return app.app.inject({ method: 'GET', url: '/api/v1/egress', headers });
}

describe('the egress read', () => {
  it('answers the pool with its active row, ordered, and nothing claimed healthy', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await read(app);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      agentReachable: true,
      configs: [
        {
          name: '01-fr',
          endpoint: '185.0.0.1:51820',
          status: EgressStatus.Unknown,
          active: true,
          lastAttemptAt: null,
          lastProbeAt: null,
          lastExitIp: null,
          lastError: null
        },
        {
          name: '02-ch',
          endpoint: '185.0.0.2:51820',
          status: EgressStatus.Unknown,
          active: false,
          lastAttemptAt: null,
          lastProbeAt: null,
          lastExitIp: null,
          lastError: null
        }
      ]
    });
  });

  it('keeps the last known pool when the agent cannot be reached', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    await read(app);
    agent.fail(true);

    const response = await read(app);

    expect(response.statusCode).toBe(200);
    expect(response.json().agentReachable).toBe(false);
    expect(response.json().configs).toHaveLength(2);
  });

  it('drops a config that has left the pool', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    agent.setPool({
      ...POOL,
      pool: [{ name: '01-fr', endpoint: '185.0.0.1:51820' }]
    });

    const response = await read(app);

    expect(
      response.json().configs.map((config: { name: string }) => config.name)
    ).toEqual(['01-fr']);
  });

  it('answers not-found to a non-admin and never asks the agent', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);
    const before = agent.calls;

    const response = await read(app, USER);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'not_found' });
    expect(agent.calls).toBe(before);
  });
});

describe('probing an exit', () => {
  it('records the exit address, the time and the ok state', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/probe',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(agent.probes).toEqual(['01-fr']);

    const row = response.json().configs[0];
    expect(row).toMatchObject({
      name: '01-fr',
      status: EgressStatus.Ok,
      active: true,
      lastExitIp: '185.0.0.9',
      lastError: null
    });
    expect(row.lastProbeAt).not.toBeNull();
  });

  it('records a classified failure and keeps the exit address it saw', async () => {
    const agent = fakeAgent();
    agent.setProbe({
      handshake: true,
      listing: false,
      exitIp: '185.0.0.9',
      reason: 'blocked',
      active: '01-fr'
    });
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/probe',
      headers: ADMIN
    });

    expect(response.json().configs[0]).toMatchObject({
      status: EgressStatus.Failed,
      lastError: 'blocked',
      lastExitIp: '185.0.0.9'
    });
  });

  it('moves the active marker when the probe switched to a standby', async () => {
    const agent = fakeAgent();
    agent.setProbe({ ...PROBE_OK, active: '02-ch' });
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/probe',
      headers: ADMIN
    });

    expect(
      response
        .json()
        .configs.map((config: { name: string; active: boolean }) => [
          config.name,
          config.active
        ])
    ).toEqual([
      ['01-fr', false],
      ['02-ch', true]
    ]);
  });

  it('reports an unreachable agent without changing a row', async () => {
    const agent = fakeAgent();
    agent.setProbe(new Error('The agent is down.'));
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/probe',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().agentReachable).toBe(false);
    expect(response.json().configs[0]).toMatchObject({
      status: EgressStatus.Unknown,
      lastProbeAt: null
    });
  });

  it('answers not-found for a config the agent does not have', async () => {
    const agent = fakeAgent();
    agent.setProbe(new EgressConfigUnknownError('03-missing'));
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/03-missing/probe',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'not_found' });
  });

  it('answers not-found to a non-admin and never probes', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/probe',
      headers: USER
    });

    expect(response.statusCode).toBe(404);
    expect(agent.probes).toEqual([]);
  });
});

describe('switching an exit by hand', () => {
  it('switches the pool and answers the moved active row', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/switch',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(agent.switches).toEqual(['02-ch']);
    expect(agent.drains).toEqual([60000]);
    expect(
      response
        .json()
        .configs.map((config: { name: string; active: boolean }) => [
          config.name,
          config.active
        ])
    ).toEqual([
      ['01-fr', false],
      ['02-ch', true]
    ]);
  });

  it('returns a failed config to unknown with a clean counter', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    app.database.db
      .update(egressConfigs)
      .set({
        status: EgressStatus.Failed,
        consecutiveFailures: 5,
        lastError: 'blocked'
      })
      .where(eq(egressConfigs.name, '02-ch'))
      .run();

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/switch',
      headers: ADMIN
    });

    const row = response
      .json()
      .configs.find((config: { name: string }) => config.name === '02-ch');

    expect(row).toMatchObject({
      status: EgressStatus.Unknown,
      lastError: null
    });
    expect(
      app.database.db
        .select()
        .from(egressConfigs)
        .where(eq(egressConfigs.name, '02-ch'))
        .get()?.consecutiveFailures
    ).toBe(0);
  });

  it('leaves the active row unchanged when the agent refuses the switch', async () => {
    const agent = fakeAgent();
    agent.setSwitchError(
      new EgressSwitchFailedError('No WireGuard interface is configured.')
    );
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/switch',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      code: 'egress_switch_failed',
      detail: 'No WireGuard interface is configured.'
    });
    expect(agent.switches).toEqual(['02-ch']);

    const active = app.database.db
      .select()
      .from(egressConfigs)
      .where(eq(egressConfigs.active, true))
      .get();
    expect(active?.name).toBe('01-fr');
  });

  it('answers not-found for a config the agent does not have', async () => {
    const agent = fakeAgent();
    agent.setSwitchError(new EgressConfigUnknownError('03-missing'));
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/03-missing/switch',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'not_found' });
  });

  it('reports an unreachable agent without moving the active row', async () => {
    const agent = fakeAgent();
    agent.setSwitchError(new Error('The agent is down.'));
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/switch',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().agentReachable).toBe(false);
    expect(
      response
        .json()
        .configs.find((config: { name: string }) => config.name === '01-fr')
        .active
    ).toBe(true);
  });

  it('answers not-found to a non-admin and never switches', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/switch',
      headers: USER
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'not_found' });
    expect(agent.switches).toEqual([]);
  });
});
