import type { PlaylistTrack } from '@playliberty/contracts';

/** The metadata the bar draws; a stream address is derived only when reached. */
export interface PlayerTrack {
  readonly id: string;
  readonly title: string;
  readonly durationSeconds: number | null;
  readonly thumbnailPath: string | null;
}

export interface PlayerPlaylist {
  readonly id: string;
  readonly name: string;
}

/** The playable reads become the queue's metadata, in the server's order. */
export function playerTracks(
  items: readonly PlaylistTrack[]
): readonly PlayerTrack[] {
  return items.map(({ track }) => ({
    id: track.id,
    title: track.title,
    durationSeconds: track.durationSeconds,
    thumbnailPath: track.thumbnailPath
  }));
}
