import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { Account, AccountSummary } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';

import { readEndpoint } from '../../endpoints/endpoints';

/*
 * The account client: the reader, the directory another account's display name
 * resolves through, and the one key each is read under.
 */

const accountsKey = ['accounts'] as const;
const currentAccountKey = ['me'] as const;

/* The only source of another account's display name: a shared item carries an
 * `ownerAccountId` only, and an owner past the first page is a miss. */
export function useAccountDirectory(): UseQueryResult<AccountSummary[], Error> {
  return useQuery({
    queryKey: accountsKey,
    queryFn: () => readEndpoint(endpoints.accounts),
    select: page => page.items
  });
}

/* The only read that names the reader; the share picker omits its row, and
 * sharing with oneself is a route refusal. */
export const currentAccountQuery = {
  queryKey: currentAccountKey,
  queryFn: () => readEndpoint(endpoints.currentAccount)
};

export function useCurrentAccount(): UseQueryResult<Account, Error> {
  return useQuery(currentAccountQuery);
}

/*
 * The name an owner id resolves to, or null when absent. Null is a real answer
 * and must not be confused with an empty string, which renders a blank line.
 */
export function ownerNameFrom(
  directory: AccountSummary[],
  ownerAccountId: string
): string | null {
  return (
    directory.find(account => account.id === ownerAccountId)?.displayName ??
    null
  );
}
