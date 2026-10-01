import { and, eq, sql } from 'drizzle-orm';

import { AssociationOrigin } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  associations,
  playlists,
  suppressions,
  tracks
} from '../../platform/database/schema.js';

export enum AssociationOutcome {
  Added = 'added',
  AlreadyPresent = 'already_present',
  Removed = 'removed',
  Absent = 'absent'
}

export interface AddAssociationOptions {
  playlistId: string;
  trackId: string;
  origin: AssociationOrigin;
  position: number;
}

export interface RemoveAssociationOptions {
  playlistId: string;
  trackId: string;
}

/*
 * Where the next association goes. Adding a video means appending it, so the
 * position is the one past the highest already in the playlist, and an empty
 * playlist starts at zero. A caller adding several associations in one run reads
 * this once and increments, rather than asking again per row, which is why it is
 * a number rather than an "append" that recomputes.
 */
export function nextPositionFor(
  database: DatabaseHandle,
  playlistId: string
): number {
  const row = database.db
    .select({ value: sql<number | null>`max(${associations.position})` })
    .from(associations)
    .where(eq(associations.playlistId, playlistId))
    .get();

  return (row?.value ?? -1) + 1;
}

/*
 * `playlist.track_count` is a stored total, so it is only as trustworthy as the
 * number of places that can change it. These two functions are the whole of that
 * surface: an association is created here or deleted here, never by writing to
 * the association table directly, and the count moves in the same transaction as
 * the row it counts. A writer that inserted an association without them would
 * leave the library claiming a number the list does not contain, which is the one
 * failure the design record says is worse than having no count at all.
 *
 * The transaction matters as much as the arithmetic. A crash between the insert
 * and the increment would leave the count permanently low with no way to notice,
 * because nothing recomputes it.
 */
export function addAssociation(
  database: DatabaseHandle,
  options: AddAssociationOptions
): AssociationOutcome {
  return database.sqlite.transaction((): AssociationOutcome => {
    const existing = database.db
      .select({ id: associations.id })
      .from(associations)
      .where(
        sql`${associations.playlistId} = ${options.playlistId} and ${associations.trackId} = ${options.trackId}`
      )
      .get();

    if (existing !== undefined) {
      return AssociationOutcome.AlreadyPresent;
    }

    database.db
      .insert(associations)
      .values({
        playlistId: options.playlistId,
        trackId: options.trackId,
        origin: options.origin,
        position: options.position
      })
      .run();

    database.db
      .update(playlists)
      .set({
        trackCount: sql`${playlists.trackCount} + 1`,
        updatedAt: new Date().toISOString()
      })
      .where(eq(playlists.id, options.playlistId))
      .run();

    return AssociationOutcome.Added;
  })();
}

export function removeAssociation(
  database: DatabaseHandle,
  options: RemoveAssociationOptions
): AssociationOutcome {
  return database.sqlite.transaction((): AssociationOutcome => {
    // The video id is read with the association it belongs to, so the suppression
    // below cannot be written for a track the playlist never held.
    const existing = database.db
      .select({ videoId: tracks.videoId })
      .from(associations)
      .innerJoin(tracks, eq(associations.trackId, tracks.id))
      .where(
        and(
          eq(associations.playlistId, options.playlistId),
          eq(associations.trackId, options.trackId)
        )
      )
      .get();

    if (existing === undefined) {
      return AssociationOutcome.Absent;
    }

    database.db
      .delete(associations)
      .where(
        and(
          eq(associations.playlistId, options.playlistId),
          eq(associations.trackId, options.trackId)
        )
      )
      .run();

    // The decrement is bounded by the existing value, so a count can never go
    // negative even if something else removed rows behind these functions. A
    // negative count would be a lie the schema forbids rather than a number a
    // user could act on.
    database.db
      .update(playlists)
      .set({
        trackCount: sql`max(${playlists.trackCount} - 1, 0)`,
        updatedAt: new Date().toISOString()
      })
      .where(eq(playlists.id, options.playlistId))
      .run();

    // Removal always suppresses: the next sync must not put back what the listener
    // took out. The insert is a conflict-no-op, so removing a track that is
    // already suppressed cannot fail.
    database.db
      .insert(suppressions)
      .values({ playlistId: options.playlistId, videoId: existing.videoId })
      .onConflictDoNothing()
      .run();

    return AssociationOutcome.Removed;
  })();
}
