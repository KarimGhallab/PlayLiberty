import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, NeedsProvisioningError } from '../apiClient/ApiClient';

/* A 4xx is the server's answer, not a transient fault: only a 5xx or an
 * unreached server retries. */
const MAX_RETRIES = 3;

export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) {
    return false;
  }

  return failureCount < MAX_RETRIES;
}

/** The app's one server-state owner. A refused credential ends the session
 * rather than leaving a broken screen over a token the app no longer holds. */
export function createAppQueryClient(onRefused: () => void): QueryClient {
  const refuse = (error: Error): void => {
    if (error instanceof NeedsProvisioningError) {
      onRefused();
    }
  };

  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry } },
    queryCache: new QueryCache({ onError: refuse }),
    mutationCache: new MutationCache({ onError: refuse })
  });
}
