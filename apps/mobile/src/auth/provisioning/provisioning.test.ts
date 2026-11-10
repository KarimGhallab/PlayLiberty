import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { USER_AGENT } from '../../api/userAgent';
import {
  type BrowserResult,
  type ProvisioningDeps,
  ProvisioningError,
  ProvisioningFailure,
  base64Url,
  beginProvisioning,
  cancelProvisioning,
  completeProvisioning,
  constantTimeEqual
} from './provisioning';

const BASE = 'https://instance.test';
const SCHEME_URI = 'dev.playliberty.app://provision';
const HTTPS_URI = 'https://instance.test/provision';
const VERIFIER_BYTES = new Uint8Array(32).fill(7);
const STATE_BYTES = new Uint8Array(16).fill(9);
const CHALLENGE = 'challenge-value';

const PAIR = {
  access: {
    id: 'token-id',
    secret: 'token-secret',
    expires_at: '2026-11-02T00:00:00.000Z',
    expires_in: 43_200
  },
  refresh: {
    token: 'refresh-token',
    expires_at: '2027-04-30T12:00:00.000Z',
    expires_in: 15_552_000
  }
};

function tokenResponse(): Response {
  return new Response(JSON.stringify(PAIR), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

function successFor(url: string, redirectUri: string): BrowserResult {
  const state = new URL(url).searchParams.get('state') ?? '';

  return {
    type: 'success',
    url: `${redirectUri}?code=code-1&state=${state}`
  };
}

function deps(overrides: Partial<ProvisioningDeps> = {}): ProvisioningDeps {
  return {
    openBrowser: jest.fn<ProvisioningDeps['openBrowser']>(async () => ({
      type: 'dismiss'
    })),
    fetch: jest.fn<ProvisioningDeps['fetch']>(async () => tokenResponse()),
    randomBytes: length => (length === 32 ? VERIFIER_BYTES : STATE_BYTES),
    digest: async () => CHALLENGE,
    ...overrides
  };
}

beforeEach(() => {
  cancelProvisioning();
});

describe('beginProvisioning', () => {
  it('sends the challenge and the state to the provisioning route', async () => {
    const openBrowser = jest.fn<ProvisioningDeps['openBrowser']>(
      async (url, redirectUri) => successFor(url, redirectUri)
    );

    await beginProvisioning({
      baseUrl: BASE,
      redirectUris: [SCHEME_URI],
      deps: deps({ openBrowser })
    });

    const [provisionUrl, redirectUri] = openBrowser.mock.calls[0] ?? [];
    const provision = new URL(provisionUrl ?? '');

    expect(redirectUri).toBe(SCHEME_URI);
    expect(provision.origin).toBe(BASE);
    expect(provision.pathname).toBe('/provision');
    expect(provision.searchParams.get('code_challenge')).toBe(CHALLENGE);
    expect(provision.searchParams.get('code_challenge_method')).toBe('S256');
    expect(provision.searchParams.get('redirect_uri')).toBe(SCHEME_URI);
    expect(provision.searchParams.get('state')).toBe(base64Url(STATE_BYTES));
  });

  it('stops when the person cancels', async () => {
    const openBrowser = jest.fn<ProvisioningDeps['openBrowser']>(async () => ({
      type: 'cancel'
    }));

    await expect(
      beginProvisioning({
        baseUrl: BASE,
        redirectUris: [HTTPS_URI, SCHEME_URI],
        deps: deps({ openBrowser })
      })
    ).rejects.toMatchObject({ failure: ProvisioningFailure.Cancelled });
    expect(openBrowser).toHaveBeenCalledTimes(1);
  });

  it('falls back to the scheme when the HTTPS callback is dismissed', async () => {
    const openBrowser = jest.fn<ProvisioningDeps['openBrowser']>(
      async (url, redirectUri) =>
        redirectUri === HTTPS_URI
          ? { type: 'dismiss' }
          : successFor(url, redirectUri)
    );

    await beginProvisioning({
      baseUrl: BASE,
      redirectUris: [HTTPS_URI, SCHEME_URI],
      deps: deps({ openBrowser })
    });

    expect(openBrowser).toHaveBeenCalledTimes(2);
    expect(openBrowser.mock.calls[1]?.[1]).toBe(SCHEME_URI);
  });
});

describe('completeProvisioning', () => {
  async function started(): Promise<{ code: string; state: string }> {
    const openBrowser = jest.fn<ProvisioningDeps['openBrowser']>(
      async (url, redirectUri) => successFor(url, redirectUri)
    );

    await beginProvisioning({
      baseUrl: BASE,
      redirectUris: [SCHEME_URI],
      deps: deps({ openBrowser })
    });

    const [provisionUrl] = openBrowser.mock.calls[0] ?? [];
    const provision = new URL(provisionUrl ?? '');

    return {
      code: 'code-1',
      state: provision.searchParams.get('state') ?? ''
    };
  }

  it('trades the code and its verifier for the token pair', async () => {
    const { code, state } = await started();
    const fetchMock = jest.fn<ProvisioningDeps['fetch']>(async () =>
      tokenResponse()
    );

    const token = await completeProvisioning(
      { code, state },
      deps({ fetch: fetchMock })
    );

    const [exchangeUrl, init] = fetchMock.mock.calls[0] ?? [];
    const body: unknown = JSON.parse(String(init?.body));

    expect(token).toEqual(PAIR);
    expect(exchangeUrl).toBe(`${BASE}/auth/exchange`);
    expect(body).toMatchObject({
      code,
      code_verifier: base64Url(VERIFIER_BYTES),
      redirect_uri: SCHEME_URI
    });
    expect(new Headers(init?.headers).get('User-Agent')).toBe(USER_AGENT);
  });

  it('refuses a callback whose state is not the one it sent', async () => {
    const { code } = await started();
    const fetchMock = jest.fn<ProvisioningDeps['fetch']>(async () =>
      tokenResponse()
    );

    await expect(
      completeProvisioning(
        { code, state: 'not-the-state' },
        deps({ fetch: fetchMock })
      )
    ).rejects.toMatchObject({ failure: ProvisioningFailure.StateMismatch });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a callback with no flow in flight', async () => {
    await expect(
      completeProvisioning({ code: 'code-1', state: 'state' }, deps())
    ).rejects.toMatchObject({ failure: ProvisioningFailure.NotStarted });
  });

  it('carries the server problem back on a refusal', async () => {
    const { code, state } = await started();
    const fetchMock = jest.fn<ProvisioningDeps['fetch']>(
      async () =>
        new Response(
          JSON.stringify({
            type: 'https://playliberty.dev/problems/invalid_grant',
            title: 'Invalid Grant',
            status: 400,
            code: 'invalid_grant'
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/problem+json' }
          }
        )
    );

    const failure = await completeProvisioning(
      { code, state },
      deps({ fetch: fetchMock })
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ProvisioningError);
    expect(failure).toMatchObject({ problem: { code: 'invalid_grant' } });
  });
});

describe('the PKCE helpers', () => {
  it('encodes bytes as base64url without padding', () => {
    expect(base64Url(new Uint8Array([0, 0, 0]))).toBe('AAAA');
    expect(base64Url(new Uint8Array([255, 255, 255]))).toBe('____');
    expect(base64Url(new Uint8Array([1, 2, 3]))).toBe('AQID');
  });

  it('compares in constant time', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
  });
});
