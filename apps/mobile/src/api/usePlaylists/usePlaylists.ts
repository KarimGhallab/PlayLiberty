import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import type { PlaylistPage } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { libraryKey } from '@playliberty/query';

import { apiClient } from '../client';

/* The first page is the route's maximum, so the rail's counts are whole up to
 * this size; later pages append beyond it. */
const PAGE_SIZE = 200;

export function nextPageOffset(page: PlaylistPage): number | undefined {
  const loaded = page.offset + page.items.length;

  return page.items.length > 0 && loaded < page.total ? loaded : undefined;
}

/* The gallery reads one page shape; the infinite query holds the pages. */
export function flattenPlaylistPages(
  data: InfiniteData<PlaylistPage>
): PlaylistPage {
  const first = data.pages[0];

  return {
    items: data.pages.flatMap(page => page.items),
    total: first?.total ?? 0,
    limit: first?.limit ?? PAGE_SIZE,
    offset: 0
  };
}

/** The gallery's one read: the paged list, appended as the grid scrolls. */
export function usePlaylists() {
  return useInfiniteQuery({
    queryKey: libraryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiClient.send(
        endpoints.playlists,
        {},
        {},
        { limit: PAGE_SIZE, offset: pageParam }
      ),
    getNextPageParam: nextPageOffset,
    select: flattenPlaylistPages
  });
}
