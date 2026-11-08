import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { EgressRead } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { egressKey } from '@playliberty/query';

import { apiClient } from './configure.js';

/* The operator's pool: an admin-only read, so a 404 here is the gate, not a
 * fault. */
export function egressQueryOptions() {
  return {
    queryKey: egressKey,
    queryFn: () => apiClient().send(endpoints.egress)
  };
}

export function useEgress(): UseQueryResult<EgressRead, Error> {
  return useQuery(egressQueryOptions());
}

/* The switch action answers the whole read, so the page updates in one
 * response. */
export function switchEgressOptions(queryClient: QueryClient) {
  return {
    mutationFn: (name: string) =>
      apiClient().send(endpoints.switchEgress, { name }),
    onSuccess: (read: EgressRead) => {
      queryClient.setQueryData(egressKey, read);
    }
  };
}

export function useSwitchEgress(): UseMutationResult<
  EgressRead,
  Error,
  string
> {
  return useMutation(switchEgressOptions(useQueryClient()));
}

/* The check action answers the whole read and never changes the exit. */
export function checkEgressOptions(queryClient: QueryClient) {
  return {
    mutationFn: () => apiClient().send(endpoints.checkEgress),
    onSuccess: (read: EgressRead) => {
      queryClient.setQueryData(egressKey, read);
    }
  };
}

export function useCheckEgress(): UseMutationResult<EgressRead, Error, void> {
  return useMutation(checkEgressOptions(useQueryClient()));
}
