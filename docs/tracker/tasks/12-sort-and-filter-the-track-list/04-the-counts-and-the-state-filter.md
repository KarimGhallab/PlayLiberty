# 04: The counts and the state filter

**Blocked by:** [`01`](01-the-saved-sort-on-a-playlist.md).
**Status:** resolved

## Outcome

Implemented and verified. The tracks read takes an optional `state` query parameter, one of the five file states,
and returns only that state's rows; its `total` is the filtered total, so the page walk stops at the rows the
filter kept. No parameter returns every state, and an unknown one is a validation failure, because the query is
parsed through `PlaylistTracksQuerySchema`.

The same response carries the counts: `counts` is an object keyed by the five file states, an aggregate over the
whole playlist rather than the page or the filter. The counts never follow the filter, because the point of a
count is what is available to filter to. The aggregate groups by the file status alone, so the
`sourceStatus: removed` overlay is not a bucket and a stored-but-removed track counts as stored. Every state is a
key including a zero, because the chips are drawn from this.

The contract changes: `TrackFileStatusCountsSchema`, `PlaylistTracksPageSchema` (the page plus the counts) and
`PlaylistTracksQuerySchema` (the page query plus the state) join the shared contracts, with their types. The
unfiltered `total` stays the playlist's stored count rather than a second count over the rows; the filtered
`total` is the state's own bucket from the aggregate the read already pays for.

The route tests: the state narrows the page and its total; no state returns every state; the counts cover the
whole playlist and do not follow the filter; a stored-but-removed track counts as stored; an unknown state is a
validation failure. The existing tracks tests now parse the response through `PlaylistTracksPageSchema`, so the
counts are held to the contract everywhere.

Verification: `pnpm test:unit` (server 359, web 408, packages 79), `pnpm run build`, `pnpm run lint`, the e2e
typecheck and prettier pass. No em dashes. Not committed.
