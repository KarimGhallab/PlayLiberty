import type { PlaylistPage } from '@playliberty/contracts';

/* The optimistic patch behind a pin: the flag flips on the cached page, and the
 * gallery regroups. The server owns the final order. */
export function pinPlaylistInPage(
  page: PlaylistPage,
  playlistId: string,
  pinned: boolean
): PlaylistPage {
  return {
    ...page,
    items: page.items.map(item =>
      item.id === playlistId ? { ...item, pinned } : item
    )
  };
}
