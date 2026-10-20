import type { PlaylistAccess } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { resolvePlaylistAccess } from './playlistAccess.js';
import { AccessNeed, satisfies } from './rule.js';
import { canAccountAccessTrack, canAccountWriteTrack } from './trackAccess.js';

export { AccessNeed };

/*
 * The entry seam: every playlist- or track-scoped entry goes through it, so a
 * denial is structural. The rule it asks lives in `rule.ts`.
 */

export enum EntryOutcome {
  Granted = 'granted',
  Denied = 'denied'
}

export type Entry<Result> =
  | { readonly outcome: EntryOutcome.Granted; readonly value: Result }
  | { readonly outcome: EntryOutcome.Denied };

/* The handler gets the resolved level, so a view it builds cannot disagree with
 * the check. */
export function playlistEntry<Result>(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  need: AccessNeed,
  handler: (access: PlaylistAccess) => Result
): Entry<Result> {
  const access = resolvePlaylistAccess(database, playlistId, accountId);

  if (access === null || !satisfies(access, need)) {
    return { outcome: EntryOutcome.Denied };
  }

  return { outcome: EntryOutcome.Granted, value: handler(access) };
}

/* A track has no level of its own, so the handler takes nothing. */
export function trackEntry<Result>(
  database: DatabaseHandle,
  trackId: string,
  accountId: string,
  need: AccessNeed.Read | AccessNeed.Write,
  handler: () => Result
): Entry<Result> {
  const allowed =
    need === AccessNeed.Read
      ? canAccountAccessTrack(database, trackId, accountId)
      : canAccountWriteTrack(database, trackId, accountId);

  return allowed
    ? { outcome: EntryOutcome.Granted, value: handler() }
    : { outcome: EntryOutcome.Denied };
}
