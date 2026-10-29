import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import type { Track } from '@playliberty/contracts';

import { readEndpoint } from '../../endpoints/endpoints';

const trackKey = (trackId: string) => ['track', trackId] as const;

/* One track by id: the instance-wide read a bare track link resolves. */
export function useTrack(trackId: string): UseQueryResult<Track, Error> {
  return useQuery({
    queryKey: trackKey(trackId),
    queryFn: () => readEndpoint(endpoints.track, { trackId })
  });
}
