import { describe, expect, it } from 'vitest';

import { ProblemCode } from '@playliberty/contracts';
import type { Problem } from '@playliberty/contracts';

import { catalogs } from '../catalogs.js';
import { createTranslator } from '../createTranslator/createTranslator.js';
import { Language } from '../types.js';
import { problemDetail } from './problem.js';

const t = createTranslator(catalogs[Language.English], Language.English);

function problem(overrides: Partial<Problem>): Problem {
  return {
    type: 'https://playliberty.dev/problems/playlist_not_found',
    title: 'Playlist Not Found',
    status: 404,
    code: 'playlist_not_found',
    ...overrides
  };
}

describe('problemDetail', () => {
  it('renders each playlist_not_found reason as its own sentence', () => {
    expect(problemDetail(t, problem({ params: { reason: 'read' } }))).toBe(
      'The playlist does not exist, or this account cannot see it.'
    );
    expect(problemDetail(t, problem({ params: { reason: 'write' } }))).toBe(
      'The playlist does not exist, or this account cannot write it.'
    );
    expect(problemDetail(t, problem({ params: { reason: 'manage' } }))).toBe(
      'The playlist does not exist, or this account cannot manage it.'
    );
    expect(problemDetail(t, problem({ params: { reason: 'track' } }))).toBe(
      'The playlist does not exist, this account cannot write it, or the track is not in it.'
    );
  });

  it('falls back to the server detail when the reason is absent', () => {
    expect(problemDetail(t, problem({ detail: 'The server said so.' }))).toBe(
      'The server said so.'
    );
  });

  it('renders the validation code as the catalog sentence', () => {
    expect(
      problemDetail(
        t,
        problem({
          code: 'validation_failed',
          params: { path: 'url', issue: 'invalid_format' }
        })
      )
    ).toBe('The request contained an invalid value.');
  });

  it('renders the two single-purpose request codes', () => {
    expect(problemDetail(t, problem({ code: 'invalid_request' }))).toBe(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
    expect(problemDetail(t, problem({ code: 'unprocessable_request' }))).toBe(
      'The URL is not a YouTube video URL.'
    );
  });

  it('falls back to the server detail for an unmapped code', () => {
    expect(
      problemDetail(
        t,
        problem({ code: ProblemCode.InternalError, detail: 'Later.' })
      )
    ).toBe('Later.');
    expect(
      problemDetail(t, problem({ code: ProblemCode.InternalError }))
    ).toBeNull();
  });

  it('returns null for no problem', () => {
    expect(problemDetail(t, null)).toBeNull();
  });
});
