# 02: The phone shows the retained view

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The filter cannot show the tracks a removal left behind](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md)
**Blocked by:** [`01`](01-the-shared-layer-learns-a-retained-view.md), for the token, the copy, the contract and the
server. Can start as soon as it lands.

## Observed

`STATUS_CHIPS` holds the five file statuses and types `value: TrackFileStatus`; `PlaylistControls` counts a chip with
`counts[chip.value]`; the detail's filter state is `TrackFileStatus | null`; the rails draw a chip at zero or hide it
per rail. The gallery aggregates `counts` over `PlaylistWithCounts` and filters playlists by `counts[state] > 0`.

## Expected

A seventh chip, last in both rails, reading "Retirée de YouTube" / "Removed from YouTube", carrying the retained count,
hidden at zero, and filtering the detail's list to the retained tracks and the gallery to the playlists holding one.

## Evidence

- `apps/mobile/src/shared/trackState/statusChips.ts`: the chip shape and the five entries; `totalStatusCount`.
- `apps/mobile/src/shared/components/Chip/Chip.tsx`: `ChipTone = 'accent' | TrackTone` and `toneColor`.
- `apps/mobile/src/views/playlist/PlaylistControls/PlaylistControls.tsx`: `counts[chip.value]` and the rail.
- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx`: `useState<TrackFileStatus | null>`, the empty
  sentence lookup, the provider is on the playlist read.
- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx` and
  `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx`: the aggregate, the reset when the active count is
  zero, and the `statusFilter` type.
- `apps/mobile/src/api/usePlaylistTracks/usePlaylistTracks.ts`: `remoteRemoved` is already returned.

## Work

1. Widen `statusChips.ts` to the filter union, add the sixth entry with the plum tone and the empty key, and keep
   `totalStatusCount` summing only the five buckets.
2. Add the chip's count: `PlaylistControls` takes `remoteRemoved` and draws it for that chip; every other chip keeps
   `counts[value]`.
3. The empty sentence needs the provider: pass the playlist's provider into the detail's empty-state call, which today
   renders `t(emptyFilterChip.empty)` with no values.
4. The chip is hidden at zero in both rails. Extend `ChipTone` with `'retained'` in the mobile Chip and map it to
   `tokenColor('tone-retained')`; leave `TrackTone` alone.
5. The gallery aggregates `remoteRemoved` beside the five counts, filters playlists by `remoteRemoved > 0`, and clears
   the filter when its active count reaches zero.
6. The rail's own reach is a known defect (tickets 73, 106): do not reorder the chips to compensate.

## Acceptance criteria

- [x] The chip is drawn last in the detail's rail and the gallery's rail, and not at all when its count is zero.
- [x] Selecting it narrows the detail to the retained tracks, and the chips keep the whole-playlist counts.
- [x] The empty state names the provider and uses the negated retention sentence; "Show all" restores the list.
- [x] The gallery aggregates retained tracks across the scoped playlists, shows only the playlists holding one, and
      clears the filter when the scoped count reaches zero.
- [x] The chip's tone is the plum token; the rows it reveals keep the removed grey.
- [x] The chip is a 48dp target with a name, a role, and its count in the accessible label.
- [x] Tests cover the chip's presence, the two filters, the empty sentence in both languages, and the zero rule.

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

## Verification

`pnpm run build`, `pnpm run lint:check` and the mobile suite (629 tests) pass. The new tests cover the retained chip's
last position, its two filters, the zero rule on both rails, and the empty sentence in English and French.
