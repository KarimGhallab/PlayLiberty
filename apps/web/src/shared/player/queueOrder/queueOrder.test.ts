import { describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import type { PlayerTrack } from '../types';
import { orderTracksByQueue } from './queueOrder';

function queued(id: string): PlayerTrack {
  return {
    id,
    title: id,
    playlistId: 'playlist-1',
    playlistName: 'The Queue Playlist',
    durationSeconds: 180,
    thumbnailPath: null
  };
}

function association(id: string) {
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
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    origin: AssociationOrigin.Remote,
    position: 0
  };
}

describe('orderTracksByQueue', () => {
  it('opens a group at each queued track and keeps the playlist order in it', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(association);
    const queue = [queued('a'), queued('b'), queued('c'), queued('d')];

    expect(orderTracksByQueue(tracks, queue).map(row => row.track.id)).toEqual([
      'a',
      'b',
      'c',
      'd'
    ]);
  });

  it('carries a row the queue does not hold with the group before it', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(association);
    const shuffledQueue = [queued('a'), queued('c'), queued('b'), queued('d')];

    expect(
      orderTracksByQueue(tracks, shuffledQueue).map(row => row.track.id)
    ).toEqual(['a', 'c', 'b', 'd']);
  });

  it('carries a leading row the queue does not hold in front of the queue', () => {
    const tracks = ['a', 'b', 'c'].map(association);
    const queue = [queued('b'), queued('c')];

    expect(orderTracksByQueue(tracks, queue).map(row => row.track.id)).toEqual([
      'a',
      'b',
      'c'
    ]);
  });

  it('leaves the playlist order alone when the queue is that order', () => {
    const tracks = ['a', 'b', 'c'].map(association);
    const queue = [queued('a'), queued('b'), queued('c')];

    expect(orderTracksByQueue(tracks, queue).map(row => row.track.id)).toEqual(
      tracks.map(row => row.track.id)
    );
  });
});
