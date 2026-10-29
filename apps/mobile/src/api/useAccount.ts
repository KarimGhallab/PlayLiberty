import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';

import { apiClient } from './client';

/** The web's key for the caller's own account. */
export const ACCOUNT_KEY = ['me'] as const;

/** The caller's own account, which carries the role the sheet gates on. */
export function useAccount(enabled: boolean) {
  return useQuery({
    queryKey: ACCOUNT_KEY,
    queryFn: () => apiClient.send(endpoints.currentAccount),
    enabled
  });
}
