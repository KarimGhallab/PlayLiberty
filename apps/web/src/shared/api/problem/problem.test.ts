import { describe, expect, it } from 'vitest';

import { ProblemCode } from '@playliberty/contracts';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { ApiError } from '../client/client';
import { failureSentence, problemSentence } from './problem';

const t = createTranslator(catalogs[Language.English], Language.English);

describe('problemSentence', () => {
  it('maps a known code and its reason to the catalog sentence', () => {
    const error = new ApiError(404, {
      type: 'about:blank',
      title: 'Playlist Not Found',
      status: 404,
      code: 'playlist_not_found',
      params: { reason: 'read' }
    });

    expect(problemSentence(t, error)).toBe(
      'The playlist does not exist, or this account cannot see it.'
    );
  });

  it('falls back to the server detail for an unmapped code', () => {
    const error = new ApiError(503, {
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'Try again later.'
    });

    expect(problemSentence(t, error)).toBe('Try again later.');
  });

  it('returns null for an error that is not an ApiError', () => {
    expect(problemSentence(t, new Error('boom'))).toBeNull();
  });

  it('returns null when the ApiError carries no problem', () => {
    expect(problemSentence(t, new ApiError(401, null))).toBeNull();
  });

  it('returns null when there is no error', () => {
    expect(problemSentence(t, null)).toBeNull();
  });
});

describe('failureSentence', () => {
  it('names a blocked download without repeating the vendor diagnostic', () => {
    expect(
      failureSentence(
        t,
        'yt-dlp exited with code 1: ERROR: unable to download video data: HTTP Error 403: Forbidden'
      )
    ).toBe('YouTube blocked this download.');
  });

  it('names a private video', () => {
    expect(
      failureSentence(
        t,
        'ERROR: Private video. Sign in if you have been granted access'
      )
    ).toBe('This video is private.');
  });

  it('names a video that is no longer available', () => {
    expect(failureSentence(t, 'ERROR: Video unavailable')).toBe(
      'This video is no longer available.'
    );
  });

  it('names an unreachable host', () => {
    expect(
      failureSentence(
        t,
        'ERROR: Unable to download webpage: <urlopen error [Errno -3] Temporary failure in name resolution>'
      )
    ).toBe('YouTube could not be reached.');
  });

  it('falls back to one sentence for an unknown reason', () => {
    expect(
      failureSentence(t, 'Download failed, will retry on the next sync')
    ).toBe('The download failed.');
  });
});
