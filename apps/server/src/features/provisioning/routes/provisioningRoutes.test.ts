import { createHash } from 'node:crypto';

import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { ProblemCode, UserRole } from '@playliberty/contracts';

import type {
  IPangolinClient,
  MintResourceAccessTokenInput
} from '../../../shared/pangolin.js';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import type { LogLine } from '../../../app/testing/recordingLogger.js';
import { recordingLogger } from '../../../app/testing/recordingLogger.js';

import {
  accessTokens,
  accounts,
  refreshFamilies,
  refreshTokens
} from '../../../platform/database/schema.js';
import { PangolinError } from '../pangolin/PangolinClient.js';
import { challengeFor } from '../service/ProvisioningService.js';

/* The RFC 7636 example: the verifier and its S256 challenge. */
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const REDIRECT_URI = 'dev.playliberty.app://provision';
const STATE = 'state-0123456789abcdef';

type Injected = Awaited<ReturnType<TestContext['app']['inject']>>;

class FakePangolin implements IPangolinClient {
  readonly calls: MintResourceAccessTokenInput[] = [];
  fail = false;

  async mintResourceAccessToken(
    input: MintResourceAccessTokenInput
  ): Promise<{ id: string; secret: string }> {
    this.calls.push(input);

    if (this.fail) {
      throw new PangolinError('Pangolin is down');
    }

    return { id: 'token-id', secret: 'token-secret' };
  }
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

async function start(
  env: NodeJS.ProcessEnv = {},
  pangolin: IPangolinClient = new FakePangolin(),
  now?: () => number
): Promise<TestContext> {
  context = await createTestContext(
    { MOBILE_REDIRECT_URIS: REDIRECT_URI, ...env },
    { pangolin, now }
  );

  return context;
}

async function startWithLogger(
  logger: FastifyBaseLogger,
  pangolin: IPangolinClient = new FakePangolin(),
  now?: () => number
): Promise<TestContext> {
  context = await createTestContext(
    { MOBILE_REDIRECT_URIS: REDIRECT_URI },
    { pangolin, loggerInstance: logger, now }
  );

  return context;
}

function provision(
  testContext: TestContext,
  options: {
    pangolinUserId?: string;
    redirectUri?: string;
    challenge?: string;
    assertion?: string;
  } = {}
): Promise<Injected> {
  const query = new URLSearchParams({
    code_challenge: options.challenge ?? CHALLENGE,
    code_challenge_method: 'S256',
    redirect_uri: options.redirectUri ?? REDIRECT_URI,
    state: STATE
  });

  return testContext.app.inject({
    method: 'GET',
    url: `/provision?${query.toString()}`,
    headers: {
      'remote-user': options.pangolinUserId ?? 'p-alice',
      'remote-name': 'Alice',
      ...(options.assertion === undefined
        ? {}
        : { 'x-playliberty-edge': options.assertion })
    }
  });
}

function exchange(
  testContext: TestContext,
  body: unknown,
  assertion?: string
): Promise<Injected> {
  return testContext.app.inject({
    method: 'POST',
    url: '/auth/exchange',
    headers: {
      'content-type': 'application/json',
      'x-playliberty-client': 'mobile',
      ...(assertion === undefined ? {} : { 'x-playliberty-edge': assertion })
    },
    payload: JSON.stringify(body)
  });
}

function exchangeFrom(
  testContext: TestContext,
  body: unknown,
  remoteAddress: string,
  forwardedFor: string
): Promise<Injected> {
  return testContext.app.inject({
    method: 'POST',
    url: '/auth/exchange',
    remoteAddress,
    headers: {
      'content-type': 'application/json',
      'x-playliberty-client': 'mobile',
      'x-forwarded-for': forwardedFor
    },
    payload: JSON.stringify(body)
  });
}

function mintedCode(response: Injected): { code: string; state: string } {
  const url = new URL(String(response.headers['location']));

  return {
    code: url.searchParams.get('code') ?? '',
    state: url.searchParams.get('state') ?? ''
  };
}

function accountRows(testContext: TestContext) {
  return testContext.database.db.select().from(accounts).all();
}

function familyRows(testContext: TestContext) {
  return testContext.database.db.select().from(refreshFamilies).all();
}

function refreshRows(testContext: TestContext) {
  return testContext.database.db.select().from(refreshTokens).all();
}

function accessRows(testContext: TestContext) {
  return testContext.database.db.select().from(accessTokens).all();
}

function exchangeLines(lines: LogLine[]): LogLine[] {
  return lines.filter(line => line.action === 'provisioning_exchange');
}

function expectNoSecrets(lines: LogLine[], code: string): void {
  /* The recording logger keeps Fastify's raw request objects; the guarantee is
   * about the lines the exchange writes. */
  const logged = JSON.stringify(
    lines.filter(
      line =>
        line.action === 'provisioning_exchange' ||
        line.message === 'the token could not be minted'
    )
  );

  expect(logged).not.toContain(code);
  expect(logged).not.toContain(VERIFIER);
  expect(logged).not.toContain('token-id');
  expect(logged).not.toContain('token-secret');
}

describe('GET /provision', () => {
  it('redirects to the app with a code and the same state', async () => {
    const testContext = await start();

    const response = await provision(testContext);
    const { code, state } = mintedCode(response);

    expect(response.statusCode).toBe(302);
    expect(code.length).toBeGreaterThan(20);
    expect(state).toBe(STATE);
  });

  it('mints a code without creating an account', async () => {
    const testContext = await start();

    const response = await provision(testContext);

    expect(response.statusCode).toBe(302);
    expect(accountRows(testContext)).toEqual([]);
  });

  it('does not refresh an existing account', async () => {
    const testContext = await start();
    testContext.database.db
      .insert(accounts)
      .values({
        id: 'account-1',
        pangolinUserId: 'p-alice',
        displayName: 'Old name',
        email: 'old@example.com',
        avatarUrl: null,
        role: UserRole.User,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      })
      .run();

    await provision(testContext);

    expect(accountRows(testContext)).toEqual([
      expect.objectContaining({
        displayName: 'Old name',
        email: 'old@example.com',
        role: UserRole.User,
        updatedAt: '2026-01-01T00:00:00.000Z'
      })
    ]);
  });

  it('refuses a callback that is not on the allowlist', async () => {
    const testContext = await start();

    const response = await provision(testContext, {
      redirectUri: 'dev.playliberty.app://elsewhere'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
    expect(accountRows(testContext)).toEqual([]);
  });

  it('answers 503 without creating an account when no callback is configured', async () => {
    const testContext = await start({ MOBILE_REDIRECT_URIS: '' });

    const response = await provision(testContext);

    expect(response.statusCode).toBe(503);
    expect(accountRows(testContext)).toEqual([]);
  });

  it('refuses a caller the edge has not authenticated', async () => {
    const testContext = await start();

    const query = new URLSearchParams({
      code_challenge: CHALLENGE,
      code_challenge_method: 'S256',
      redirect_uri: REDIRECT_URI,
      state: STATE
    });
    const response = await testContext.app.inject({
      method: 'GET',
      url: `/provision?${query.toString()}`
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /auth/exchange', () => {
  it('trades a code and its verifier for a token pair bound to the user', async () => {
    const nowMs = Date.parse('2026-11-01T12:00:00.000Z');
    const pangolin = new FakePangolin();
    const testContext = await start(
      {
        MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS: '3600',
        MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS: '86400'
      },
      pangolin,
      () => nowMs
    );
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    const body = response.json();
    const family = familyRows(testContext)[0];
    const refresh = refreshRows(testContext)[0];

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      access: {
        id: 'token-id',
        secret: 'token-secret',
        expires_at: '2026-11-01T13:00:00.000Z',
        expires_in: 3600
      },
      refresh: {
        expires_at: '2026-11-02T12:00:00.000Z',
        expires_in: 86400
      }
    });
    expect(body.refresh.token.length).toBeGreaterThan(40);
    expect(pangolin.calls).toHaveLength(1);
    expect(pangolin.calls[0]?.pangolinUserId).toBe('p-alice');
    expect(pangolin.calls[0]?.validForSeconds).toBe(3600);
    expect(pangolin.calls[0]?.title).toBe(
      `PlayLiberty mobile ${String(family?.id).slice(0, 8)}`
    );
    expect(accountRows(testContext)).toEqual([]);
    expect(family).toMatchObject({
      pangolinUserId: 'p-alice',
      createdAt: '2026-11-01T12:00:00.000Z',
      lastUsedAt: '2026-11-01T12:00:00.000Z',
      expiresAt: '2027-11-01T12:00:00.000Z',
      revokedAt: null
    });
    expect(refresh?.tokenHash).toBe(
      createHash('sha256').update(body.refresh.token).digest('hex')
    );
    expect(refresh?.tokenHash).not.toBe(body.refresh.token);
    expect(refresh?.consumedAt).toBeNull();
    expect(accessRows(testContext)).toEqual([
      expect.objectContaining({
        pangolinTokenId: 'token-id',
        familyId: family?.id,
        expiresAt: '2026-11-01T13:00:00.000Z',
        revokedAt: null
      })
    ]);
  });

  it('uses the default lifetimes when none are configured', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({}, pangolin);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(200);
    expect(pangolin.calls[0]?.validForSeconds).toBe(12 * 60 * 60);
    expect(response.json().access.expires_in).toBe(12 * 60 * 60);
    expect(response.json().refresh.expires_in).toBe(180 * 24 * 60 * 60);
  });

  it('refuses a wrong verifier and burns the code', async () => {
    const testContext = await start();
    const { code } = mintedCode(await provision(testContext));

    const wrong = await exchange(testContext, {
      code,
      code_verifier: `${VERIFIER}x`,
      redirect_uri: REDIRECT_URI
    });
    const retry = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(wrong.statusCode).toBe(400);
    expect(wrong.json().code).toBe(ProblemCode.InvalidGrant);
    expect(retry.statusCode).toBe(400);
  });

  it('refuses a reused code', async () => {
    const testContext = await start();
    const { code } = mintedCode(await provision(testContext));
    const body = { code, code_verifier: VERIFIER, redirect_uri: REDIRECT_URI };

    const first = await exchange(testContext, body);
    const second = await exchange(testContext, body);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(400);
  });

  it('refuses an expired code', async () => {
    let now = 1_000_000;
    const testContext = await start({}, new FakePangolin(), () => now);
    const { code } = mintedCode(await provision(testContext));

    now += 60_001;
    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
  });

  it('refuses a callback that differs from the one the code was minted for', async () => {
    const testContext = await start();
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: 'dev.playliberty.app://other'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
  });

  it('answers 503 when the instance has no Integration API', async () => {
    context = await createTestContext({ MOBILE_REDIRECT_URIS: REDIRECT_URI });
    const response = await exchange(context, {
      code: 'any-code',
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe(ProblemCode.ProvisioningUnavailable);
  });

  it('answers 502 when Pangolin refuses, after burning the code', async () => {
    const pangolin = new FakePangolin();
    pangolin.fail = true;
    const testContext = await start({}, pangolin);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().code).toBe(ProblemCode.ProvisioningFailed);
    expect(familyRows(testContext)).toEqual([]);
    expect(refreshRows(testContext)).toEqual([]);
    expect(accessRows(testContext)).toEqual([]);
  });

  it('needs the edge assertion but no identity', async () => {
    const testContext = await start({ EDGE_ASSERTION: 'edge-secret' });
    const { code } = mintedCode(
      await provision(testContext, { assertion: 'edge-secret' })
    );

    const withoutAssertion = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });
    const withAssertion = await exchange(
      testContext,
      { code, code_verifier: VERIFIER, redirect_uri: REDIRECT_URI },
      'edge-secret'
    );

    expect(withoutAssertion.statusCode).toBe(401);
    expect(withAssertion.statusCode).toBe(200);
  });

  it('keeps the exchange exempt with a query string', async () => {
    const testContext = await start();
    const { code } = mintedCode(await provision(testContext));

    const response = await testContext.app.inject({
      method: 'POST',
      url: '/auth/exchange?source=app',
      headers: {
        'content-type': 'application/json',
        'x-playliberty-client': 'mobile'
      },
      payload: JSON.stringify({
        code,
        code_verifier: VERIFIER,
        redirect_uri: REDIRECT_URI
      })
    });

    expect(response.statusCode).toBe(200);
  });

  it('rate limits the eleventh attempt from one caller', async () => {
    const testContext = await start();
    const body = {
      code: 'not-a-code',
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    };

    const statuses: number[] = [];

    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await exchange(testContext, body);
      statuses.push(response.statusCode);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses[10]).toBe(429);
  });

  it('counts two callers behind the proxy separately', async () => {
    const testContext = await start();
    const body = {
      code: 'not-a-code',
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await exchangeFrom(
        testContext,
        body,
        '127.0.0.1',
        '203.0.113.1'
      );

      expect(response.statusCode).toBe(400);
    }

    const spent = await exchangeFrom(
      testContext,
      body,
      '127.0.0.1',
      '203.0.113.1'
    );
    const other = await exchangeFrom(
      testContext,
      body,
      '127.0.0.1',
      '203.0.113.2'
    );

    expect(spent.statusCode).toBe(429);
    expect(other.statusCode).toBe(400);
  });

  it('ignores a forwarded header from a peer that is not the proxy', async () => {
    const testContext = await start();
    const body = {
      code: 'not-a-code',
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await exchangeFrom(
        testContext,
        body,
        '198.51.100.5',
        `203.0.113.${attempt}`
      );

      expect(response.statusCode).toBe(400);
    }

    const response = await exchangeFrom(
      testContext,
      body,
      '198.51.100.5',
      '203.0.113.99'
    );

    expect(response.statusCode).toBe(429);
  });
});

describe('the exchange audit', () => {
  it('records an allowed exchange with the Pangolin user id', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await startWithLogger(logger);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(200);
    expect(exchangeLines(lines)[0]).toMatchObject({
      audit: true,
      outcome: 'allowed',
      account: 'p-alice'
    });
    expectNoSecrets(lines, code);
  });

  it('records a wrong verifier with the user id', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await startWithLogger(logger);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: `${VERIFIER}x`,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(400);
    expect(exchangeLines(lines)[0]).toMatchObject({
      outcome: 'refused',
      reason: 'verifier_mismatch',
      account: 'p-alice'
    });
    expectNoSecrets(lines, code);
  });

  it('records a reused code without a user id', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await startWithLogger(logger);
    const { code } = mintedCode(await provision(testContext));
    const body = {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    };

    await exchange(testContext, body);
    const response = await exchange(testContext, body);

    expect(response.statusCode).toBe(400);
    expect(exchangeLines(lines)[1]).toMatchObject({
      outcome: 'refused',
      reason: 'code_missing_or_used'
    });
    expect(exchangeLines(lines)[1]?.account).toBeUndefined();
    expectNoSecrets(lines, code);
  });

