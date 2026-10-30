# 12: The detail journeys

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`05`](05-removal-and-deletion-are-deferred.md), [`06`](06-the-header-plays-and-shuffles.md),
[`08`](08-the-sort-and-the-chips.md)

## What to build

Three Maestro flows for the detail's critical journeys. Each stops and launches the app, signs in through the
existing browser fallback when signed out, and leaves the device in the gallery.

- `detail-play`: open a playlist from the gallery, play a playable row and see its playing mark. The bar is spec
  `23`'s, so the flow asserts the row, not the bar.
- `detail-filter`: open a playlist, filter to Failed, assert the filtered body, then return to All and see the whole
  list. The failed set may be empty, so the flow accepts the rows or the filter-empty body before returning with the
  All chip; the filter-empty body's Show all is the same return and is covered by `08`'s widget test.
- `detail-remove-undo`: open an owned playlist named by the runner in `OWNED_PLAYLIST`, open a row's lane, choose
  Remove, see the undo snackbar, press Undo and see the row again. The name keeps the flow independent of gallery
  order and of a shared first card.

The flows use the stable test ids the earlier tickets add for the screen, the rows, the lane, the sheet, the chips
and the snackbar. The README's run command and flow table are updated, including `OWNED_PLAYLIST`.

## Acceptance criteria

- [ ] The three flows are independent and pass on the emulator against the dev topology.
- [ ] Each flow establishes its own state, uses the sign-in fallback and leaves the device in the gallery.
- [ ] The play flow asserts the row's playing mark, not the bar.
- [ ] The filter flow reaches the failed filter and returns to All.
- [ ] The remove flow removes a row and restores it with Undo.
- [ ] The README records the run command, the three flows and `OWNED_PLAYLIST`.

## Verification

`PATH="$HOME/.maestro/bin:$PATH" maestro test -e OWNED_PLAYLIST=<name> apps/mobile/.maestro`, with the dev client
connected and Metro serving the app.
