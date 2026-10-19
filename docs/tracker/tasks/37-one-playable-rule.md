# One playable rule

Status: open
Labels: `enhancement`, `ready-for-agent`

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
