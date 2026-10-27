import type { QueryClient, QueryKey } from '@tanstack/react-query';

export interface OptimisticContext<Data> {
  readonly previous: Data | undefined;
}

/*
 * One optimistic patch: cancel the read in flight, snapshot it, apply the
 * change. The caller restores the snapshot on failure; on success the server's
 * answer replaces it.
 */
export async function optimisticPatch<Data>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  apply: (previous: Data) => Data
): Promise<OptimisticContext<Data>> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<Data>(queryKey);

  if (previous !== undefined) {
    queryClient.setQueryData<Data>(queryKey, apply(previous));
  }

  return { previous };
}

export function restoreOptimistic<Data>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  context: OptimisticContext<Data> | undefined
): void {
  if (context?.previous !== undefined) {
    queryClient.setQueryData(queryKey, context.previous);
  }
}
