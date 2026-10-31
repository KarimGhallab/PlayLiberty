import { describe, expect, it } from '@jest/globals';

import {
  AssociationOrigin,
  type PlaylistTrack,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import { orderTracksByQueue } from './queueOrder';

function association(id: string): PlaylistTrack {
  return {
    track: {
      id,
      provider: Provider.Youtube,
      videoId: id,
      title: id,
      durationSeconds: 180,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus: TrackFileStatus.Stored,
      sourceStatus: TrackSourceStatus.Available,
      failureKind: null,
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    origin: AssociationOrigin.Remote,
    position: 0
  };
}

describe('orderTracksByQueue', () => {
  it('carries a row the queue does not hold with the group before it', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(association);

    expect(
      orderTracksByQueue(tracks, ['a', 'c', 'b', 'd']).map(row => row.track.id)
    ).toEqual(['a', 'c', 'b', 'd']);
  });

  it('carries a leading row the queue does not hold in front of the queue', () => {
    const tracks = ['a', 'b', 'c'].map(association);

    expect(
      orderTracksByQueue(tracks, ['b', 'c']).map(row => row.track.id)
    ).toEqual(['a', 'b', 'c']);
  });

  it('leaves the playlist order alone when the queue is that order', () => {
    const tracks = ['a', 'b', 'c'].map(association);

    expect(
      orderTracksByQueue(tracks, ['a', 'b', 'c']).map(row => row.track.id)
    ).toEqual(tracks.map(row => row.track.id));
  });
});
