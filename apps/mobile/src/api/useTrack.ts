import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { trackKey } from '@playliberty/query';

import { apiClient } from './client';

/* A track's metadata by id. Inside the instance the id is the read capability:
 * the link grants nothing and returns no association. */
export function useTrack(trackId: string | null, enabled = true) {
  return useQuery({
    queryKey: trackKey(trackId ?? ''),
    queryFn: () => {
      if (trackId === null) {
        throw new Error('A track read needs an id.');
      }

      return apiClient.send(endpoints.track, { trackId });
    },
    enabled: trackId !== null && enabled
  });
}
