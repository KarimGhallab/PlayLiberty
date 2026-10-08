# 32: Wake the worker where the work is queued

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Entering `pending` and waking the download worker are two seams, so each producer pairs them by hand and the batch add already dropped its half. A video pasted into a playlist waits for the worker's next 30-second tick while a retry, a fetch-whole and a sync fire at once.

**Current behavior:**
The download worker runs on a 30-second interval and is additionally woken through `context.kickDownloads()`. Three producers wake it: `retryTrackForAccount` and `fetchTrackWholeForAccount` in the track routes, and the sync reconcile when it added a track. The batch add (`addTrackToPlaylists`, reached by `POST /tracks`) creates a `pending` track and publishes a live event, but never wakes the worker, so the track it just queued is only picked up on the next tick.

**Desired behavior:**
A track queued for download starts downloading immediately on every path, and the wake is expressed where the work is queued rather than a line each producer has to remember. The database schema, the worker's interval and its tick are unchanged.

**Key interfaces:**

- The wake belongs with queueing the work (creation, retry, fetch-whole), not with each caller.
- A producer that queues work crosses one seam and gets the wake; it does not call `kickDownloads` itself.
- The worker's interval and tick stay as they are; only the wake moves.

**Acceptance criteria:**

- [x] A video added through the batch add starts downloading without waiting for the worker's next tick.
- [x] `retryTrackForAccount`, `fetchTrackWholeForAccount`, the sync reconcile and the batch add all queue work and wake the worker through one seam.
- [x] The wake is not a per-producer line a new queueing path can silently omit.
- [x] The observable download behaviour and the schema are unchanged.
- [x] A test asserts the wake on the add path; the existing worker, route and sync tests keep passing.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The worker's concurrency, interval or tick.
- The prune and the startup sweep.
- The event bus.

## Outcome

Done. The wake is part of queueing work, and the four producers cross one seam.

- A new `downloadQueue` module in `features/tracks` is the seam. `withDownloadQueue(context, operation)` hands the operation a `DownloadQueue` (`create` a pending track, `retry` a failed one, `fetchWhole` a pending or failed one) and wakes the worker once at the end if any move queued work. A producer cannot queue work without the wake, because the wrapper performs it; `context.kickDownloads()` now appears in no producer, only in the seam.
- The batch add crosses it: the source is read before the queue opens, so creating the track, associating it, publishing the change and waking the worker are one synchronous move. This is the defect fix: a pasted video no longer waits for the 30s tick.
- `retryTrackForAccount` and `fetchTrackWholeForAccount` take the context rather than a bare database and move the track through the queue, so the retry and the whole-fetch wake on an applied move and stay silent on a refused one. The routes no longer kick.
- The sync reconcile opens one queue for the whole pass and is woken once, wrapping the run-settling transaction and the playlist publish so the wake still follows them. This also fixes a gap the old `if (added > 0)` check had: re-queueing a failed track that already had an association added nothing, so the worker was never woken.
- The wake is now keyed on whether anything entered `pending`, not on whether an association was added, which is the fact the queue actually cares about.

Tests: a new `downloadQueue.test.ts` drives the seam at its interface (a create wakes once; a batch of creates and a retry wakes once; a retry applied wakes and a refused retry does not; a whole-fetch applied wakes and a refused one does not; an operation that queues nothing does not wake). `trackRoutes.test.ts` asserts the wake on the `POST /tracks` add path, and `syncService.test.ts` pins the re-queue wake in the existing failed-track retry test.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (server 330, web 398, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.

## Observed

- `addTrackToPlaylists` creates the pending track and never calls `context.kickDownloads()`.
- `retryTrackForAccount` and `fetchTrackWholeForAccount` call it; the sync calls it when it added a track.
- No test asserts the wake on the add path, so the omission is unpinned.

## Expected

Every path that queues a download wakes the worker, through one seam.

## Evidence

- `apps/server/src/features/tracks/addTrackToPlaylists.ts:63,94`.
- `apps/server/src/features/tracks/routes/trackRoutes.ts:190,227`; `apps/server/src/features/sync/services/syncService.ts:300`.
- `apps/server/src/features/downloads/worker/downloadWorker.ts:60` (30s tick).
- Architecture review 2026-10-08, candidate 1.
