# 12: The detail journeys

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`05`](05-removal-and-deletion-are-deferred.md), [`06`](06-the-header-plays-and-shuffles.md),
[`08`](08-the-sort-and-the-chips.md)

## Outcome

Three Maestro flows live beside the app, one per detail journey:

- `detail-play` opens the gallery's first card, plays the first playable row and asserts that row's `track-now`
  mark, not the player bar (which belongs to spec `23`).
- `detail-filter` opens the first card, sweeps the chip rail twice to reach Failed, accepts either the filtered rows
  or the filter-empty body, then sweeps back to All and sees the whole list again.
- `detail-remove-undo` opens the playlist named by `OWNED_PLAYLIST`, copies the first row's title, opens its lane,
  removes it, presses the snackbar's Undo inside the six-second window and asserts the same title is back.

Each flow stops and relaunches the app, uses the existing sign-in fallback when signed out, and ends with Back in
the gallery. Selectors are the test ids, so a French device runs them unchanged; the verification run was French.

The harness notes are recorded in `apps/mobile/.maestro/README.md`: the chip rail is horizontal, so the filter flow
sweeps it by hand (a `scrollUntilVisible` scrolls the page under it), and Remove and Undo set
`waitToSettleTimeoutMs: 0` because a settle wait can outlast the six-second Undo window and let the removal commit.

## Verification

- The three flows together passed in both orders against the dev topology, with `-e OWNED_PLAYLIST=Paradis`:
  `3/3` in 1m 40s in the play, filter, remove order and `3/3` in 1m 40s in the remove, filter, play order.
- Each flow also passed alone while it was written, and the remove flow was repeated twice more to check its window.
- The remove flow left the playlist as it found it each time: the first row was back and the whole set stayed at 12
  tracks.
- `apps/mobile/.maestro/README.md` records the run command, `OWNED_PLAYLIST` and the three rows in the flow table.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
