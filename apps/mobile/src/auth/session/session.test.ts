import { beforeEach, describe, expect, it } from '@jest/globals';

import type { MobileToken } from '@playliberty/contracts';

import {
  type SessionRecord,
  recordFromToken
} from '../sessionRecord/sessionRecord';
import {
  ACCESS_MARGIN_MS,
  Session,
  SessionRefreshError,
  type SessionStore
} from './session';

const NOW = Date.parse('2026-11-01T12:00:00.000Z');
const BASE_URL = 'https://instance.test/';
const REFRESH_URL = 'https://instance.test/auth/refresh';

class MemoryStore implements SessionStore {
  record: SessionRecord | null;
  readonly writes: SessionRecord[] = [];

  constructor(record: SessionRecord | null) {
    this.record = record;
  }

  async read(): Promise<SessionRecord | null> {
    return this.record;
  }

  async write(record: SessionRecord): Promise<void> {
    this.record = record;
    this.writes.push(record);
  }

  async clear(): Promise<void> {
    this.record = null;
  }
}

function tokenPair(
  id = 'access-1',
  secret = 'secret-1',
  refresh = 'refresh-1'
): MobileToken {
  return {
    access: {
      id,
      secret,
      expires_at: '2026-11-01T13:00:00.000Z',
      expires_in: 3600
    },
    refresh: {
      token: refresh,
      expires_at: '2026-11-02T12:00:00.000Z',
      expires_in: 86_400
    }
  };
}

function record(expiresInMs = 3_600_000): SessionRecord {
  return {
    ...recordFromToken(tokenPair(), NOW),
    accessDeadline: NOW + expiresInMs
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function invalidGrant(): Response {
  return jsonResponse(
    {
      type: 'https://playliberty.dev/problems/invalid_grant',
      title: 'Invalid Grant',
      status: 400,
      code: 'invalid_grant'
    },
    400
  );
}

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function fetchReturning(respond: () => Response | Promise<Response>): {
  calls: FetchCall[];
  fetchMock: typeof fetch;
} {
  const calls: FetchCall[] = [];
  const fetchMock = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => {
    calls.push({ url: String(input), init });
    return respond();
  }) as typeof fetch;

  return { calls, fetchMock };
}

function sessionWith(
  store: MemoryStore,
  fetchMock: typeof fetch,
  now: () => number = () => NOW
): Session {
  return new Session({ baseUrl: BASE_URL, fetch: fetchMock, store, now });
}

let now = NOW;

beforeEach(() => {
  now = NOW;
});

describe('accessToken', () => {
  it('does not renew before the margin', async () => {
    const store = new MemoryStore(record(ACCESS_MARGIN_MS + 1000));
    const { calls, fetchMock } = fetchReturning(() =>
      jsonResponse(tokenPair())
    );
    const session = sessionWith(store, fetchMock);

    const token = await session.accessToken();

    expect(token).toEqual({ id: 'access-1', secret: 'secret-1' });
    expect(calls).toHaveLength(0);
  });

  it('renews inside the margin and writes the rotated record once', async () => {
    const store = new MemoryStore(record(ACCESS_MARGIN_MS - 1000));
    const { calls, fetchMock } = fetchReturning(() =>
      jsonResponse(tokenPair('access-2', 'secret-2', 'refresh-2'))
    );
    const session = sessionWith(store, fetchMock);
    const seen: Array<SessionRecord | null> = [];
    session.subscribe(entry => seen.push(entry));

    const token = await session.accessToken();

    const [call] = calls;

    expect(token).toEqual({ id: 'access-2', secret: 'secret-2' });
    expect(call?.url).toBe(REFRESH_URL);
    expect(call?.init?.method).toBe('POST');
    expect(new Headers(call?.init?.headers).get('x-playliberty-client')).toBe(
      'mobile'
    );
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      refresh_token: 'refresh-1'
    });
    expect(store.writes).toHaveLength(1);
    expect(store.writes[0]).toMatchObject({
      accessId: 'access-2',
      accessSecret: 'secret-2',
      refreshToken: 'refresh-2'
    });
    expect(store.writes[0]?.accessDeadline).toBe(NOW + 3_600_000);
    expect(seen).toEqual([store.writes[0]]);
  });

  it('shares one flight between concurrent callers', async () => {
    const store = new MemoryStore(record(ACCESS_MARGIN_MS - 1000));
    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>(resolve => {
      release = resolve;
    });
    let calls = 0;
    const fetchMock = (async () => {
      calls += 1;
      return pending;
    }) as typeof fetch;
    const session = sessionWith(store, fetchMock);

    const first = session.accessToken();
    const second = session.accessToken();

    await Promise.resolve();
    release(jsonResponse(tokenPair('access-2', 'secret-2', 'refresh-2')));
    const [firstToken, secondToken] = await Promise.all([first, second]);

    expect(calls).toBe(1);
    expect(firstToken).toEqual({ id: 'access-2', secret: 'secret-2' });
    expect(secondToken).toEqual(firstToken);
    expect(store.writes).toHaveLength(1);
  });

  it('schedules from the duration, not the server absolute expiry', async () => {
    const store = new MemoryStore(null);
    const { calls, fetchMock } = fetchReturning(() =>
      jsonResponse(tokenPair())
    );
    const session = sessionWith(store, fetchMock, () => now);
    const skewed: MobileToken = {
      ...tokenPair(),
      access: { ...tokenPair().access, expires_at: '1970-01-01T00:00:00.000Z' }
    };

    await session.adopt(skewed);
    now += 1000;
    const token = await session.accessToken();

    expect(token).toEqual({ id: 'access-1', secret: 'secret-1' });
    expect(calls).toHaveLength(0);
  });
});

