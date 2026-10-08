import { beforeEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { PlaylistTrack } from '@playliberty/contracts';

import { usePlayerStore } from '../playerStore/playerStore';
import { buildQueue, startPlaylistQueue } from './playerQueue';

const PLAYLIST = { id: 'playlist-1', name: 'Rain On The Window' } as const;

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
      skipNonMusic: true,
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

function stored(id: string, position: number): PlaylistTrack {
  return association(id, TrackFileStatus.Stored, position);
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('buildQueue', () => {
  it('keeps only tracks whose file is stored, in the server order', () => {
    const queue = buildQueue(
      [
        stored('stored-1', 0),
        association('pending', TrackFileStatus.Pending, 1),
        stored('stored-2', 2),
        association('failed', TrackFileStatus.Failed, 3),
        association('downloading', TrackFileStatus.Downloading, 4),
        association('unavailable', TrackFileStatus.Unavailable, 5)
      ],
      PLAYLIST
    );

    expect(queue.map(entry => entry.id)).toEqual(['stored-1', 'stored-2']);
  });

  it('stamps the playlist id and name on every entry', () => {
    const [entry] = buildQueue([stored('stored-1', 0)], PLAYLIST);

    expect(entry.playlistId).toBe('playlist-1');
    expect(entry.playlistName).toBe('Rain On The Window');
  });

  it('keeps a track that left its source when its file is still stored', () => {
    /*
     * A video removed from YouTube is a fact about the source, not about the
     * copy this server holds. The stored file still plays, so the entry stays:
     * keeping the media is the whole point of the product.
     */
    const queue = buildQueue(
      [
        association(
          'stored-1',
          TrackFileStatus.Stored,
          0,
          TrackSourceStatus.Removed
        )
      ],
      PLAYLIST
    );

    expect(queue.map(entry => entry.id)).toEqual(['stored-1']);
  });
});

describe('startPlaylistQueue', () => {
  it('starts the playlist on the pressed track', () => {
    const started = startPlaylistQueue(
      PLAYLIST,
      [stored('track-1', 0), stored('track-2', 1), stored('track-3', 2)],
      'track-2'
    );

    expect(started).toBe(true);
    const state = usePlayerStore.getState();
    expect(state.queue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
    expect(state.currentId).toBe('track-2');
    expect(state.isPlaying).toBe(true);
  });

  it('starts on the first playable track when no track is named', () => {
    startPlaylistQueue(
      PLAYLIST,
      [
        association('pending', TrackFileStatus.Pending, 0),
        stored('track-2', 1)
      ],
      null
    );

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-2'
    ]);
  });

  it('starts shuffled when asked', () => {
    startPlaylistQueue(
      PLAYLIST,
      [stored('track-1', 0), stored('track-2', 1), stored('track-3', 2)],
      null,
      true
    );

    const state = usePlayerStore.getState();
    expect(state.shuffle).toBe(true);
    expect(state.queue).toHaveLength(3);
  });

  it('refuses a playlist with nothing to play and starts nothing', () => {
    const started = startPlaylistQueue(
      PLAYLIST,
      [association('pending', TrackFileStatus.Pending, 0)],
      null
    );

    expect(started).toBe(false);
    expect(usePlayerStore.getState().queue).toHaveLength(0);
  });
});
