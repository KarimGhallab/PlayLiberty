import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EgressRead } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { egressKey } from '@playliberty/query';

import { commandEndpoint, readEndpoint } from '../../endpoints/endpoints';

/* The Egress client: the operator's pool read and the two actions that answer
 * it whole. */

/* The operator's pool: an admin-only read, so a 404 here is the gate, not a
 * fault. */
export function useEgress(): UseQueryResult<EgressRead, Error> {
  return useQuery({
    queryKey: egressKey,
    queryFn: () => readEndpoint(endpoints.egress)
  });
}

/* The switch action answers the whole read, so the page updates in one
 * response. */
export function useSwitchEgress(): UseMutationResult<
  EgressRead,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      commandEndpoint(endpoints.switchEgress, { name }),
    onSuccess: read => {
      queryClient.setQueryData(egressKey, read);
    }
  });
}

/* The check action answers the whole read and never changes the exit. */
export function useCheckEgress(): UseMutationResult<EgressRead, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => commandEndpoint(endpoints.checkEgress),
    onSuccess: read => {
      queryClient.setQueryData(egressKey, read);
    }
  });
}
