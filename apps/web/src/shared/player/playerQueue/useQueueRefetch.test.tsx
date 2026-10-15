import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { PlaylistTrack } from '@playliberty/contracts';

import { usePlayerStore } from '../playerStore/playerStore';
import { startPlaylistQueue } from './playerQueue';
import { useQueueRefetch } from './useQueueRefetch';

const PLAYLIST = { id: 'playlist-1', name: 'Rain On The Window' };

function stored(id: string, position: number): PlaylistTrack {
  return {
    track: {
      id,
      provider: Provider.Youtube,
      videoId: `video-${id}`,
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
    position
  };
}

function Probe({
  playlist,
  tracks
}: {
  playlist: { id: string; name: string } | undefined;
  tracks: readonly PlaylistTrack[] | undefined;
}) {
  useQueueRefetch(playlist, tracks);
  return null;
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

/*
 * The seam wired the way production wires it: a tracks read's data is handed to
 * the hook, and the live queue merges. The merge rules themselves are the
 * store's, tested there; this is the wiring that made them load-bearing.
 */
describe('useQueueRefetch', () => {
  it("adopts the read's order and keeps the current one", () => {
    startPlaylistQueue(
      PLAYLIST,
      [stored('track-1', 0), stored('track-2', 1)],
      'track-1'
    );

    render(
      <Probe
        playlist={PLAYLIST}
        tracks={[
          stored('track-2', 0),
          stored('track-1', 1),
          stored('track-3', 2)
        ]}
      />
    );

    const state = usePlayerStore.getState();
    expect(state.queue.map(track => track.id)).toEqual([
      'track-2',
      'track-1',
      'track-3'
    ]);
    expect(state.currentId).toBe('track-1');
  });

  it('does nothing until the read has answered', () => {
    startPlaylistQueue(PLAYLIST, [stored('track-1', 0)], 'track-1');

    render(<Probe playlist={PLAYLIST} tracks={undefined} />);

    expect(usePlayerStore.getState().queue.map(track => track.id)).toEqual([
      'track-1'
    ]);
  });
});
