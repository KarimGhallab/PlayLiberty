import { afterEach, describe, expect, it } from 'vitest';

import { ProblemCode } from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';

import type {
  IPangolinClient,
  MintResourceAccessTokenInput
} from '../pangolin/PangolinClient.js';
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
  provisioningNow?: () => number
): Promise<TestContext> {
  context = await createTestContext(
    { MOBILE_REDIRECT_URIS: REDIRECT_URI, ...env },
    { pangolin, provisioningNow }
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

function mintedCode(response: Injected): { code: string; state: string } {
  const url = new URL(String(response.headers['location']));

  return {
    code: url.searchParams.get('code') ?? '',
    state: url.searchParams.get('state') ?? ''
  };
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

  it('refuses a callback that is not on the allowlist', async () => {
    const testContext = await start();

    const response = await provision(testContext, {
      redirectUri: 'dev.playliberty.app://elsewhere'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe(ProblemCode.InvalidGrant);
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
  it('trades a code and its verifier for a token bound to the user', async () => {
    const pangolin = new FakePangolin();
    const testContext = await start({}, pangolin);
    const { code } = mintedCode(await provision(testContext));

    const response = await exchange(testContext, {
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT_URI
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: 'token-id',
      secret: 'token-secret'
    });
    expect(pangolin.calls).toHaveLength(1);
    expect(pangolin.calls[0]?.pangolinUserId).toBe('p-alice');
    expect(pangolin.calls[0]?.validForSeconds).toBe(180 * 24 * 60 * 60);
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
});

describe('challengeFor', () => {
  it('matches the RFC 7636 S256 vector', () => {
    expect(challengeFor(VERIFIER)).toBe(CHALLENGE);
  });
});
