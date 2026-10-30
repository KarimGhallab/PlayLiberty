import { useQuery } from '@tanstack/react-query';

import type { AccountSummary } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { accountsKey } from '@playliberty/query';

import { apiClient } from './client';

/** The directory another account's display name resolves through. */
export function useAccountDirectory() {
  return useQuery({
    queryKey: accountsKey,
    queryFn: () => apiClient.send(endpoints.accounts),
    select: page => page.items
  });
}

/* Null is a real answer: an owner past the first page is a miss, and the card
 * must not draw an empty line for it. */
export function ownerNameFrom(
  directory: readonly AccountSummary[],
  ownerAccountId: string
): string | null {
  return (
    directory.find(account => account.id === ownerAccountId)?.displayName ??
    null
  );
}
