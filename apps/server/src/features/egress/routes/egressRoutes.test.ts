import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { EgressStatus } from '@playliberty/contracts';
import type {
  EgressAgentStatus,
  EgressCheckFacts,
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

const CHECK_OK: EgressCheckFacts = {
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
  checks: string[];
  setPool(status: EgressAgentStatus): void;
  fail(next: boolean): void;
  setCheck(result: EgressCheckFacts | Error): void;
  setSwitchError(error: Error | null): void;
  setCheckError(error: Error | null): void;
}

function fakeAgent(status: EgressAgentStatus = POOL): FakeAgent {
  let current = status;
  let failing = false;
  let check: EgressCheckFacts | Error = CHECK_OK;
  let switchError: Error | null = null;
  let checkError: Error | null = null;
  const agent: FakeAgent = {
    calls: 0,
    checks: [],
    client: {
      status: async (): Promise<EgressAgentStatus> => {
        agent.calls += 1;

        if (failing) {
          throw new Error('The agent is down.');
        }

        return current;
      },
      switch: async (name?: string): Promise<EgressCheckFacts> => {
        agent.checks.push(name ?? '');

        if (switchError !== null) {
          throw switchError;
        }

        if (check instanceof Error) {
          throw check;
        }

        return check;
      },
      check: async (): Promise<EgressCheckFacts> => {
        agent.checks.push('');

        if (checkError !== null) {
          throw checkError;
        }

        if (check instanceof Error) {
          throw check;
        }

        return check;
      },
      applyConfig: async (): Promise<EgressAgentStatus> => current,
      list: async () => {
        throw new Error('the egress routes do not list');
      },
      fetchTrack: async () => {
        throw new Error('the egress routes do not fetch a track');
      }
    },
    setPool: (next: EgressAgentStatus): void => {
      current = next;
    },
    fail: (next: boolean): void => {
      failing = next;
    },
    setCheck: (result: EgressCheckFacts | Error): void => {
      check = result;
    },
    setSwitchError: (error: Error | null): void => {
      switchError = error;
    },
    setCheckError: (error: Error | null): void => {
      checkError = error;
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
          lastCheckAt: null,
          lastExitIp: null,
          lastError: null
        },
        {
          name: '02-ch',
          endpoint: '185.0.0.2:51820',
          status: EgressStatus.Unknown,
          active: false,
          lastAttemptAt: null,
          lastCheckAt: null,
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

describe('switching an exit', () => {
  it('records the exit address, the time and the ok state', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/switch',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(agent.checks).toEqual(['01-fr']);

    const row = response.json().configs[0];
    expect(row).toMatchObject({
      name: '01-fr',
      status: EgressStatus.Ok,
      active: true,
      lastExitIp: '185.0.0.9',
      lastError: null
    });
    expect(row.lastCheckAt).not.toBeNull();
  });

  it('records a classified failure and keeps the exit address it saw', async () => {
    const agent = fakeAgent();
    agent.setCheck({
      handshake: true,
      listing: false,
      exitIp: '185.0.0.9',
      reason: 'blocked',
      active: '01-fr'
    });
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/switch',
      headers: ADMIN
    });

    expect(response.json().configs[0]).toMatchObject({
      status: EgressStatus.Failed,
      lastError: 'blocked',
      lastExitIp: '185.0.0.9'
    });
  });

  it('moves the active marker when the switch changes the active row', async () => {
    const agent = fakeAgent();
    agent.setCheck({ ...CHECK_OK, active: '02-ch' });
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/02-ch/switch',
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
    agent.setSwitchError(new Error('The agent is down.'));
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/switch',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().agentReachable).toBe(false);
    expect(response.json().configs[0]).toMatchObject({
      status: EgressStatus.Unknown,
      lastCheckAt: null
    });
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

  it('carries the agent sentence when the switch is refused', async () => {
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
    expect(agent.checks).toEqual(['02-ch']);

    const active = app.database.db
      .select()
      .from(egressConfigs)
      .where(eq(egressConfigs.active, true))
      .get();
    expect(active?.name).toBe('01-fr');
  });

  it('answers not-found to a non-admin and never switches', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/01-fr/switch',
      headers: USER
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'not_found' });
    expect(agent.checks).toEqual([]);
  });
});

describe('checking the active exit', () => {
  it('records the exit address and leaves the marker alone', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/check',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(agent.checks).toEqual(['']);
    expect(response.json().configs[0]).toMatchObject({
      name: '01-fr',
      status: EgressStatus.Ok,
      active: true,
      lastExitIp: '185.0.0.9'
    });
    expect(response.json().configs[0].lastCheckAt).not.toBeNull();
    expect(response.json().configs[1].active).toBe(false);
  });

  it('reports an unreachable agent without changing a row', async () => {
    const agent = fakeAgent();
    agent.setCheckError(new Error('The agent is down.'));
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/check',
      headers: ADMIN
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().agentReachable).toBe(false);
    expect(response.json().configs[0]).toMatchObject({
      status: EgressStatus.Unknown,
      lastCheckAt: null
    });
  });

  it('answers not-found to a non-admin and never checks', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/egress/check',
      headers: USER
    });

    expect(response.statusCode).toBe(404);
    expect(agent.checks).toEqual([]);
  });
});
