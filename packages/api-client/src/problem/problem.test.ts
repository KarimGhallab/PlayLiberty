import { describe, expect, it } from 'vitest';

import { readProblem } from './problem.js';

function respondWith(body: unknown, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json' }
  });
}

const PROBLEM = {
  type: 'about:blank',
  title: 'Playlist not found',
  status: 404,
  code: 'playlist_not_found'
};

describe('readProblem', () => {
  it('reads the problem document a refusal carries', async () => {
    await expect(readProblem(respondWith(PROBLEM, 404))).resolves.toEqual(
      PROBLEM
    );
  });

  it('reads no problem from a body that is not a problem document', async () => {
    await expect(
      readProblem(respondWith({ error: 'boom' }))
    ).resolves.toBeNull();
  });

  it('reads no problem from a body that is not JSON', async () => {
    await expect(readProblem(new Response('not json'))).resolves.toBeNull();
  });
});
