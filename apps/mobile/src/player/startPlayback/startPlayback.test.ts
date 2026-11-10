import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { QueryClient } from '@tanstack/react-query';

import { readPlaylistQueue } from '@playliberty/api-client';
import type * as ApiClientModule from '@playliberty/api-client';
import type {
  AssociationOrigin,
  PlaylistTrack,
  Track
} from '@playliberty/contracts';
import {
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import { usePlayerStore } from '../playerStore/playerStore';
import {
  applyPlaylistRefetch,
  playableTracks,
  startAtPlaylist,
  startAtTrack,
  startBareTrack
} from './startPlayback';

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  readPlaylistQueue: jest.fn()
}));

const readQueue = jest.mocked(readPlaylistQueue);
const client = {} as QueryClient;
const playlist = { id: 'playlist-1', name: 'Rain On The Window' };

function track(
  id: string,
  fileStatus: TrackFileStatus = TrackFileStatus.Stored
): Track {
  return {
    id,
    provider: Provider.Youtube,
    videoId: `video-${id}`,
    title: `Track ${id}`,
    durationSeconds: 180,
    skipNonMusic: false,
    thumbnailPath: null,
    fileStatus,
    sourceStatus: TrackSourceStatus.Available,
    failureKind: null,
    failureReason: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  };
}

function association(item: Track, position = 0): PlaylistTrack {
  return {
    track: item,
    origin: 'remote' as AssociationOrigin,
    position
  };
}

const first = association(track('track-1'), 0);
const second = association(track('track-2'), 1);
const third = association(track('track-3'), 2);
const failed = association(track('track-4', TrackFileStatus.Failed), 3);

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
  readQueue.mockResolvedValue([first, second, third]);
});

describe('the playable queue', () => {
  it('keeps only the stored tracks', () => {
    expect(playableTracks([first, failed, second])).toEqual([first, second]);
  });
});

describe('starting a playlist', () => {
  it('starts at the first playable track', async () => {
    readQueue.mockResolvedValue([failed, second, third]);

    await expect(startAtPlaylist(client, playlist, 'play')).resolves.toBeNull();

    const state = usePlayerStore.getState();

    expect(state.queue).toEqual(['track-2', 'track-3']);
    expect(state.currentId).toBe('track-2');
    expect(state.playlistId).toBe('playlist-1');
    expect(state.shuffle).toBe(false);
    expect(state.isPlaying).toBe(true);
  });

  it('draws a shuffled leader from the whole playable queue', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    await startAtPlaylist(client, playlist, 'shuffle');

    const state = usePlayerStore.getState();

    expect(state.queue[0]).toBe('track-3');
    expect([...state.queue].sort()).toEqual(['track-1', 'track-2', 'track-3']);
    expect(state.currentId).toBe('track-3');
    expect(state.shuffle).toBe(true);
  });

  it('refuses an empty queue', async () => {
    readQueue.mockResolvedValue([failed]);

    await expect(startAtPlaylist(client, playlist, 'play')).resolves.toEqual({
      kind: 'empty'
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('returns the read failure', async () => {
    const error = new Error('offline');
    readQueue.mockRejectedValue(error);

    await expect(startAtPlaylist(client, playlist, 'play')).resolves.toEqual({
      kind: 'unreachable',
      error
    });
  });
});

describe('starting at a track', () => {
  it('reads the whole playlist and starts at the track', async () => {
    await startAtTrack(client, playlist, 'track-2');

    const state = usePlayerStore.getState();

    expect(state.queue).toEqual(['track-1', 'track-2', 'track-3']);
    expect(state.currentId).toBe('track-2');
    expect(state.playlistId).toBe('playlist-1');
  });

  it('jumps in a queue it already owns without a read', async () => {
    usePlayerStore
      .getState()
      .start([track('track-1'), track('track-2')], playlist, 'track-1');

    await startAtTrack(client, playlist, 'track-2');

    expect(readQueue).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().currentId).toBe('track-2');
  });

  it('leaves the current track alone for a link', async () => {
    usePlayerStore
      .getState()
      .start([track('track-1'), track('track-2')], playlist, 'track-1');
    usePlayerStore.getState().setPosition(30);
    usePlayerStore.getState().setPlaying(false);

    await startAtTrack(client, playlist, 'track-1', {
      resumeCurrent: false
    });

    const state = usePlayerStore.getState();

    expect(state.currentId).toBe('track-1');
    expect(state.positionSeconds).toBe(30);
    expect(state.isPlaying).toBe(false);
  });

  it('resumes the current track for a row press', async () => {
    usePlayerStore
      .getState()
      .start([track('track-1'), track('track-2')], playlist, 'track-1');
    usePlayerStore.getState().setPosition(30);
    usePlayerStore.getState().setPlaying(false);

    await startAtTrack(client, playlist, 'track-1');

    const state = usePlayerStore.getState();

    expect(state.currentId).toBe('track-1');
    expect(state.positionSeconds).toBe(30);
    expect(state.isPlaying).toBe(true);
  });

  it('reports a track that left the playlist', async () => {
    readQueue.mockResolvedValue([first, second]);

    await expect(startAtTrack(client, playlist, 'track-9')).resolves.toEqual({
      kind: 'missing'
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('reports a track that cannot play', async () => {
    readQueue.mockResolvedValue([failed, second]);

    await expect(startAtTrack(client, playlist, 'track-4')).resolves.toEqual({
      kind: 'unplayable',
      track: expect.objectContaining({ id: 'track-4' })
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('reads a queue it does not own', async () => {
    usePlayerStore
      .getState()
      .start([track('other')], { id: 'other', name: 'Other' }, 'other');

    await startAtTrack(client, playlist, 'track-2');

    expect(readQueue).toHaveBeenCalledWith(client, 'playlist-1');
    expect(usePlayerStore.getState().playlistId).toBe('playlist-1');
    expect(usePlayerStore.getState().currentId).toBe('track-2');
  });
});

describe('starting a bare track', () => {
  it('starts a one-track queue', () => {
    const item = track('track-1');

    expect(startBareTrack(item)).toBeNull();

    const state = usePlayerStore.getState();

    expect(state.playlistId).toBeNull();
    expect(state.queue).toEqual(['track-1']);
    expect(state.currentId).toBe('track-1');
    expect(state.tracks['track-1']?.title).toBe('Track track-1');
  });

  it('refuses a track that cannot play', () => {
    const item = track('track-1', TrackFileStatus.Failed);

    expect(startBareTrack(item)).toEqual({
      kind: 'unplayable',
      track: item
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('does not restart the bare track it already holds', () => {
    const item = track('track-1');

    usePlayerStore.getState().startBareTrack({
      id: item.id,
      title: item.title,
      durationSeconds: item.durationSeconds,
      thumbnailPath: item.thumbnailPath
    });
    usePlayerStore.getState().setPlaying(false);

    expect(startBareTrack(item)).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('re-applying a queue read', () => {
  it('merges only the playable tracks into the matching queue', () => {
    usePlayerStore.getState().start([track('track-1')], playlist, 'track-1');

    applyPlaylistRefetch('playlist-1', [first, failed, second]);

    expect(usePlayerStore.getState().queue).toEqual(['track-1', 'track-2']);
  });

  it('leaves another playlist queue alone', () => {
    usePlayerStore
      .getState()
      .start([track('other')], { id: 'other', name: 'Other' }, 'other');

    applyPlaylistRefetch('playlist-1', [first, second]);

    expect(usePlayerStore.getState().queue).toEqual(['other']);
  });
});
