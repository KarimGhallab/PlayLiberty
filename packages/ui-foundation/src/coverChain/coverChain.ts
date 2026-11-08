import type { Playlist } from '@playliberty/contracts';

export enum CoverFailure {
  None = 'none',
  Custom = 'custom',
  Track = 'track'
}

export type CoverLevel = 'custom' | 'track' | 'sleeve';

export interface CoverSelection {
  readonly level: CoverLevel;
  /** The cache version to append to the selected image, if it carries one. */
  readonly version: string | null;
}

export interface CoverSelectionOptions {
  /* The cover dialog previews the custom image alone; the surfaces draw both. */
  readonly includeCustom?: boolean;
}

type CoverFields = Pick<Playlist, 'coverUpdatedAt' | 'coverTrackId'>;

/* The custom image, then the first track's thumbnail, then the sleeve. A
 * failure at one image level falls to the next; a failure at the sleeve ends
 * the chain. */
export function selectPlaylistCover(
  playlist: CoverFields,
  failure: CoverFailure,
  options: CoverSelectionOptions = {}
): CoverSelection {
  if (
    options.includeCustom !== false &&
    playlist.coverUpdatedAt !== null &&
    failure === CoverFailure.None
  ) {
    return { level: 'custom', version: playlist.coverUpdatedAt };
  }

  if (playlist.coverTrackId !== null && failure !== CoverFailure.Track) {
    return { level: 'track', version: playlist.coverTrackId };
  }

  return { level: 'sleeve', version: null };
}

export function nextCoverFailure(
  level: CoverLevel,
  previous: CoverFailure
): CoverFailure {
  if (level === 'custom') {
    return CoverFailure.Custom;
  }

  return level === 'track' ? CoverFailure.Track : previous;
}

/* Either image's cache key moving resets the chain, so a replacement or a new
 * first track starts again at the custom level. */
export function coverChainKey(playlist: CoverFields): string {
  return `${playlist.coverUpdatedAt ?? ''}:${playlist.coverTrackId ?? ''}`;
}
