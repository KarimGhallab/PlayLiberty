import { createHash } from 'node:crypto';

import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import type { MobileToken } from '@playliberty/contracts';
import { ProblemCode, UserRole } from '@playliberty/contracts';

import type {
  IPangolinClient,
  MintResourceAccessTokenInput
} from '../../../../shared/pangolin.js';

import type { TestContext } from '../../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../../app/testing/createTestContext.js';
import type { LogLine } from '../../../../app/testing/recordingLogger.js';
import { recordingLogger } from '../../../../app/testing/recordingLogger.js';

import {
  accessTokens,
  accounts,
  refreshFamilies,
  refreshTokens
} from '../../../../platform/database/schema.js';
import { PangolinError } from '../../pangolin/PangolinClient.js';
import { challengeFor } from '../../services/ProvisioningService.js';
import { revokePending } from '../../services/revokePending.js';

/* The RFC 7636 example: the verifier and its S256 challenge. */
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const REDIRECT_URI = 'dev.playliberty.app://provision';
const STATE = 'state-0123456789abcdef';
const NOW = Date.parse('2026-11-01T12:00:00.000Z');

/* Short lives keep expiry reachable in the suite; the config's own defaults are
 * proven there, not here. */
const LIFETIMES = {
  MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS: '3600',
  MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS: '86400',
  MOBILE_FAMILY_LIFETIME_SECONDS: '604800'
};

type Injected = Awaited<ReturnType<TestContext['app']['inject']>>;

class FakePangolin implements IPangolinClient {
  readonly calls: MintResourceAccessTokenInput[] = [];
  readonly deleted: string[] = [];
  fail = false;
  failDelete = false;
  holdMint = false;
  private readonly _mintHeld = Promise.withResolvers<void>();
  private readonly _mintWaiters: (() => void)[] = [];

  waitForMintHeld(): Promise<void> {
    return this._mintHeld.promise;
  }

  async mintResourceAccessToken(
    input: MintResourceAccessTokenInput
  ): Promise<{ id: string; secret: string }> {
    this.calls.push(input);

    if (this.fail) {
      throw new PangolinError('Pangolin is down');
    }

    if (this.holdMint) {
      this._mintHeld.resolve();
      const held = Promise.withResolvers<void>();
      this._mintWaiters.push(held.resolve);
      await held.promise;
    }

    const count = this.calls.length;

    return { id: `token-${count}`, secret: `secret-${count}` };
  }

  releaseMint(): void {
    for (const resolve of this._mintWaiters.splice(0)) {
      resolve();
    }
  }

  async deleteResourceAccessToken(tokenId: string): Promise<void> {
    this.deleted.push(tokenId);

    if (this.failDelete) {
      throw new PangolinError('Pangolin is down');
    }
  }
}

let context: TestContext | undefined;
let now = NOW;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
  now = NOW;
});

interface StartOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly pangolin?: IPangolinClient;
  readonly logger?: FastifyBaseLogger;
  readonly now?: () => number;
}

async function start(options: StartOptions = {}): Promise<TestContext> {
  context = await createTestContext(
    { MOBILE_REDIRECT_URIS: REDIRECT_URI, ...LIFETIMES, ...options.env },
    {
      pangolin: options.pangolin ?? new FakePangolin(),
      loggerInstance: options.logger,
      now: options.now ?? (() => now)
    }
  );

  return context;
}

