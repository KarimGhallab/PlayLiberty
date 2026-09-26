import { afterEach, describe, expect, it } from 'vitest';

import { createTestContext } from '../testing/createTestContext.js';
import type { TestContext } from '../testing/createTestContext.js';

const playlistPayload = {
  url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef'
};

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

describe('csrf guard', () => {
  it('rejects a mutating request without the client header', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      headers: { 'remote-user': 'account-1' },
      payload: playlistPayload
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });

  it('accepts a mutating request that carries the client header', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      headers: { 'remote-user': 'account-1', 'x-playliberty-client': 'test' },
      payload: playlistPayload
    });

    expect(response.statusCode).toBe(501);
  });

  it('rejects a cross-site mutating request', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      headers: {
        'remote-user': 'account-1',
        'x-playliberty-client': 'test',
        'sec-fetch-site': 'cross-site'
      },
      payload: playlistPayload
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_cross_site' });
  });

  it('rejects a mismatched origin when a public origin is configured', async () => {
    context = await createTestContext({
      PUBLIC_ORIGIN: 'https://app.example.com'
    });

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      headers: {
        'remote-user': 'account-1',
        'x-playliberty-client': 'test',
        origin: 'https://evil.example.com'
      },
      payload: playlistPayload
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_origin_mismatch' });
  });
});
