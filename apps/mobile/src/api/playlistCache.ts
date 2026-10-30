import type { InfiniteData } from '@tanstack/react-query';

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

/** A pinned playlist can sit on any loaded page, so every page is patched. */
export function pinPlaylistInPages(
  data: InfiniteData<PlaylistPage>,
  playlistId: string,
  pinned: boolean
): InfiniteData<PlaylistPage> {
  return {
    ...data,
    pages: data.pages.map(page => pinPlaylistInPage(page, playlistId, pinned))
  };
}
