# 67: The detail count follows the filter without saying so

**State:** `resolved`
**Category:** `bug`

## Outcome

The identity card states the playlist's own size, and the filtered figure stays on the rail, which is the first shape the ticket allowed. `usePlaylistHeader` takes `total` from `playlist.trackCount` and no longer from the read's filtered total, so `countTotal` is gone from the seam and the detail passes no total at all. The paging window ("{shown} of {total}") is claimed only while no filter is in force: the detail hands `displayedCount` only when `activeState` is null, because a narrowed list owes a denominator the card does not carry.

Filtering the test playlist to `Stored 2` now leaves the card reading "3 tracks" beside a rail reading "All 3", and `Failed 0` leaves it reading "3 tracks" beside the named empty state rather than "0 tracks". Two unqualified numbers on one screen no longer disagree.

`PlaylistDetailPage.test.tsx` holds it in two cases: a chip narrows the list while the card keeps "3 tracks" and `All` restores the list, and a filter matching nothing keeps the card's own size instead of claiming an empty playlist. Both fail against the previous `countTotal` behavior.

The chosen shape is the ticket's first option, so the card never states a filtered figure at all: the narrowed count appears only on the chip, which names its own state. The card cannot be misread as the filtered list's size because it does not carry one, and the rail's "All N" and the card always agree.

The overturned decision is recorded where it was made: `12-sort-and-filter-the-track-list` gained the revised implementation decision: the card keeps the playlist's own count, and tickets `05` and `06` of that set carry the correction. The count unit and the card's own markup are unchanged.