  it('records an expired code with the user id', async () => {
    const { logger, lines } = recordingLogger();
    let now = 1_000_000;
    const testContext = await startWithLogger(
      logger,
      new FakePangolin(),
      () => now
    );
    const { code } = mintedCode(await provision(testContext));
    now += 60_001;

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(400);
    expect(exchangeLines(lines)[0]).toMatchObject({
      outcome: 'refused',
      reason: 'code_expired',
      account: 'p-alice'
    });
    expectNoSecrets(lines, code);
  });

  it('records a redirect mismatch with the user id', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await startWithLogger(logger);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: 'dev.playliberty.app://other'
    });

    expect(response.statusCode).toBe(400);
    expect(exchangeLines(lines)[0]).toMatchObject({
      outcome: 'refused',
      reason: 'redirect_mismatch',
      account: 'p-alice'
    });
    expectNoSecrets(lines, code);
  });

  it('records a rate-limit refusal without a user id', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await startWithLogger(logger);
    const body = {
      code: 'not-a-code',
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    };

    for (let attempt = 0; attempt < 11; attempt += 1) {
      await exchange(testContext, body);
    }

    const refused = lines.find(line => line.reason === 'rate_limited');

    expect(refused).toMatchObject({ outcome: 'refused' });
    expect(refused?.account).toBeUndefined();
    expectNoSecrets(lines, 'not-a-code');
  });

  it('records a token-mint failure and keeps the error line', async () => {
    const { logger, lines } = recordingLogger();
    const pangolin = new FakePangolin();
    pangolin.fail = true;
    const testContext = await startWithLogger(logger, pangolin);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(502);
    expect(exchangeLines(lines)[0]).toMatchObject({
      outcome: 'refused',
      reason: 'token_mint_failed',
      account: 'p-alice'
    });
    expect(
      lines.find(line => line.message === 'the token could not be minted')
    ).toMatchObject({ level: 'error' });
    expectNoSecrets(lines, code);
  });
});

describe('challengeFor', () => {
  it('matches the RFC 7636 S256 vector', () => {
    expect(challengeFor(VERIFIER)).toBe(CHALLENGE);
  });
});
