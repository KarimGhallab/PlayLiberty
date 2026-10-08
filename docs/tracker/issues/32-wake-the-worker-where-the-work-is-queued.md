# 32: Wake the worker where the work is queued

**State:** `ready-for-agent`
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

- [ ] A video added through the batch add starts downloading without waiting for the worker's next tick.
- [ ] `retryTrackForAccount`, `fetchTrackWholeForAccount`, the sync reconcile and the batch add all queue work and wake the worker through one seam.
- [ ] The wake is not a per-producer line a new queueing path can silently omit.
- [ ] The observable download behaviour and the schema are unchanged.
- [ ] A test asserts the wake on the add path; the existing worker, route and sync tests keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The worker's concurrency, interval or tick.
- The prune and the startup sweep.
- The event bus.

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
