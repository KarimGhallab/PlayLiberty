import { ShareLevel } from '@playliberty/contracts';
import type { PlaylistAccess } from '@playliberty/contracts';

/*
 * The one access rule: a resolved level satisfies a need when it is in that
 * need's list. Every query shape reads its share filter from here, so a new
 * level joins exactly the needs it grants, in one place.
 */

export enum AccessNeed {
  Read = 'read',
  Write = 'write',
  Owner = 'owner'
}

/* The table a new level joins: which resolved levels satisfy which need. */
const GRANTED: Readonly<Record<AccessNeed, readonly PlaylistAccess[]>> = {
  [AccessNeed.Read]: ['owner', ShareLevel.Read, ShareLevel.Write],
  [AccessNeed.Write]: ['owner', ShareLevel.Write],
  [AccessNeed.Owner]: ['owner']
};

export function satisfies(access: PlaylistAccess, need: AccessNeed): boolean {
  return GRANTED[need].includes(access);
}

/* The share levels a need accepts, for the SQL that decides in the database. */
export function shareLevelsFor(need: AccessNeed): readonly ShareLevel[] {
  return GRANTED[need].filter(
    (level): level is ShareLevel => level !== 'owner'
  );
}

/* Whether ownership alone satisfies the need. */
export function ownerGrants(need: AccessNeed): boolean {
  return GRANTED[need].includes('owner');
}
