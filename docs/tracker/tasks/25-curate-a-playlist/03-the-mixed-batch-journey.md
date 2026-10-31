# 03: The mixed-batch journey

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

A Maestro flow for the batch add and the undo. It opens `OWNED_PLAYLIST`, taps the add action, pastes `VIDEO_URL`,
chooses the current playlist and one more writable playlist, and submits.

The sheet draws one outcome row per chosen playlist, in the order chosen. The flow then finds the row for
`VIDEO_TITLE`, removes it and presses Undo inside the six-second window, and ends in the gallery.

The gallery's first page must hold at least one writable playlist besides the current one. If `VIDEO_URL` is already
in a playlist, its outcome is already there; the flow still expects one row per chosen playlist. The README records
`VIDEO_URL`, `VIDEO_TITLE` and the flow's row in the table.

## Acceptance criteria

- [ ] The flow adds one video to the current playlist and one more writable playlist from the detail.
- [ ] The sheet draws one outcome row per chosen playlist, in the order chosen.
- [ ] The flow finds the added track, removes it and undoes the removal inside the window.
- [ ] The flow ends in the gallery.
- [ ] The README records the two new variables and the flow.
- [ ] The flow passes against the dev topology.

## Verification

- `PATH="$HOME/.maestro/bin:$PATH" maestro test -e OWNED_PLAYLIST=<playlist> -e VIDEO_URL=<video> -e VIDEO_TITLE=<title> apps/mobile/.maestro`
- The remove and Undo taps use `waitToSettleTimeoutMs: 0`, so the settle wait cannot outlast the undo window.
