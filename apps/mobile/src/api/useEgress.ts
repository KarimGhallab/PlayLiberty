import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import type { EgressRead } from '@playliberty/contracts';
import { egressKey } from '@playliberty/query';

import { apiClient } from './client';

/* The operator's pool: an admin-only read, so a 404 is the route's gate rather
 * than a fault the screen should explain. */
export function useEgress() {
  return useQuery({
    queryKey: egressKey,
    queryFn: () => apiClient.send(endpoints.egress)
  });
}

/* The switch answers the whole read, so the page updates in one response. */
export function useSwitchEgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiClient.send(endpoints.switchEgress, { name }),
    onSuccess: (read: EgressRead) => {
      queryClient.setQueryData(egressKey, read);
    }
  });
}

/* The check answers the whole read and never changes the exit. */
export function useCheckEgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.send(endpoints.checkEgress),
    onSuccess: (read: EgressRead) => {
      queryClient.setQueryData(egressKey, read);
    }
  });
}
