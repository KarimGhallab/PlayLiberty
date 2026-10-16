# 01: Download and store a pending track

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. The idle loop is now the worker: `startDownloadWorker` still owns the 30-second
interval and the stop handle, and each tick runs one pass of `processPendingTracks`, which a test can call
directly. A pass claims every `pending` track in one conditional update that returns only the rows it moved to
`downloading`, downloads each through the adapter into the temporary directory, renames the finished file into
the media store at its sharded path, and writes `stored` with the path and a cleared failure reason. A stored
track is not `pending`, so it is never claimed again, and a second account's association to it streams
immediately. A per-track catch keeps a claimed track out of `downloading` when a download throws; tickets 02
and 03 own the retry and the gone classification.

Two things this ticket changed beyond the worker. `TestContext` now exposes the media paths, and a pass takes
only the database, the media paths and the adapter, so a test drives it with a fake adapter and no interval.
And the claim is a single conditional update, so two passes cannot start the same download; ticket 05 bounds
the batch to the configured concurrency.

Verification: `pnpm run test` (92 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` pass.
