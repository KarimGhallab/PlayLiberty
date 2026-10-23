import { afterEach, describe, expect, it } from 'vitest';

import { EgressStatus } from '@playliberty/contracts';
import type {
  EgressAgentStatus,
  IEgressAgentClient
} from '@playliberty/youtube';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';

const POOL: EgressAgentStatus = {
  pool: [
    { name: '01-fr', endpoint: '185.0.0.1:51820' },
    { name: '02-ch', endpoint: '185.0.0.2:51820' }
  ],
  active: '01-fr',
  loadedSince: '2026-10-23T10:00:00.000Z'
};

const ADMIN = { 'remote-user': 'admin-user' };
const USER = { 'remote-user': 'plain-user' };

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

interface FakeAgent {
  client: IEgressAgentClient;
  calls: number;
  setPool(status: EgressAgentStatus): void;
  fail(next: boolean): void;
}

function fakeAgent(status: EgressAgentStatus = POOL): FakeAgent {
  let current = status;
  let failing = false;
  const agent: FakeAgent = {
    calls: 0,
    client: {
      status: async (): Promise<EgressAgentStatus> => {
        agent.calls += 1;

        if (failing) {
          throw new Error('The agent is down.');
        }

        return current;
      }
    },
    setPool: (next: EgressAgentStatus): void => {
      current = next;
    },
    fail: (next: boolean): void => {
      failing = next;
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

describe('the egress read', () => {
  it('answers the pool with its active row, ordered, and nothing claimed healthy', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    const response = await app.app.inject({
      method: 'GET',
      url: '/api/v1/egress',
      headers: ADMIN
    });

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
          lastError: null
        },
        {
          name: '02-ch',
          endpoint: '185.0.0.2:51820',
          status: EgressStatus.Unknown,
          active: false,
          lastAttemptAt: null,
          lastProbeAt: null,
          lastError: null
        }
      ]
    });
  });

  it('keeps the last known pool when the agent cannot be reached', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);

    await app.app.inject({
      method: 'GET',
      url: '/api/v1/egress',
      headers: ADMIN
    });

    agent.fail(true);

    const response = await app.app.inject({
      method: 'GET',
      url: '/api/v1/egress',
      headers: ADMIN
    });

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

    const response = await app.app.inject({
      method: 'GET',
      url: '/api/v1/egress',
      headers: ADMIN
    });

    expect(
      response.json().configs.map((config: { name: string }) => config.name)
    ).toEqual(['01-fr']);
  });

  it('answers not-found to a non-admin and never asks the agent', async () => {
    const agent = fakeAgent();
    const app = await adminApp(agent);
    const before = agent.calls;

    const response = await app.app.inject({
      method: 'GET',
      url: '/api/v1/egress',
      headers: USER
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'not_found' });
    expect(agent.calls).toBe(before);
  });
});
