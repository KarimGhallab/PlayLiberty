# 79: The play transition has no in-flight state

**State:** `resolved`
**Category:** `bug`

## Outcome

The transition now records which press is waiting, not only that one is. The header's play and shuffle replace their glyph with a spinner on the control that was pressed, the pressed track row shows a spinner over its artwork, and the other start controls for that playlist wait disabled without claiming the press. The pressed controls carry `aria-busy`.

A queue read is bounded by `QUEUE_READ_TIMEOUT_MS`. A read that does not answer becomes the existing unreachable start: the detail's `detail.playbackFailed` and its retry control, the library's notice. The stuck query is cancelled before the retry, and the failure stays drawn while a retry runs, so the control reads "Retrying..." rather than vanishing.
