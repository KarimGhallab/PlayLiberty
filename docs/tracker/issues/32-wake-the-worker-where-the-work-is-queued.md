# 32: Wake the worker where the work is queued

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The wake is part of queueing work, and the four producers cross one seam.

- A new `downloadQueue` module in `features/tracks` is the seam. `withDownloadQueue(context, operation)` hands the operation a `DownloadQueue` (`create` a pending track, `retry` a failed one, `fetchWhole` a pending or failed one) and wakes the worker once at the end if any move queued work. A producer cannot queue work without the wake, because the wrapper performs it; `context.kickDownloads()` now appears in no producer, only in the seam.
- The batch add crosses it: the source is read before the queue opens, so creating the track, associating it, publishing the change and waking the worker are one synchronous move. This is the defect fix: a pasted video no longer waits for the 30s tick.
- `retryTrackForAccount` and `fetchTrackWholeForAccount` take the context rather than a bare database and move the track through the queue, so the retry and the whole-fetch wake on an applied move and stay silent on a refused one. The routes no longer kick.
- The sync reconcile opens one queue for the whole pass and is woken once, wrapping the run-settling transaction and the playlist publish so the wake still follows them. This also fixes a gap the old `if (added > 0)` check had: re-queueing a failed track that already had an association added nothing, so the worker was never woken.
- The wake is now keyed on whether anything entered `pending`, not on whether an association was added, which is the fact the queue actually cares about.

Tests: a new `downloadQueue.test.ts` drives the seam at its interface (a create wakes once; a batch of creates and a retry wakes once; a retry applied wakes and a refused retry does not; a whole-fetch applied wakes and a refused one does not; an operation that queues nothing does not wake). `trackRoutes.test.ts` asserts the wake on the `POST /tracks` add path, and `syncService.test.ts` pins the re-queue wake in the existing failed-track retry test.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (server 330, web 398, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.
