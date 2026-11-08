# 02: The phone shows the retained view

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The filter cannot show the tracks a removal left behind](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md)

## Outcome

`statusChips.ts` widens its value to `TrackFilterState` and adds the retained entry last, with `tone: 'retained'` and
`detail.filterEmpty.remoteRemoved`. `statusCount` and `statusChipCount` read the retained figure from `remoteRemoved`
and every other chip from the five buckets; `totalStatusCount` still sums only those five. `visibleStatusChips` hides
the retained chip at zero even while its view is in force, and keeps the existing active-at-zero rule for the buckets.

`Chip` accepts the `retained` tone and maps it to `tokenColor('tone-retained')`, so the selected label, border and dot
take the plum. Rows still use `TrackTone` and keep the removed grey.

`PlaylistControls` and `GalleryFilterBar` take the retained count and the provider, so the chip's word and empty
sentence interpolate `YouTube` (or another provider later). The detail's filter state is the union and passes it to the
tracks read. The gallery aggregates `remoteRemoved` beside the five counts over the scoped playlists, filters playlists
by `remoteRemoved > 0`, and keeps clearing a filter whose scoped count reaches zero.
