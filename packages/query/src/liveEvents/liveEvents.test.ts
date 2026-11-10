import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LiveEventType } from '@playliberty/contracts';

import { cacheEffects } from '../cacheEffects/cacheEffects';
import { invalidateForLiveEvent } from './liveEvents';

function spyOnFacts() {
  const queryClient = new QueryClient();
  const everythingChanged = vi.spyOn(cacheEffects, 'everythingChanged');
  const playlistChanged = vi.spyOn(cacheEffects, 'playlistChanged');
  const playlistRemoved = vi.spyOn(cacheEffects, 'playlistRemoved');
  const trackChanged = vi.spyOn(cacheEffects, 'trackChanged');

  return {
    queryClient,
    everythingChanged,
    playlistChanged,
    playlistRemoved,
    trackChanged
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

/*
 * The keys are pinned in `cacheEffects.test.ts`, so this test only pins the
 * event-to-fact mapping; being pure, it needs no socket.
 */
describe('invalidateForLiveEvent', () => {
  it('names everything changed when ready arrives', () => {
    const { queryClient, everythingChanged } = spyOnFacts();

    invalidateForLiveEvent(queryClient, { type: LiveEventType.Ready });

    expect(everythingChanged).toHaveBeenCalledWith(queryClient);
  });

  it('names the playlist changed for a playlist change', () => {
    const { queryClient, playlistChanged } = spyOnFacts();

    invalidateForLiveEvent(queryClient, {
      type: LiveEventType.PlaylistChanged,
      playlistId: 'playlist-1'
    });

    expect(playlistChanged).toHaveBeenCalledWith(queryClient, 'playlist-1');
  });

  it('names the playlist removed for a removal', () => {
    const { queryClient, playlistRemoved } = spyOnFacts();

    invalidateForLiveEvent(queryClient, {
      type: LiveEventType.PlaylistRemoved,
      playlistId: 'playlist-1'
    });

    expect(playlistRemoved).toHaveBeenCalledWith(queryClient, 'playlist-1');
  });

  it('names the track changed for every playlist holding it', () => {
    const { queryClient, trackChanged } = spyOnFacts();

    invalidateForLiveEvent(queryClient, {
      type: LiveEventType.TrackChanged,
      playlistIds: ['playlist-1', 'playlist-2']
    });

    expect(trackChanged).toHaveBeenCalledWith(queryClient, [
      'playlist-1',
      'playlist-2'
    ]);
  });
});
