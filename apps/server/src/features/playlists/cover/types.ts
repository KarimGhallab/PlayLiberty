import type { Playlist } from '@playliberty/contracts';

export enum PlaylistCoverOutcome {
  Ok = 'ok',
  PlaylistNotFound = 'playlist_not_found',
  CoverNotFound = 'cover_not_found',
  InvalidImage = 'invalid_image'
}

export type SetPlaylistCoverResult =
  | { outcome: PlaylistCoverOutcome.Ok; playlist: Playlist }
  | { outcome: PlaylistCoverOutcome.PlaylistNotFound }
  | { outcome: PlaylistCoverOutcome.InvalidImage };

export type ReadPlaylistCoverResult =
  | { outcome: PlaylistCoverOutcome.Ok; coverPath: string }
  | { outcome: PlaylistCoverOutcome.PlaylistNotFound }
  | { outcome: PlaylistCoverOutcome.CoverNotFound };
