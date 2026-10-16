import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '../../../testing/mocks/server';
import { StreamFailureKind, classifyStreamFailure } from './streamFailure';

const STREAM_URL = 'http://localhost:3000/api/v1/tracks/track-1/stream';

function streamResponds(status: number): void {
  server.use(
    http.head(STREAM_URL, () =>
      HttpResponse.json({ title: 'Failed' }, { status })
    )
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('classifyStreamFailure', () => {
  it('reports a not-found track as gone', async () => {
    streamResponds(404);

    await expect(classifyStreamFailure('track-1')).resolves.toBe(
      StreamFailureKind.Gone
    );
  });

  it('reports a forbidden track as gone', async () => {
    streamResponds(403);

    await expect(classifyStreamFailure('track-1')).resolves.toBe(
      StreamFailureKind.Gone
    );
  });

  it('reports a track with no stored media as gone', async () => {
    streamResponds(409);

    await expect(classifyStreamFailure('track-1')).resolves.toBe(
      StreamFailureKind.Gone
    );
  });

  it('leaves a transient server failure unclassified', async () => {
    streamResponds(503);

    await expect(classifyStreamFailure('track-1')).resolves.toBe(
      StreamFailureKind.Unknown
    );
  });

  it('leaves a network failure unclassified', async () => {
    server.use(http.head(STREAM_URL, () => HttpResponse.error()));

    await expect(classifyStreamFailure('track-1')).resolves.toBe(
      StreamFailureKind.Unknown
    );
  });

  it('reports an expired session and does not treat it as a track fault', async () => {
    /* jsdom navigates nowhere but does not throw, so the assert is the
     * classification: a 401 reads as a session, not a broken track. */
    streamResponds(401);

    await expect(classifyStreamFailure('track-1')).resolves.toBe(
      StreamFailureKind.Session
    );
  });
});
