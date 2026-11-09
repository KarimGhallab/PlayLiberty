import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { ProblemCode } from '@playliberty/contracts';

import type {
  IPangolinClient,
  MintResourceAccessTokenInput
} from '../../../../shared/pangolin.js';

import type { TestContext } from '../../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../../app/testing/createTestContext.js';
import { recordingLogger } from '../../../../app/testing/recordingLogger.js';

import {
  accessTokens,
  refreshFamilies
} from '../../../../platform/database/schema.js';
import { revokePending } from '../../services/revokePending.js';

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const REDIRECT_URI = 'dev.playliberty.app://provision';
const STATE = 'state-0123456789abcdef';

class FakePangolin implements IPangolinClient {
  readonly calls: MintResourceAccessTokenInput[] = [];
  readonly deleted: string[] = [];
  failDelete = false;

  async mintResourceAccessToken(
    input: MintResourceAccessTokenInput
  ): Promise<{ id: string; secret: string }> {
    this.calls.push(input);

    return { id: 'token-1', secret: 'secret-1' };
  }

  async deleteResourceAccessToken(tokenId: string): Promise<void> {
    this.deleted.push(tokenId);

    if (this.failDelete) {
      throw new Error('Pangolin is down');
    }
  }
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

async function start(
  pangolin: IPangolinClient = new FakePangolin(),
  logger?: FastifyBaseLogger
): Promise<TestContext> {
  context = await createTestContext(
    { MOBILE_REDIRECT_URIS: REDIRECT_URI },
    { pangolin, loggerInstance: logger }
  );

  return context;
}

async function issuePair(testContext: TestContext): Promise<{
  access: { id: string; secret: string };
  refresh: { token: string };
}> {
  const query = new URLSearchParams({
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    redirect_uri: REDIRECT_URI,
    state: STATE
  });
  const provisioned = await testContext.app.inject({
    method: 'GET',
    url: `/provision?${query.toString()}`,
    headers: { 'remote-user': 'p-alice', 'remote-name': 'Alice' }
  });
  const location = new URL(String(provisioned.headers['location']));
  const exchanged = await testContext.app.inject({
    method: 'POST',
    url: '/auth/exchange',
    headers: {
      'content-type': 'application/json',
      'x-playliberty-client': 'mobile'
    },
    payload: JSON.stringify({
      code: location.searchParams.get('code'),
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    })
  });

  return exchanged.json();
}

function revoke(testContext: TestContext, body: unknown, user = 'p-alice') {
  return testContext.app.inject({
    method: 'POST',
    url: '/api/v1/session/revoke',
    headers: {
      'content-type': 'application/json',
      'remote-user': user,
      'x-playliberty-client': 'mobile'
    },
    payload: JSON.stringify(body)
  });
}

function familyRow(testContext: TestContext) {
  return testContext.database.db.select().from(refreshFamilies).get();
}

function accessRows(testContext: TestContext) {
  return testContext.database.db.select().from(accessTokens).all();
}

describe('POST /api/v1/session/revoke', () => {
  it('revokes the family and its access tokens at the edge', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start(pangolin);
    const pair = await issuePair(testContext);

    const response = await revoke(testContext, {
      refresh_token: pair.refresh.token
    });

    expect(response.statusCode).toBe(204);
    expect(familyRow(testContext)?.revokedAt).not.toBeNull();
    expect(accessRows(testContext)[0]?.revokedAt).not.toBeNull();
    expect(pangolin.deleted).toEqual([pair.access.id]);
  });

  it('answers a failure and records it when the edge delete fails', async () => {
    const { logger, lines } = recordingLogger();
    const pangolin = new FakePangolin();
    const testContext = await start(pangolin, logger);
    const pair = await issuePair(testContext);
    const family = familyRow(testContext);

    pangolin.failDelete = true;
    const response = await revoke(testContext, {
      refresh_token: pair.refresh.token
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().code).toBe(ProblemCode.ProvisioningFailed);
    expect(familyRow(testContext)?.revokedAt).not.toBeNull();
    expect(accessRows(testContext)[0]?.revokedAt).not.toBeNull();
    expect(lines).toContainEqual(
      expect.objectContaining({
        action: 'revocation_failed',
        outcome: 'refused',
        family: family?.id,
        token: pair.access.id
      })
    );
    expect(
      lines.filter(
        line => line.action === 'session_revoke' && line.outcome === 'allowed'
      )
    ).toEqual([]);
  });

  it('retries a failed edge delete without a new sign-in', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start(pangolin);
    const pair = await issuePair(testContext);

    pangolin.failDelete = true;
    const failed = await revoke(testContext, {
      refresh_token: pair.refresh.token
    });

    expect(failed.statusCode).toBe(502);
    expect(accessRows(testContext)[0]?.edgeDeletedAt).toBeNull();

    pangolin.failDelete = false;
    const retried = await revokePending({
      database: testContext.database,
      pangolin,
      logger: recordingLogger().logger,
      now: () => Date.now()
    });

    expect(retried).toEqual({ retried: 1, failed: 0 });
    expect(accessRows(testContext)[0]?.edgeDeletedAt).not.toBeNull();
    expect(pangolin.deleted).toEqual([pair.access.id, pair.access.id]);
  });

  it('answers a no-op for another account and leaves the family alone', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start(pangolin);
    const pair = await issuePair(testContext);

    const response = await revoke(
      testContext,
      { refresh_token: pair.refresh.token },
      'p-bob'
    );

    expect(response.statusCode).toBe(204);
    expect(familyRow(testContext)?.revokedAt).toBeNull();
    expect(accessRows(testContext)[0]?.revokedAt).toBeNull();
    expect(pangolin.deleted).toEqual([]);
  });

  it('answers 204 for an unknown token and for a repeated revoke', async () => {
    const testContext = await start();

    const unknown = await revoke(testContext, { refresh_token: 'unknown' });
    expect(unknown.statusCode).toBe(204);

    const pair = await issuePair(testContext);
    const first = await revoke(testContext, {
      refresh_token: pair.refresh.token
    });
    const second = await revoke(testContext, {
      refresh_token: pair.refresh.token
    });

    expect(first.statusCode).toBe(204);
    expect(second.statusCode).toBe(204);
  });

  it('refuses a body without a refresh token', async () => {
    const testContext = await start();

    const response = await revoke(testContext, {});

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.ValidationFailed);
  });

  it('refuses a caller the edge has not authenticated', async () => {
    const testContext = await start();

    const response = await testContext.app.inject({
      method: 'POST',
      url: '/api/v1/session/revoke',
      headers: {
        'content-type': 'application/json',
        'x-playliberty-client': 'mobile'
      },
      payload: JSON.stringify({ refresh_token: 'unknown' })
    });

    expect(response.statusCode).toBe(401);
  });

  it('records the outcome without revealing it to the caller', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await start(new FakePangolin(), logger);
    const pair = await issuePair(testContext);

    await revoke(testContext, { refresh_token: pair.refresh.token });
    await revoke(testContext, { refresh_token: 'unknown' });

    const revokeLines = lines.filter(line => line.action === 'session_revoke');

    expect(revokeLines[0]).toMatchObject({ outcome: 'allowed' });
    expect(revokeLines[0]?.account).toBeDefined();
    expect(revokeLines[1]).toMatchObject({
      outcome: 'allowed',
      reason: 'nothing_to_revoke'
    });
    expect(JSON.stringify(revokeLines)).not.toContain(pair.refresh.token);
  });
});
