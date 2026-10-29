import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { currentAccountKey } from '@playliberty/query';

import { apiClient } from './client';

/** The caller's own account, which carries the role the sheet gates on. */
export function useAccount(enabled: boolean) {
  return useQuery({
    queryKey: currentAccountKey,
    queryFn: () => apiClient.send(endpoints.currentAccount),
    enabled
  });
}
