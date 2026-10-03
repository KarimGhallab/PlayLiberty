import { describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { PlaylistTrack } from '@playliberty/contracts';

import { toPlayerTracks } from './playerTracks';

function association(
  id: string,
  fileStatus: TrackFileStatus,
  position: number,
  sourceStatus: TrackSourceStatus = TrackSourceStatus.Available
): PlaylistTrack {
  return {
    track: {
      id,
      provider: Provider.Youtube,
      videoId: `video-${id}`,
      title: id,
      durationSeconds: 180,
      thumbnailPath: null,
      fileStatus,
      sourceStatus,
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    origin: AssociationOrigin.Remote,
    position
  };
}

describe('toPlayerTracks', () => {
  it('keeps only tracks whose file is stored, in the server order', () => {
    const entries = toPlayerTracks(
      [
        association('stored-1', TrackFileStatus.Stored, 0),
        association('pending', TrackFileStatus.Pending, 1),
        association('stored-2', TrackFileStatus.Stored, 2),
        association('failed', TrackFileStatus.Failed, 3),
        association('downloading', TrackFileStatus.Downloading, 4),
        association('unavailable', TrackFileStatus.Unavailable, 5)
      ],
      'playlist-1',
      'Rain On The Window'
    );

    expect(entries.map(entry => entry.id)).toEqual(['stored-1', 'stored-2']);
  });

  it('stamps the playlist id and name on every entry', () => {
    const [entry] = toPlayerTracks(
      [association('stored-1', TrackFileStatus.Stored, 0)],
      'playlist-1',
      'Rain On The Window'
    );

    expect(entry.playlistId).toBe('playlist-1');
    expect(entry.playlistName).toBe('Rain On The Window');
  });

  it('keeps a track that left its source when its file is still stored', () => {
    /*
     * A video removed from YouTube is a fact about the source, not about the
     * copy this server holds. The stored file still plays, so the entry stays:
     * keeping the media is the whole point of the product.
     */
    const entries = toPlayerTracks(
      [
        association(
          'stored-1',
          TrackFileStatus.Stored,
          0,
          TrackSourceStatus.Removed
        )
      ],
      'playlist-1',
      'Rain On The Window'
    );

    expect(entries.map(entry => entry.id)).toEqual(['stored-1']);
  });
});
