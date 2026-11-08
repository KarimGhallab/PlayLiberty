# 01: The shared layer learns a retained view

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The filter cannot show the tracks a removal left behind](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md)

## Outcome

`TrackFilterState` is the file-status enum plus the `REMOTE_REMOVED` literal, so the filter is a view and never a sixth
file status. The tracks query accepts it and the server branches once: the retained view is `stored` plus `removed`, and
its total is the same `remoteRemovedCount` the page reports.

`PlaylistWithCounts.remoteRemoved` is required. The list fills it from one grouped query that counts every page's
playlists at once, beside the five buckets, and `0` when nothing is retained. The existing statement-count test proves
the figure adds no per-row lookup.

`tone-retained` is the plum colour token, emitted to the web stylesheet and read by the mobile token module; it is not a
`TrackTone`. The chip's word is `trackState.removedFromChip` (`PluralMessage`, so French can say "Retirées"), and the
empty sentence is `detail.filterEmpty.remoteRemoved`, both interpolating the provider. `docs/DESIGN.md` records the
rail/partition rule and the filter-tone rule.
