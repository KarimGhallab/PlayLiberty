import type { PlaylistTrack } from '@playliberty/contracts';

/* How far into a track a previous press still means the entry before it. */
export const PREVIOUS_GRACE_SECONDS = 5;

/** A random entry, or undefined when empty. */
export function randomItem<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }

  return items[Math.floor(Math.random() * items.length)];
}

/* Fisher-Yates over the rest, the leader hoisted to the front: the transport
 * starts on the first entry, so shuffling changes order, not track. */
export function shuffleIds(
  ids: readonly string[],
  leaderId: string | null
): string[] {
  const leader =
    leaderId === null || !ids.includes(leaderId) ? undefined : leaderId;
  const rest = ids.filter(id => id !== leader);

  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return leader === undefined ? rest : [leader, ...rest];
}

export function shuffleWithLeader<T>(
  items: readonly T[],
  leaderId: string | null,
  idOf: (item: T) => string
): T[] {
  const byId = new Map(items.map(item => [idOf(item), item] as const));

  return shuffleIds(items.map(idOf), leaderId)
    .map(id => byId.get(id))
    .filter((item): item is T => item !== undefined);
}

/* A shuffled refetch keeps the order already playing for known ids; new ids
 * join at the end in the server's order and a missing id is simply gone. */
export function mergeIds(
  currentIds: readonly string[],
  incomingIds: readonly string[]
): string[] {
  const incoming = new Set(incomingIds);
  const kept = currentIds.filter(id => incoming.has(id));
  const keptIds = new Set(kept);

  return [...kept, ...incomingIds.filter(id => !keptIds.has(id))];
}

export function mergeById<T>(
  current: readonly T[],
  incoming: readonly T[],
  idOf: (item: T) => string
): T[] {
  const incomingById = new Map(
    incoming.map(item => [idOf(item), item] as const)
  );

  return mergeIds(current.map(idOf), incoming.map(idOf))
    .map(id => incomingById.get(id))
    .filter((item): item is T => item !== undefined);
}

/* Rows in queue order: a carried row opens a group at its place; an uncarried
 * row joins the group before it, staying in its playlist neighbourhood. */
export function orderTracksByQueue(
  tracks: readonly PlaylistTrack[],
  queueIds: readonly string[]
): PlaylistTrack[] {
  const rankById = new Map(queueIds.map((id, index) => [id, index] as const));
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

export type PreviousMove = 'previous' | 'restart';

/* Inside the grace window, step back; past it or on the first track, restart in
 * place. Null when nothing is current. */
export function previousMove(
  index: number,
  positionSeconds: number
): PreviousMove | null {
  if (index < 0) {
    return null;
  }

  return index > 0 && positionSeconds < PREVIOUS_GRACE_SECONDS
    ? 'previous'
    : 'restart';
}
