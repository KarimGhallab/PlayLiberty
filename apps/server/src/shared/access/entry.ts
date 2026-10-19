import type { PlaylistAccess } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { resolvePlaylistAccess } from './playlistAccess.js';
import { canAccountAccessTrack, canAccountWriteTrack } from './trackAccess.js';

/*
 * The entry seam: every playlist- or track-scoped entry goes through it, so the
 * need-to-level rule is stated here once and a denial is not a status.
 */

export enum AccessNeed {
  Read = 'read',
  Write = 'write',
  Owner = 'owner'
}

export enum EntryOutcome {
  Granted = 'granted',
  Denied = 'denied'
}

export type Entry<Result> =
  | { readonly outcome: EntryOutcome.Granted; readonly value: Result }
  | { readonly outcome: EntryOutcome.Denied };

function satisfies(access: PlaylistAccess, need: AccessNeed): boolean {
  if (need === AccessNeed.Read) {
    return true;
  }

  if (need === AccessNeed.Write) {
    return access === 'owner' || access === 'write';
  }

  return access === 'owner';
}

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
