# 79: The play transition has no in-flight state

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

The transition now records which press is waiting, not only that one is. The header's play and shuffle replace their glyph with a spinner on the control that was pressed, the pressed track row shows a spinner over its artwork, and the other start controls for that playlist wait disabled without claiming the press. The pressed controls carry `aria-busy`.

A queue read is bounded by `QUEUE_READ_TIMEOUT_MS`. A read that does not answer becomes the existing unreachable start: the detail's `detail.playbackFailed` and its retry control, the library's notice. The stuck query is cancelled before the retry, and the failure stays drawn while a retry runs, so the control reads "Retrying..." rather than vanishing.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 511); `pnpm test:e2e` is 36 passed.
