import { describe, expect, it } from 'vitest';

import type { Playlist } from '@playliberty/contracts';
import { ShareLevel } from '@playliberty/contracts';

import { canWritePlaylist } from './access.js';

function playlist(access: Playlist['access']): Playlist {
  return { access } as Playlist;
}

describe('canWritePlaylist', () => {
  it('lets the owner and a write collaborator change the playlist', () => {
    expect(canWritePlaylist(playlist('owner'))).toBe(true);
    expect(canWritePlaylist(playlist(ShareLevel.Write))).toBe(true);
  });

  it('lets a read collaborator and an unloaded playlist change nothing', () => {
    expect(canWritePlaylist(playlist(ShareLevel.Read))).toBe(false);
    expect(canWritePlaylist(undefined)).toBe(false);
  });
});
