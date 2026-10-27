import type { Playlist } from '@playliberty/contracts';

import type { Refused, Succeeded } from '../../../shared/refusal.js';

/* Fractions of the oriented image, so a crop means the same rectangle whatever
 * the stored pixel size is. */
export interface CoverCrop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type SetPlaylistCoverResult =
  { outcome: 'ok'; playlist: Playlist } | Refused;

export type ReadPlaylistCoverResult =
  { outcome: 'ok'; coverPath: string } | Refused;

export type RemovePlaylistCoverResult = Succeeded | Refused;
