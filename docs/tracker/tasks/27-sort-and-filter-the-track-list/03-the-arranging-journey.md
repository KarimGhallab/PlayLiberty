# 03: The arranging journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-pinned-sort-and-the-wrapping-chips.md)

## Outcome

`detail-filter.yaml` became `detail-arrange.yaml`. It opens `OWNED_PLAYLIST`, swipes the list once until
`playlist-identity` leaves, and asserts `detail-sort` and `filter-all` keep their place: the pinned band is proven on
the device.

It selects Playlist order, then Newest first, each from a reopened sheet, and reopens once more to assert the newest
radio is checked. Selecting Playlist order first makes the newest press a real write on every run, whether the saved
value started as the playlist's own order, oldest or newest. It filters to Failed, keeps the empty branch, returns to
All, and ends in the library.

The flow reads no copy: the sheet's options and the chips are found by their ids. The sideways chip swipes are gone
because the chips wrap and every chip is one tap. The README names the journey and replaces the chip-rail paragraph
with the pinned band's rule.

## Verification

- The flow passed twice in a row on `emulator-5554` with `OWNED_PLAYLIST=Paradis`; the second run started from
  `newest_first`, so the first press of Playlist order wrote before the newest press wrote again.
- The database held `newest_first` for `Paradis` after the first run.
- No source changed; the flow and the README are the ticket's artifacts.

See [`27-sort-and-filter-the-track-list`](../../specs/27-sort-and-filter-the-track-list.md).
