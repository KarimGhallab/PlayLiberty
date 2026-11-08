import type { QueryClient } from '@tanstack/react-query';

import type { PlaylistTrack } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { playlistQueueKey } from '@playliberty/query';

import { isPlayable } from '@playliberty/player';

import { apiClient } from '../../api/client';
import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerPlaylist } from '../playerTrack/playerTrack';
import { playerTracks } from '../playerTrack/playerTrack';

export type StartIntent = 'play' | 'shuffle';

export type StartRefusal =
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreachable'; readonly error: unknown };

/** The queue route is the whole playable playlist, so a start never inherits
 * the page a screen happens to hold. */
export async function readPlayableQueue(
  client: QueryClient,
  playlistId: string
): Promise<readonly PlaylistTrack[]> {
  const data = await client.fetchQuery({
    queryKey: playlistQueueKey(playlistId),
    queryFn: () => apiClient.send(endpoints.playlistQueue, { playlistId })
  });

  return data.items.filter(entry => isPlayable(entry.track));
}

/* The one read-then-start sequence: play takes the first track, shuffle takes a
 * random one, and a refusal is returned rather than drawn. */
export async function startPlaylistPlayback(
  playlist: PlayerPlaylist,
  intent: StartIntent,
  read: () => Promise<readonly PlaylistTrack[]>
): Promise<StartRefusal | null> {
  let items: readonly PlaylistTrack[];

  try {
    items = await read();
  } catch (error) {
    return { kind: 'unreachable', error };
  }

  if (items.length === 0) {
    return { kind: 'empty' };
  }

  const index =
    intent === 'shuffle' ? Math.floor(Math.random() * items.length) : 0;
  const leader = items[index];

  if (leader === undefined) {
    return { kind: 'empty' };
  }

  usePlayerStore
    .getState()
    .start(
      playerTracks(items),
      playlist,
      leader.track.id,
      intent === 'shuffle'
    );

  return null;
}
