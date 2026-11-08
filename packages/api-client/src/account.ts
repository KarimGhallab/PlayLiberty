import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { Account, AccountSummary } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import {
  accountPageKey,
  accountsKey,
  currentAccountKey
} from '@playliberty/query';

import { apiClient } from './configure.js';

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

export function accountsQueryOptions() {
  return {
    queryKey: accountsKey,
    queryFn: () => apiClient().send(endpoints.accounts)
  };
}

/* The only source of another account's display name: a shared item carries an
 * `ownerAccountId` only, and an owner past the first page is a miss. */
export function useAccountDirectory(): UseQueryResult<AccountSummary[], Error> {
  return useQuery({ ...accountsQueryOptions(), select: page => page.items });
}

export const currentAccountQuery = {
  queryKey: currentAccountKey,
  queryFn: () => apiClient().send(endpoints.currentAccount)
};

/* The only read that names the reader; the share picker omits its row, and
 * sharing with oneself is a route refusal. */
export function useCurrentAccount(
  enabled = true
): UseQueryResult<Account, Error> {
  return useQuery({ ...currentAccountQuery, enabled });
}

/*
 * The name an owner id resolves to, or null when absent. Null is a real answer
 * and must not be confused with the empty string, which renders a blank line.
 */
export function ownerNameFrom(
  directory: readonly AccountSummary[],
  ownerAccountId: string
): string | null {
  return (
    directory.find(account => account.id === ownerAccountId)?.displayName ??
    null
  );
}

export function accountPageQueryOptions(enabled: boolean) {
  return {
    queryKey: accountPageKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      apiClient().send(
        endpoints.accounts,
        {},
        {},
        { limit: ACCOUNTS_PAGE_SIZE, offset: pageParam }
      ),
    getNextPageParam: nextAccountsPageParam,
    enabled
  };
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
  const query = useInfiniteQuery(accountPageQueryOptions(enabled));
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
