import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { libraryKey } from '@playliberty/query';

import { apiClient } from './client';

/** The gallery's one read. The server orders it pinned first, then first-sync
 * playlists, then by name. */
export function usePlaylists() {
  return useQuery({
    queryKey: libraryKey,
    queryFn: () => apiClient.send(endpoints.playlists)
  });
}
