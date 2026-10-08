import type { PlaylistAccess } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { resolvePlaylistAccess } from './playlistAccess.js';
import { canAccountAccessTrack, canAccountWriteTrack } from './trackAccess.js';

/*
 * The entry seam. Every playlist- or track-scoped service entry point is written
 * through it, and the handler it wraps runs only when the access check grants the
 * access the operation needs. The check is therefore part of the seam rather than
 * a line each entry point repeats: a new entry point is a new handler passed to
 * this, and one that reached the database without it would be a deliberate second
 * path rather than an omission.
 *
 * The rules themselves stay in `playlistAccess` and `trackAccess`. Those two keep
 * their own shapes on purpose: a playlist resolves to a level or to nothing, and a
 * track resolves to a boolean, because a track is reached through a holding
 * playlist and only "may read" and "may write" are asked of it. The seam is the
 * one place that turns either into the single outcome the rest of the server
 * reads, so a caller never branches on `null` versus `true` again.
 *
 * A denial is not a status. The route owns the mapping, because the surface
 * decides it: a playlist refusal is a 404 the client draws as "gone", and a track
 * read refusal is a 403 the track row draws differently. The seam says denied and
 * nothing more.
 */

/** What an operation needs of the access it resolves. */
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

/*
 * A playlist-scoped entry. The handler is handed the resolved level, so a view it
 * builds cannot disagree with the check that let it through.
 */
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

/*
 * A track-scoped entry. A track has no level of its own, so the handler takes
 * nothing: the only question a track answers is whether the operation is allowed.
 */
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
