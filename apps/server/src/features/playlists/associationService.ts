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

/* The next position: one past the highest, zero when empty. Returning a number
 * lets a caller adding several read once and increment. */
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

/* These two functions are the whole surface that changes `track_count`; it
 * moves in the same transaction as its row, because nothing recomputes it. */
export function addAssociation(
  database: DatabaseHandle,
  options: AddAssociationOptions
): AssociationOutcome {
  return database.unitOfWork((): AssociationOutcome => {
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
  });
}

export function removeAssociation(
  database: DatabaseHandle,
  options: RemoveAssociationOptions
): AssociationOutcome {
  return database.unitOfWork((): AssociationOutcome => {
    // The video id comes from the association, so the suppression cannot name
    // an unheld track.
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

    // The decrement is bounded at zero, so the count can never go negative.
    database.db
      .update(playlists)
      .set({
        trackCount: sql`max(${playlists.trackCount} - 1, 0)`,
        updatedAt: new Date().toISOString()
      })
      .where(eq(playlists.id, options.playlistId))
      .run();

    // Removal always suppresses, so the next sync cannot restore the track.
    // The insert is a conflict-no-op, so it cannot fail.
    database.db
      .insert(suppressions)
      .values({ playlistId: options.playlistId, videoId: existing.videoId })
      .onConflictDoNothing()
      .run();

    return AssociationOutcome.Removed;
  });
}
