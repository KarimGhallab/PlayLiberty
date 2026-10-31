import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { AccountSummary } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { accountPageKey } from '@playliberty/query';

import { apiClient } from '../client';

export const ACCOUNTS_PAGE_SIZE = 50;

/* A page that came back empty stops the walk even if `total` disagrees, so a
 * shrinking directory cannot loop the picker. */
export function nextAccountsPageParam(lastPage: {
  readonly offset: number;
  readonly total: number;
  readonly items: readonly unknown[];
}): number | undefined {
  const loaded = lastPage.offset + lastPage.items.length;

  return lastPage.items.length > 0 && loaded < lastPage.total
    ? loaded
    : undefined;
}

export interface AccountPageRead {
  /* The loaded pages flattened, in the directory's display-name order. */
  readonly items: readonly AccountSummary[];
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly isFetching: boolean;
  readonly error: Error | null;
  readonly hasMore: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetchNextPageError: boolean;
  readonly fetchNextPage: () => void;
  readonly refetch: () => void;
}

/* The picker's directory read. It is deliberately not `useAccountDirectory`:
 * that one holds the first page only, for resolving an owner's name. */
export function useAccountPage(enabled: boolean): AccountPageRead {
  const query = useInfiniteQuery({
    queryKey: accountPageKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiClient.send(
        endpoints.accounts,
        {},
        {},
        { limit: ACCOUNTS_PAGE_SIZE, offset: pageParam }
      ),
    getNextPageParam: nextAccountsPageParam,
    enabled
  });
  const pages = query.data?.pages;
  const items = useMemo(
    () => pages?.flatMap(page => page.items) ?? [],
    [pages]
  );
  const fetchNextPage = useCallback(() => {
    void query.fetchNextPage();
  }, [query.fetchNextPage]);
  const refetch = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  return {
    items,
    isPending: query.isPending,
    isError: query.isError,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    error: query.error,
    hasMore: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage,
    refetch
  };
}
