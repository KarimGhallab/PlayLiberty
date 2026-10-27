import { describe, expect, it } from 'vitest';

import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { ApiError } from '../clients/apiClient/apiClient';
import { problemSentence } from './problem';

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

  it('returns null for an error that is not an ApiError', () => {
    expect(problemSentence(t, new Error('boom'))).toBeNull();
  });

  it('returns null when there is no error', () => {
    expect(problemSentence(t, null)).toBeNull();
  });
});
