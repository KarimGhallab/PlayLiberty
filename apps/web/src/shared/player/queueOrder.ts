import type { PlaylistTrack } from '@playliberty/contracts';

import type { PlayerTrack } from './types';

/*
 * The playlist's rows in the order the queue plays them.
 *
 * The queue carries only the tracks that can play, while the list draws every
 * association so a track that is missing or still downloading stays answerable.
 * So a row the queue carries opens a group at that track's own place in the queue,
 * and a row the queue does not carry joins the group opened before it, which keeps
 * it inside the neighbourhood it has in the playlist's own order rather than
 * relegating it to the end. The groups are then emitted in queue order, the group
 * before the first queued row first, because it has no place of its own.
 *
 * A row the queue does not contain is either not stored yet or has left the
 * playlist since the queue was built; either way it is not somewhere the queue can
 * put it, so the playlist's order is the only answer left.
 */
export function orderTracksByQueue(
  tracks: readonly PlaylistTrack[],
  queue: readonly PlayerTrack[]
): PlaylistTrack[] {
  const rankById = new Map(
    queue.map((track, index) => [track.id, index] as const)
  );
  const groups: PlaylistTrack[][] = [[]];
  const groupRank: number[] = [-1];
  let group = 0;

  for (const association of tracks) {
    const rank = rankById.get(association.track.id);

    if (rank === undefined) {
      groups[group].push(association);
      continue;
    }

    group = groups.length;
    groups.push([association]);
    groupRank.push(rank);
  }

  return groups
    .map((rows, index) => ({ rows, rank: groupRank[index] }))
    .sort((left, right) => left.rank - right.rank)
    .flatMap(entry => entry.rows);
}
