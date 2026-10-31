# 03: The mixed-batch journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

`apps/mobile/.maestro/detail-add-batch.yaml` opens `OWNED_PLAYLIST`, pastes `VIDEO_URL` into the add-track sheet,
checks the second writable playlist in the picker, and submits. The current playlist is first and preselected, so
the second checkbox is the flow's one other choice.

The batch closes the sheet on an all-success result, as the add-track sheet already does. The flow then scrolls to
`VIDEO_TITLE`, opens that row's lane from the title's own row, removes the track and presses Undo inside the
six-second window. It ends in the gallery.

A clean batch closes the sheet before its outcome rows can be read. The rows themselves are covered by the add-track
sheet tests, including one row per chosen playlist in the chosen order and the three outcome words; a refusal would
keep the sheet open. The README records `VIDEO_URL`, `VIDEO_TITLE`, the flow's row, and the picker's second-row
rule.

## Verification

- The flow passed twice on the emulator with `OWNED_PLAYLIST=Paradis`,
  `VIDEO_URL=https://www.youtube.com/watch?v=LibFI0nWtRA` and `VIDEO_TITLE=Alaska`.
- The first run added `Alaska` to `Paradis` and the next writable playlist, found the row, removed it, undid the
  removal, and ended in the gallery.
- The second run exercised the already-present path with the same assertions and passed.
- No source changed; the flow and README are the ticket's artifacts.

See [`25-curate-a-playlist`](../../specs/25-curate-a-playlist.md).
