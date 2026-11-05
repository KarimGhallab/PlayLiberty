# 03: The web shows the retained view

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The filter cannot show the tracks a removal left behind](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md)
**Blocked by:** [`01`](01-the-shared-layer-learns-a-retained-view.md), for the token, the copy, the contract and the
server. Can start as soon as it lands.

## Observed

`PlaylistFilterChips` owns a local `CHIPS` list of All plus the five statuses, counts a chip with `counts[chip.value]`,
and types `active: TrackFileStatus | null`; `ChipTone` stops at `unavailable`. The detail holds the filter in state and
derives its empty sentence by template literal; the library aggregates `counts` over `PlaylistWithCounts` and filters
playlists by `counts[status] > 0`, clearing a filter whose active count reaches zero.

## Expected

A seventh chip, last in both rails, reading "Removed from YouTube", carrying the retained count, hidden at zero,
filtering the detail's list to the retained tracks and the gallery to the playlists holding one, in the plum tone.

## Evidence

- `apps/web/src/shared/components/PlaylistFilterChips/PlaylistFilterChips.tsx`: `CHIPS`, `totalOf`, `active`.
- `apps/web/src/shared/components/Chip/Chip.tsx`: `ChipTone` and the `[data-tone]` rules in
  `Chip.module.scss`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx`: `useState<TrackFileStatus | null>`,
  `detail.filterEmpty.${activeState}`, and the provider is on the playlist read.
- `apps/web/src/views/library/LibraryPage/LibraryPage.tsx`: `totalStatusCounts`, the playlist filter, the reset.
- `apps/web/src/shared/api/clients/playlistClient/playlistClient.ts`: `remoteRemoved` is already returned by the read.

## Work

1. Widen `CHIPS` and `active` to the filter union; add the chip's count from a new `remoteRemoved` prop; keep `totalOf`
   summing the five buckets.
2. Add `'retained'` to `ChipTone` with a `[data-tone='retained'] { --chip-tone: var(--tone-retained); }` rule. The
   retained tone is chromatic, so the chip takes the tone on its label and border, unlike stored and pending.
3. Hide the chip at zero in both rails, including `showEmpty` false in the library, which already filters by count.
4. The detail's empty sentence is derived by template literal; the retained one needs the provider, so it cannot be a
   bare `detail.filterEmpty.${state}` lookup. Branch it and pass the provider.
5. The library aggregates `remoteRemoved` beside the five counts, filters playlists by `remoteRemoved > 0`, and clears
   the filter when the scoped count reaches zero.
6. The prototype that chose the tone (`KeptChipPrototype`, `PrototypeSwitcher`) is deleted with the decision; do not
   resurrect it.

## Acceptance criteria

- [ ] The chip is drawn last in both rails, hidden at zero, in the plum tone.
- [ ] Selecting it narrows the detail to the retained tracks; the chips keep the whole-playlist counts; All restores.
- [ ] The empty state names the provider; the library shows only the playlists holding a retained track and clears the
      filter when the scoped count reaches zero.
- [ ] Keyboard: the chip is a button in the tab order, with its count in the accessible name, and the rail's focus ring
      is unchanged.
- [ ] No axe violations on either rail.
- [ ] Tests cover the chip's presence, both filters, the empty copy, the reset, and the zero rule.
