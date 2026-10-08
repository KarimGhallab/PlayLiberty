import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cacheEffects } from './cacheEffects';

/*
 * The one place the keys are pinned. A fact names the reads it asks again and the
 * primitive it uses; the mutations and the live-event path only name the fact, so
 * the keys are asserted here rather than at each caller.
 */

function spyOnCache() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const reset = vi.spyOn(queryClient, 'resetQueries');

  return { queryClient, invalidate, reset };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the cache-effect map', () => {
  it('refreshes only the library when the library changed', () => {
    const { queryClient, invalidate, reset } = spyOnCache();

    cacheEffects.libraryChanged(queryClient);

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    expect(reset).not.toHaveBeenCalled();
  });

  it('refreshes one playlist and the library when a playlist changed', () => {
    const { queryClient, invalidate } = spyOnCache();

    cacheEffects.playlistChanged(queryClient, 'playlist-1');

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-1']
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('refreshes every named playlist and the library when a track changed', () => {
    const { queryClient, invalidate } = spyOnCache();

    cacheEffects.trackChanged(queryClient, ['playlist-1', 'playlist-2']);

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-1']
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-2']
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-3']
    });
  });

  it('refreshes every playlist read when every playlist changed', () => {
    const { queryClient, invalidate } = spyOnCache();

    cacheEffects.everyPlaylistChanged(queryClient);

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlist'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('resets a removed playlist and refreshes the library, with one primitive', () => {
    const { queryClient, invalidate, reset } = spyOnCache();

    cacheEffects.playlistRemoved(queryClient, 'playlist-1');

    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-1']
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('refreshes every read when everything changed', () => {
    const { queryClient, invalidate } = spyOnCache();

    cacheEffects.everythingChanged(queryClient);

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith();
  });
});