describe('the renewal verdict', () => {
  it('clears the record only for an invalid grant', async () => {
    const store = new MemoryStore(record(ACCESS_MARGIN_MS - 1000));
    const { fetchMock } = fetchReturning(() => invalidGrant());
    const session = sessionWith(store, fetchMock);
    const seen: Array<SessionRecord | null> = [];
    session.subscribe(entry => seen.push(entry));

    const token = await session.accessToken();

    expect(token).toBeNull();
    expect(store.record).toBeNull();
    expect(seen).toEqual([null]);
  });

  const transient: Array<[string, () => Response | Error]> = [
    ['a rate limit', () => jsonResponse({ code: 'rate_limited' }, 429)],
    [
      'a server fault',
      () => jsonResponse({ code: 'provisioning_failed' }, 502)
    ],
    ['a network failure', () => new Error('offline')],
    [
      'a non-JSON answer',
      () =>
        new Response('<html>sign in</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
    ]
  ];

  it.each(transient)('keeps the record on %s', async (_name, respond) => {
    const current = record(ACCESS_MARGIN_MS - 1000);
    const store = new MemoryStore(current);
    const { fetchMock } = fetchReturning(() => {
      const response = respond();

      if (response instanceof Error) {
        throw response;
      }

      return response;
    });
    const session = sessionWith(store, fetchMock);

    await expect(session.refreshNow()).rejects.toBeInstanceOf(
      SessionRefreshError
    );
    expect(store.record).toEqual(current);
    expect(store.writes).toHaveLength(0);
  });

  it('does not put the record back when a sign-out lands mid-flight', async () => {
    const store = new MemoryStore(record(ACCESS_MARGIN_MS - 1000));
    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>(resolve => {
      release = resolve;
    });
    const fetchMock = (async () => pending) as typeof fetch;
    const session = sessionWith(store, fetchMock);

    const renewal = session.refreshNow();
    await Promise.resolve();
    await session.clear();
    release(jsonResponse(tokenPair('access-2', 'secret-2', 'refresh-2')));

    expect(await renewal).toBeNull();
    expect(store.record).toBeNull();
    expect(store.writes).toHaveLength(0);
  });
});

describe('adopt', () => {
  it('writes the record and tells its subscribers', async () => {
    const store = new MemoryStore(null);
    const { fetchMock } = fetchReturning(() => jsonResponse(tokenPair()));
    const session = sessionWith(store, fetchMock);
    const seen: Array<SessionRecord | null> = [];
    session.subscribe(entry => seen.push(entry));

    const adopted = await session.adopt(tokenPair('access-2', 'secret-2'));

    expect(adopted.accessId).toBe('access-2');
    expect(store.record).toEqual(adopted);
    expect(seen).toEqual([adopted]);
    expect(await session.accessToken()).toEqual({
      id: 'access-2',
      secret: 'secret-2'
    });
  });
});
