import type { PlaylistTrack } from '@playliberty/contracts';

/*
 * The playlist's rows in queue order. A row the queue carries opens a group at
 * its own place; a row it does not carry joins the group opened before it, so
 * it stays in its playlist neighbourhood rather than at the end.
 */
export function orderTracksByQueue(
  tracks: readonly PlaylistTrack[],
  queue: readonly string[]
): PlaylistTrack[] {
  const rankById = new Map(queue.map((id, index) => [id, index] as const));
  const groups: PlaylistTrack[][] = [[]];
  const groupRank: number[] = [-1];
  let group = 0;

  for (const association of tracks) {
    const rank = rankById.get(association.track.id);

    if (rank === undefined) {
      groups[group]?.push(association);
      continue;
    }

    group = groups.length;
    groups.push([association]);
    groupRank.push(rank);
  }

  return groups
    .map((rows, index) => ({ rows, rank: groupRank[index] ?? -1 }))
    .sort((left, right) => left.rank - right.rank)
    .flatMap(entry => entry.rows);
}
