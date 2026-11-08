import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@playliberty/api-client';

/*
 * A 4xx is the server's answer, not a transient fault: a revoked share's `404`
 * must reach the gone state at once. Only a 5xx or an unreached server retries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 3
    }
  }
});