function provision(
  testContext: TestContext,
  options: {
    pangolinUserId?: string;
    pangolinUserRecordId?: string;
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
      ...(options.pangolinUserRecordId === undefined
        ? {}
        : { 'remote-user-id': options.pangolinUserRecordId }),
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

function refresh(
  testContext: TestContext,
  body: unknown,
  options: { forwardedFor?: string; assertion?: string } = {}
): Promise<Injected> {
  return testContext.app.inject({
    method: 'POST',
    url: '/auth/refresh',
    remoteAddress: '127.0.0.1',
    headers: {
      'content-type': 'application/json',
      'x-playliberty-client': 'mobile',
      ...(options.forwardedFor === undefined
        ? {}
        : { 'x-forwarded-for': options.forwardedFor }),
      ...(options.assertion === undefined
        ? {}
        : { 'x-playliberty-edge': options.assertion })
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

async function issuePair(testContext: TestContext): Promise<MobileToken> {
  const { code } = mintedCode(await provision(testContext));
  const response = await exchange(testContext, {
    code,
    code_verifier: VERIFIER,
    redirect_uri: REDIRECT_URI
  });

  return response.json() as MobileToken;
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
  expect(logged).not.toContain('token-1');
  expect(logged).not.toContain('secret-1');
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
    const testContext = await start({ env: { MOBILE_REDIRECT_URIS: '' } });

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
    const pangolin = new FakePangolin();
    const testContext = await start({ pangolin });
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
        id: 'token-1',
        secret: 'secret-1',
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
      expiresAt: '2026-11-08T12:00:00.000Z',
      revokedAt: null
    });
    expect(refresh?.tokenHash).toBe(
      createHash('sha256').update(body.refresh.token).digest('hex')
    );
    expect(refresh?.tokenHash).not.toBe(body.refresh.token);
    expect(refresh?.consumedAt).toBeNull();
    expect(accessRows(testContext)).toEqual([
      expect.objectContaining({
        pangolinTokenId: 'token-1',
        familyId: family?.id,
        expiresAt: '2026-11-01T13:00:00.000Z',
        revokedAt: null
      })
    ]);
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
    now = 1_000_000;
    const testContext = await start();
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
    const testContext = await start({ pangolin });
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
    const testContext = await start({
      env: { EDGE_ASSERTION: 'edge-secret' }
    });
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

describe('POST /auth/refresh', () => {
  it('rotates the pair and consumes the presented token', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({ pangolin });
    const issued = await issuePair(testContext);

    const response = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    const rotated = response.json() as MobileToken;
    const tokens = refreshRows(testContext);
    const family = familyRows(testContext)[0];

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(rotated.access).toMatchObject({
      id: 'token-2',
      secret: 'secret-2',
      expires_in: 3600
    });
    expect(rotated.refresh.token).not.toBe(issued.refresh.token);
    expect(rotated.refresh.expires_in).toBe(86400);
    expect(pangolin.calls[1]?.title).toBe(
      `PlayLiberty mobile ${String(family?.id).slice(0, 8)}`
    );
    expect(tokens).toHaveLength(2);
    expect(tokens.find(row => row.consumedAt !== null)).toBeDefined();
    expect(accessRows(testContext)).toHaveLength(2);
  });

  it('rotates one token once when two refreshes race', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({ pangolin });
    const issued = await issuePair(testContext);

    pangolin.holdMint = true;
    const first = refresh(testContext, { refresh_token: issued.refresh.token });
    const second = refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    await pangolin.waitForMintHeld();
    /* The gate exposes no arrival signal, so this integration race waits one
     * short turn for the second request. Fake timers cannot drive Fastify. */
    const settled = Promise.withResolvers<void>();
    setTimeout(settled.resolve, 20);
    await settled.promise;

    const mintCalls = pangolin.calls.length;
    pangolin.releaseMint();

    const [firstResponse, secondResponse] = await Promise.all([first, second]);

    expect(mintCalls).toBe(2);
    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toEqual(firstResponse.json());
    expect(refreshRows(testContext)).toHaveLength(2);
    expect(accessRows(testContext)).toHaveLength(2);
    expect(familyRows(testContext)[0]?.revokedAt).toBeNull();
  });

  it('repeats the pair inside the grace window without minting', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({ pangolin });
    const issued = await issuePair(testContext);
    const rotated = (
      await refresh(testContext, { refresh_token: issued.refresh.token })
    ).json() as MobileToken;

    const replay = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(rotated);
    expect(pangolin.calls).toHaveLength(2);
    expect(refreshRows(testContext)).toHaveLength(2);
    expect(accessRows(testContext)).toHaveLength(2);
  });

  it('revokes the family when an older consumed token is replayed inside the grace window', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await start({ logger });
    const issued = await issuePair(testContext);

    const rotated = (
      await refresh(testContext, { refresh_token: issued.refresh.token })
    ).json() as MobileToken;
    await refresh(testContext, { refresh_token: rotated.refresh.token });

    const replay = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(replay.statusCode).toBe(400);
    expect(replay.json().code).toBe(ProblemCode.InvalidGrant);
    expect(familyRows(testContext)[0]?.revokedAt).not.toBeNull();
    expect(lines).toContainEqual(
      expect.objectContaining({
        action: 'session_refresh',
        outcome: 'refused',
        reason: 'refresh_token_reuse'
      })
    );
  });

  it('revokes the family and its access tokens when a replay comes too late', async () => {
    const { logger, lines } = recordingLogger();
    const pangolin = new FakePangolin();
    const testContext = await start({ logger, pangolin });
    const issued = await issuePair(testContext);
    const rotated = (
      await refresh(testContext, { refresh_token: issued.refresh.token })
    ).json() as MobileToken;

    now += 30_001;
    const replay = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(replay.statusCode).toBe(400);
    expect(replay.json().code).toBe(ProblemCode.InvalidGrant);
    expect(familyRows(testContext)[0]?.revokedAt).toBe(
      new Date(now).toISOString()
    );
    expect(accessRows(testContext).every(row => row.revokedAt !== null)).toBe(
      true
    );
    expect(pangolin.deleted.sort()).toEqual(['token-1', 'token-2']);
    expect(lines).toContainEqual(
      expect.objectContaining({
        action: 'session_refresh',
        outcome: 'refused',
        reason: 'refresh_token_reuse'
      })
    );

    const afterwards = await refresh(testContext, {
      refresh_token: rotated.refresh.token
    });

    expect(afterwards.statusCode).toBe(400);
  });

  it('keeps the family revoked when a deletion fails', async () => {
    const { logger, lines } = recordingLogger();
    const pangolin = new FakePangolin();
    const testContext = await start({ logger, pangolin });
    const issued = await issuePair(testContext);

    await refresh(testContext, { refresh_token: issued.refresh.token });
    pangolin.failDelete = true;
    now += 30_001;

    const replay = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(replay.statusCode).toBe(400);
    expect(familyRows(testContext)[0]?.revokedAt).not.toBeNull();
    expect(accessRows(testContext).every(row => row.revokedAt !== null)).toBe(
      true
    );
    expect(
      lines
        .filter(line => line.action === 'revocation_failed')
        .map(line => line.token)
        .sort()
    ).toEqual(['token-1', 'token-2']);

    pangolin.failDelete = false;
    const retried = await revokePending({
      database: testContext.database,
      pangolin,
      logger: recordingLogger().logger,
      now: () => now
    });

    expect(retried).toEqual({ retried: 2, failed: 0 });
    expect(
      accessRows(testContext).every(row => row.edgeDeletedAt !== null)
    ).toBe(true);
  });

  it('clamps both credentials to the family remaining life', async () => {
    const testContext = await start({
      env: {
        MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS: '43200',
        MOBILE_FAMILY_LIFETIME_SECONDS: '86400'
      }
    });
    const issued = await issuePair(testContext);

    now += 20 * 60 * 60 * 1000;
    const response = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    const rotated = response.json() as MobileToken;

    expect(rotated.access.expires_in).toBe(4 * 60 * 60);
    expect(rotated.refresh.expires_in).toBe(4 * 60 * 60);
    expect(rotated.refresh.expires_at).toBe(
      new Date(NOW + 24 * 60 * 60 * 1000).toISOString()
    );
  });

  it('refuses an unknown token without detail', async () => {
    const testContext = await start();

    const response = await refresh(testContext, { refresh_token: 'unknown' });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
  });

  it('refuses an expired refresh token', async () => {
    const testContext = await start();
    const issued = await issuePair(testContext);

    now += 86_401 * 1000;
    const response = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
  });

  it('refuses a token in a revoked family', async () => {
    const testContext = await start();
    const issued = await issuePair(testContext);

    testContext.database.db
      .update(refreshFamilies)
      .set({ revokedAt: new Date(now).toISOString() })
      .where(eq(refreshFamilies.id, String(familyRows(testContext)[0]?.id)))
      .run();

    const response = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
  });

  it('refuses a token whose family has expired', async () => {
    const testContext = await start();
    const issued = await issuePair(testContext);

    now += 604_801 * 1000;
    const response = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
  });

  it('answers 503 when the instance has no Integration API', async () => {
    context = await createTestContext({ MOBILE_REDIRECT_URIS: REDIRECT_URI });

    const response = await refresh(context, { refresh_token: 'any' });

    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe(ProblemCode.ProvisioningUnavailable);
  });

  it('preserves the token when Pangolin fails', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({ pangolin });
    const issued = await issuePair(testContext);

    pangolin.fail = true;
    const failed = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    pangolin.fail = false;
    const retried = await refresh(testContext, {
      refresh_token: issued.refresh.token
    });

    expect(failed.statusCode).toBe(502);
    expect(failed.json().code).toBe(ProblemCode.ProvisioningFailed);
    expect(retried.statusCode).toBe(200);
  });

  it('refuses a body without a refresh token', async () => {
    const testContext = await start();

    const response = await refresh(testContext, {});

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.ValidationFailed);
  });

  it('rate limits the eleventh attempt from one caller', async () => {
    const testContext = await start();
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await refresh(testContext, { refresh_token: 'unknown' });
      statuses.push(response.statusCode);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses[10]).toBe(429);
  });

  it('rate limits one family independently of the caller', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({ pangolin });
    const issued = await issuePair(testContext);
    const statuses: number[] = [];

    pangolin.fail = true;

    for (let attempt = 1; attempt <= 11; attempt += 1) {
      const response = await refresh(
        testContext,
        { refresh_token: issued.refresh.token },
        { forwardedFor: `203.0.113.${attempt}` }
      );
      statuses.push(response.statusCode);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(502));
    expect(statuses[10]).toBe(429);
  });

  it('needs the edge assertion but no identity', async () => {
    const testContext = await start({
      env: { EDGE_ASSERTION: 'edge-secret' }
    });

    const withoutAssertion = await refresh(testContext, {
      refresh_token: 'unknown'
    });
    const withAssertion = await refresh(
      testContext,
      { refresh_token: 'unknown' },
      { assertion: 'edge-secret' }
    );

    expect(withoutAssertion.statusCode).toBe(401);
    expect(withAssertion.statusCode).toBe(400);
  });
});

