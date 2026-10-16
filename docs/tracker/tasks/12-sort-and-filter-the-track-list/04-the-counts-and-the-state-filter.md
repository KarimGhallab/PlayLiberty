# 04: The counts and the state filter

**Status:** resolved

## Outcome

The tracks read takes an optional `state` query parameter, one of the five file states, and returns only that state's rows; its `total` is the filtered total, so the page walk stops at the rows the filter kept, no parameter returns every state, and an unknown one is a validation failure because the query is parsed through `PlaylistTracksQuerySchema`. The same response carries the counts: `counts` is an object keyed by the five file states, an aggregate over the whole playlist rather than the page or the filter, because the point of a count is what is available to filter to, and every state is a key including a zero. The aggregate groups by the file status alone, so the `sourceStatus: removed` overlay is not a bucket and a stored-but-removed track counts as stored. `TrackFileStatusCountsSchema`, `PlaylistTracksPageSchema` (the page plus the counts) and `PlaylistTracksQuerySchema` (the page query plus the state) join the shared contracts, with their types.

See [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).
