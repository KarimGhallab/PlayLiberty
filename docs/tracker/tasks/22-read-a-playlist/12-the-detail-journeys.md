# 12: The detail journeys

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
