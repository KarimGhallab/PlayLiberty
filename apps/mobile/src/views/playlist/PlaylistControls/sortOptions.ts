import { PlaylistSort } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';

export interface SortOption {
  readonly value: PlaylistSort;
  readonly label: MessageKey<Messages>;
  readonly testID: string;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  {
    value: PlaylistSort.Playlist,
    label: 'detail.sortPlaylist',
    testID: 'playlist-sort-playlist'
  },
  {
    value: PlaylistSort.NewestFirst,
    label: 'detail.sortNewest',
    testID: 'playlist-sort-newest'
  },
  {
    value: PlaylistSort.OldestFirst,
    label: 'detail.sortOldest',
    testID: 'playlist-sort-oldest'
  }
];

/* The saved value is always one of the three; an unknown one reads as the
 * playlist's own order. */
export function sortLabelKey(sort: PlaylistSort): MessageKey<Messages> {
  if (sort === PlaylistSort.NewestFirst) {
    return 'detail.sortNewest';
  }

  if (sort === PlaylistSort.OldestFirst) {
    return 'detail.sortOldest';
  }

  return 'detail.sortPlaylist';
}
