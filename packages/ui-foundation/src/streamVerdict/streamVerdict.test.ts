import { describe, expect, it } from 'vitest';

import { StreamFailureKind, streamFailureKind } from './streamVerdict.js';

describe('the stream verdict', () => {
  it.each([403, 404, 409])('drops a %i as gone', status => {
    expect(streamFailureKind(status)).toBe(StreamFailureKind.Gone);
  });

  it('treats 401 as the session, not a broken track', () => {
    expect(streamFailureKind(401)).toBe(StreamFailureKind.Session);
  });

  it('leaves any other status unclassified', () => {
    expect(streamFailureKind(503)).toBe(StreamFailureKind.Unknown);
  });
});
