# 37: One playable rule

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/player/playable/playable.ts` is the one rule. `isPlayable(track)` answers from a track's `fileStatus`; `hasPlayableTrack({ counts })` answers from the whole-playlist counts. The queue build filters with `isPlayable`, `TrackRow` derives its play affordance from it, and the detail header and the gallery item read `hasPlayableTrack`. The private predicate in `playerQueue.ts` and the inline `fileStatus === Stored` in `TrackRow` are gone.

The `hasPlayableTrack` cases leave `playerQueue.test.ts`; `playable.test.ts` covers both readers with the two agreement tests: a stored track and a counts map with a stored entry both answer true, and every non-stored status against a counts map holding no stored entry both answer false.

Verification: `pnpm run build` passes; `pnpm run lint` is clean; the web suite is 503 passed across 51 files; `pnpm test:e2e` is 35 passed. The queue build still admits only stored files, so no track enters the queue differently.

## Objective

One module answers whether a track is playable and whether a playlist has anything playable, and every surface reads it.

## Context

The queue module hides `isPlayable` privately. The track row rewrites `fileStatus === Stored` inline. The header reads a counts helper. The queue build filters the list. A row can offer a play the queue build refuses because one of the four statements changes first.

Architecture review 2026-10-19, candidate 4.

## Scope

- Export the rule for one track and for counts.
- The queue build, the counts helper, the track row, the header and the gallery item read it.
- Keep two data sources: a track for a row, counts for an aggregate. One rule, two readers.
- One test proves a stored track and a counts map with a stored entry agree. One test proves a non-stored track and a counts map without one agree.
- No behavior change to which tracks enter the queue.

## Out of scope

Queue ordering, shuffle, the filter and the player store.

## Blocking edges

None. Can start immediately.

## Verification

- The inline stored check in the track row is gone.
- The private predicate is exported or replaced by the shared rule.
- A row cannot offer a play that the queue build refuses.
- `pnpm run build`, `pnpm run lint`, the web suite and `pnpm test:e2e` pass.
