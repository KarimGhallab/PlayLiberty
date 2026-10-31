import type { Playlist } from '@playliberty/contracts';

/** The owner and a write collaborator may change the playlist. */
export function canWritePlaylist(playlist: Playlist | undefined): boolean {
  const access = playlist?.access ?? null;

  return access === 'owner' || access === 'write';
}
