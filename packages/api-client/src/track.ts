import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { Track } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { trackKey } from '@playliberty/query';

import { apiClient } from './configure.js';

export function trackQueryOptions(trackId: string | null, enabled = true) {
  return {
    queryKey: trackKey(trackId ?? ''),
    queryFn: () => {
      if (trackId === null) {
        throw new Error('A track read needs an id.');
      }

      return apiClient().send(endpoints.track, { trackId });
    },
    enabled: trackId !== null && enabled
  };
}

/* A track's metadata by id. Inside the instance the id is the read capability:
 * the link grants nothing and returns no association. */
export function useTrack(
  trackId: string | null,
  enabled = true
): UseQueryResult<Track, Error> {
  return useQuery(trackQueryOptions(trackId, enabled));
}
