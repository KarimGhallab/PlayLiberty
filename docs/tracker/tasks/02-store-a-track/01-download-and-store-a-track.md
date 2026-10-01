# 01: Download and store a pending track

**What to build:** A track a sync left `pending` becomes playable on its own. The worker claims pending tracks,
downloads each through the YouTube adapter into the temporary directory, moves the finished file into the media
store at its sharded path in one step, and marks it `stored` with its path and a cleared failure reason, so the
stream route serves it. A stored track is never claimed again, whoever asks for it: a second playlist or a
second account that associates it is immediately playable with no second fetch, and the media store holds one
file per video id.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A pending track is claimed, downloaded, moved into the media store, and marked `stored` with its path and a cleared failure reason.
- [x] The stream route serves the stored bytes, and the file sits at the sharded path the media store defines.
- [x] A track already `stored` is never claimed, and a second association to it is immediately streamable with no download.
- [x] One video id maps to one track row and one stored file.
- [x] The claim moves a track from `pending` to `downloading` only if it is still `pending`, so two passes cannot start the same download.
- [x] A test can drive one pass of the worker without waiting on its interval.

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
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
