import type { InfiniteData } from '@tanstack/react-query';

import type { PlaylistPage, PlaylistWithCounts } from '@playliberty/contracts';

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

/** A created playlist leads the first page until the next read replaces it; a
 * source the account already holds is only marked syncing where it stands. */
export function insertPlaylistInPages(
  data: InfiniteData<PlaylistPage>,
  playlist: PlaylistWithCounts
): InfiniteData<PlaylistPage> {
  const known = data.pages.some(page =>
    page.items.some(item => item.id === playlist.id)
  );

  if (known) {
    return {
      ...data,
      pages: data.pages.map(page => ({
        ...page,
        items: page.items.map(item =>
          item.id === playlist.id
            ? { ...item, syncStatus: playlist.syncStatus }
            : item
        )
      }))
    };
  }

  const first = data.pages[0];

  if (first === undefined) {
    return data;
  }

  return {
    ...data,
    pages: [
      {
        ...first,
        items: [playlist, ...first.items],
        total: first.total + 1
      },
      ...data.pages.slice(1)
    ]
  };
}
