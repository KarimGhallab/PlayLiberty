# 03: The web shows the retained view

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The filter cannot show the tracks a removal left behind](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md)

## Outcome

`PlaylistFilterChips` widens its value to `TrackFilterState`, adds the retained entry last, and takes `remoteRemoved`
and `provider`. Its count comes from `remoteRemoved`; the five buckets and `totalOf` are unchanged. The retained chip is
hidden at zero even when `showEmpty` draws the bucket zeros, and it carries the plum `retained` tone.

`Chip` accepts `retained` and `Chip.module.scss` maps it to `--tone-retained`, so the selected word, border and dot take
the plum. The other tones and the focus ring are unchanged.

`PlaylistDetailPage` holds the filter as the union, passes the retained count and provider to the rail, and branches
the empty sentence so the retained view names the provider while the bucket views keep their template lookup.

`LibraryPage` aggregates `remoteRemoved` beside the five counts over the scoped playlists, filters by
`remoteRemoved > 0`, and clears the filter when the scoped retained count reaches zero. `LibraryFilterBar` forwards the
retained count and provider to the shared rail.