describe('the audit', () => {
  it('records an allowed exchange with the Pangolin user id', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await start({ logger });
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
    const testContext = await start({ logger });
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
    const testContext = await start({ logger });
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
    now = 1_000_000;
    const testContext = await start({ logger });
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
    const testContext = await start({ logger });
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
    const testContext = await start({ logger });
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
    const testContext = await start({ logger, pangolin });
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

  it('records the rotation and the refusal without the token', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await start({ logger });
    const issued = await issuePair(testContext);

    await refresh(testContext, { refresh_token: issued.refresh.token });
    await refresh(testContext, { refresh_token: 'unknown' });

    const refreshLines = lines.filter(
      line => line.action === 'session_refresh'
    );
    const logged = JSON.stringify(refreshLines);

    expect(refreshLines[0]).toMatchObject({
      audit: true,
      outcome: 'allowed',
      account: 'p-alice'
    });
    expect(refreshLines[1]).toMatchObject({
      outcome: 'refused',
      reason: 'refresh_token_unknown'
    });
    expect(logged).not.toContain(issued.refresh.token);
    expect(logged).not.toContain('secret-1');
  });

  it('names a grace replay in the audit', async () => {
    const { logger, lines } = recordingLogger();
    const testContext = await start({ logger });
    const issued = await issuePair(testContext);

    await refresh(testContext, { refresh_token: issued.refresh.token });
    await refresh(testContext, { refresh_token: issued.refresh.token });

    const refreshLines = lines.filter(
      line => line.action === 'session_refresh'
    );

    expect(refreshLines).toHaveLength(2);
    expect(refreshLines[0]).toMatchObject({ outcome: 'allowed' });
    expect(refreshLines[0]).not.toHaveProperty('reason');
    expect(refreshLines[1]).toMatchObject({
      outcome: 'allowed',
      reason: 'grace_replay'
    });
  });
});

describe('challengeFor', () => {
  it('matches the RFC 7636 S256 vector', () => {
    expect(challengeFor(VERIFIER)).toBe(CHALLENGE);
  });
});
