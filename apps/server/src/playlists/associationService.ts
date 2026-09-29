import { eq, sql } from 'drizzle-orm';

import { AssociationOrigin } from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import { associations, playlists } from '../db/schema.js';

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
    const deleted = database.db
      .delete(associations)
      .where(
        sql`${associations.playlistId} = ${options.playlistId} and ${associations.trackId} = ${options.trackId}`
      )
      .run();

    if (deleted.changes === 0) {
      return AssociationOutcome.Absent;
    }

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

    return AssociationOutcome.Removed;
  })();
}
