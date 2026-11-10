import { describe, expect, it } from 'vitest';

import { accessHeaders, apiUrl } from './apiAddress.js';

describe('apiUrl', () => {
  it('adds the API prefix and keeps one slash at the join', () => {
    expect(apiUrl('https://instance.test', '/tracks/1')).toBe(
      'https://instance.test/api/v1/tracks/1'
    );
    expect(apiUrl('https://instance.test/', '/tracks/1')).toBe(
      'https://instance.test/api/v1/tracks/1'
    );
  });

  it('keeps a same-origin address when the base is empty', () => {
    expect(apiUrl('', '/tracks/1')).toBe('/api/v1/tracks/1');
  });
});

describe('accessHeaders', () => {
  it('carries the access pair and the user agent', () => {
    expect(
      accessHeaders(
        { id: 'access-1', secret: 'secret-1' },
        'PlayLiberty/1.0 (Android)'
      )
    ).toEqual({
      'P-Access-Token-Id': 'access-1',
      'P-Access-Token': 'secret-1',
      'User-Agent': 'PlayLiberty/1.0 (Android)'
    });
  });
});
