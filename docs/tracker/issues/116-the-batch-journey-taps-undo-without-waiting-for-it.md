# 116: The batch journey taps Undo without waiting for it

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None.

## Outcome

Both detail journeys now wait for `undo-snackbar-action` before pressing it. `detail-add-batch` gained the wait it never had, and `detail-remove-undo`'s 5 s wait became 30 s, which outlives the six-second window by a wide margin. The wait is an assertion about the mode, so a bar that never appears fails at `undo-snackbar-action is visible` before any press; a press that lands but does not restore the row fails at the copied title. The two failures no longer look the same.

The taps keep `waitToSettleTimeoutMs: 0`, so a settle wait cannot outlast the window either. The README's detail paragraph now says the window starts after the sheet has left (114), that both flows wait for the bar, and why the wait outlives the window.

Verification: the harness ran the two journeys together, `detail-add-batch` then `detail-remove-undo`, and both passed in 1m 42s (1m 18s and 25s). The run's remove tap was not one of the slow ones from the 2026-11-05 batches, so the pathological timing was not reproduced; the tolerance is structural: the wait is 30 s against a 6 s window, and 114 and 115 already moved the window's start past the sheet and onto the touch clock. `pnpm run lint:check`, `pnpm run build` and `pnpm test:unit` (614 mobile) pass, and `apps/mobile/.env.local` was restored after the run.
