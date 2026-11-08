import { describe, expect, it } from '@jest/globals';

import { endpoints } from '@playliberty/contracts';

import {
  credentialedAddress,
  eventsAddress,
  mediaAddress,
  streamAddress
} from './credentialed';

const config = {
  baseUrl: 'https://instance.test/',
  token: { id: 'access-1', secret: 'secret-1' }
};

const headers = {
  'P-Access-Token-Id': 'access-1',
  'P-Access-Token': 'secret-1',
  'User-Agent': 'PlayLiberty/1.0 (Android)'
};

describe('a credentialed address', () => {
  it('joins the origin and the API prefix', () => {
    expect(credentialedAddress(config, '/tracks/1')).toEqual({
      uri: 'https://instance.test/api/v1/tracks/1',
      headers
    });
  });

  it('builds the stream address', () => {
    expect(streamAddress(config, 'track-1').uri).toBe(
      'https://instance.test/api/v1/tracks/track-1/stream'
    );
  });

  it('builds a media address from the endpoint', () => {
    expect(
      mediaAddress(config, endpoints.trackThumbnail, { trackId: 'track-1' }).uri
    ).toBe('https://instance.test/api/v1/tracks/track-1/thumbnail');
  });

  it('builds the live events address', () => {
    expect(eventsAddress(config).uri).toBe(
      'https://instance.test/api/v1/events'
    );
  });
});
