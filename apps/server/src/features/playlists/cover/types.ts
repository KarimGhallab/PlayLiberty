import type { Playlist } from '@playliberty/contracts';

/* Fractions of the oriented image, so a crop means the same rectangle whatever
 * the stored pixel size is. */
export interface CoverCrop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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

export type RemovePlaylistCoverResult =
  | { outcome: PlaylistCoverOutcome.Ok }
  | { outcome: PlaylistCoverOutcome.PlaylistNotFound };
