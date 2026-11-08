# 32: Wake the worker where the work is queued

**State:** `resolved`
**Category:** `bug`

## Outcome

The wake is part of queueing work, and the four producers cross one seam. A new `downloadQueue` module in `features/tracks` is the seam: `withDownloadQueue(context, operation)` hands the operation a `DownloadQueue` (`create` a pending track, `retry` a failed one, `fetchWhole` a pending or failed one) and wakes the worker once at the end if any move queued work, so a producer cannot queue work without the wake and `context.kickDownloads()` now appears only in the seam. The batch add crosses it with the source read before the queue opens, so a pasted video no longer waits for the 30s tick; `retryTrackForAccount` and `fetchTrackWholeForAccount` take the context and wake on an applied move while staying silent on a refused one. The sync reconcile opens one queue for the whole pass and is woken once, wrapping the run-settling transaction and the playlist publish. The wake is now keyed on whether anything entered `pending`, not on whether an association was added, which also closes the gap where re-queueing a failed track that already had an association never woke the worker.
