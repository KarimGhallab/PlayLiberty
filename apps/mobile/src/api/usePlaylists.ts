import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { libraryKey } from '@playliberty/query';

import { apiClient } from './client';

/* The route's maximum page, so the gallery's counts are whole up to this size;
 * later pages append beyond it. */
const MAX_PAGE = 200;

/** The gallery's one read. The server orders it pinned first, then first-sync
 * playlists, then by name. */
export function usePlaylists() {
  return useQuery({
    queryKey: libraryKey,
    queryFn: () =>
      apiClient.send(endpoints.playlists, {}, {}, { limit: MAX_PAGE })
  });
}
