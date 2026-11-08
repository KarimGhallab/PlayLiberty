import type { QueryClient } from '@tanstack/react-query';

import { readPlaylistQueue } from '@playliberty/api-client';
import type { PlaylistTrack, Track } from '@playliberty/contracts';
import { isPlayable } from '@playliberty/player';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerPlaylist } from '../playerTrack/playerTrack';
import { playerTracks } from '../playerTrack/playerTrack';

export type StartIntent = 'play' | 'shuffle';

export type StartRefusal =
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreachable'; readonly error: unknown };

export type TrackStartRefusal =
  | StartRefusal
  | { readonly kind: 'missing' }
  | { readonly kind: 'unplayable'; readonly track: Track };

export type BareStartRefusal = {
  readonly kind: 'unplayable';
  readonly track: Track;
} | null;

export interface StartAtTrackOptions {
  /* A row press resumes the current track; a link entry leaves it alone. */
  readonly resumeCurrent?: boolean;
}

/** The playable entries of a queue read, in the server's order. */
export function playableTracks(
  items: readonly PlaylistTrack[]
): readonly PlaylistTrack[] {
  return items.filter(entry => isPlayable(entry.track));
}

/* The queue route is the whole playable playlist, so a start never inherits
 * the page a screen happens to hold. */
async function readPlayableQueue(
  client: QueryClient,
  playlistId: string
): Promise<readonly PlaylistTrack[]> {
  const items = await readPlaylistQueue(client, playlistId);

  return playableTracks(items);
}

/* The one read-then-start sequence: play takes the first track, shuffle takes
 * a random one, and a refusal is returned rather than drawn. */
export async function startAtPlaylist(
  client: QueryClient,
  playlist: PlayerPlaylist,
  intent: StartIntent
): Promise<StartRefusal | null> {
  let items: readonly PlaylistTrack[];

  try {
    items = await readPlayableQueue(client, playlist.id);
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

/* A track press reuses the queue this playlist already owns, so a shuffled
 * order survives. A link entry does not restart the track it names. */
export async function startAtTrack(
  client: QueryClient,
  playlist: PlayerPlaylist,
  trackId: string,
  options: StartAtTrackOptions = {}
): Promise<TrackStartRefusal | null> {
  const player = usePlayerStore.getState();

  if (player.playlistId === playlist.id) {
    if (player.currentId === trackId) {
      if (options.resumeCurrent !== false) {
        player.play(trackId);
      }

      return null;
    }

    if (player.queue.includes(trackId)) {
      player.play(trackId);
      return null;
    }
  }

  let items: readonly PlaylistTrack[];

  try {
    items = await readPlaylistQueue(client, playlist.id);
  } catch (error) {
    return { kind: 'unreachable', error };
  }

  const association = items.find(entry => entry.track.id === trackId);

  if (association === undefined) {
    return { kind: 'missing' };
  }

  if (!isPlayable(association.track)) {
    return { kind: 'unplayable', track: association.track };
  }

  if (items.length === 0) {
    return { kind: 'empty' };
  }

  usePlayerStore.getState().start(playerTracks(items), playlist, trackId);

  return null;
}

/* The bare route's one-track queue, which keeps the track's own metadata. */
export function startBareTrack(track: Track): BareStartRefusal {
  if (!isPlayable(track)) {
    return { kind: 'unplayable', track };
  }

  const player = usePlayerStore.getState();
  const alreadyBare =
    player.playlistId === null &&
    player.currentId === track.id &&
    player.queue.length === 1 &&
    player.queue[0] === track.id;

  if (alreadyBare) {
    return null;
  }

  player.startBareTrack({
    id: track.id,
    title: track.title,
    durationSeconds: track.durationSeconds,
    thumbnailPath: track.thumbnailPath
  });

  return null;
}

/* The queue route's every answer is re-applied over a queue that already
 * belongs to this playlist. */
export function applyPlaylistRefetch(
  playlistId: string,
  items: readonly PlaylistTrack[]
): void {
  usePlayerStore
    .getState()
    .applyRefetch(playlistId, playerTracks(playableTracks(items)));
}
