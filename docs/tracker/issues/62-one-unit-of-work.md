# 62: One unit of work

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

`DatabaseHandle` now carries `unitOfWork<Result>(operation: () => Result): Result`, implemented once over `sqlite.transaction` in `platform/database/client.ts`. The operation is synchronous, and a nested unit becomes a savepoint, so a feature composes units without a second commit. `addAssociation` and `removeAssociation` call it instead of `database.sqlite.transaction`, and the E2E reset uses it too.

The batch add runs the track creation, every association and every count move in one unit inside `withDownloadQueue`. A throw halfway rolls all of it back, skips the worker wake and the announcement, and the request fails instead of answering a partial `AddTrackResult`.

The sync begin runs the playlist insert or lookup, the source URL refresh, the `Syncing` state and the run insert in one unit; `reconcile` starts only after it commits. The reconcile runs the suppression lift, track creation and retry, associations, retention and the settled run in one unit, and its failure path writes the failed run in its own unit. Announcements stay after the commit, as issue 61 requires.

`trackRoutes.test.ts` makes a writable playlist vanish during the source read so its association fails, then asserts no track, association or count survives and the worker was not woken. `syncService.test.ts` blocks the run insert with a trigger and asserts the playlist and run are both absent. `pnpm run build`, `pnpm run lint`, the unit suites (484 web, 378 server, 39 i18n, 31 youtube, 2 tokens, 6 ui-foundation) and `pnpm test:e2e` (35 journeys) pass.

## Agent Brief

**Category:** enhancement
**Summary:** The database handle exposes `sqlite` and `db` but no unit of work, so every module hand-rolls its transactions and two multi-writes are not atomic at all.

**Current behavior:**
`platform/database/client.ts` returns `{ sqlite, db }` and no transaction primitive. The modules that need one reach for `database.sqlite.transaction` directly (`associationService.ts:53`, `:93`; `syncService.ts:261`, `:292`).

Where a multi-write is not wrapped, the code and its interface agree on nothing. `addTrackToPlaylists` (`:27`) creates the track (`:70`), then loops `addAssociation` (`:77`), and each association is its own transaction. A throw in the middle keeps the created track and the associations already written, skips `publishTracksChangedForPlaylists` (`:90`), and still answers a normal `AddTrackResult`, so the caller cannot tell a complete batch from a partial one. `beginRun` writes `syncStatus: Syncing` (`syncService.ts:163`) and inserts the run (`:182`) as two statements, so a crash between them leaves a playlist syncing with no run, which the latest-run read then reports as absent.

**Desired behavior:**
The write path crosses one transaction seam that names the operation's unit, so a caller cannot observe a half-applied batch and crash recovery has one invariant. The batch add and the sync's begin and reconcile each become one unit, and no feature module imports `sqlite` to build its own.

**Key interfaces:**

- A unit of work on the database handle: the operation declares its unit and the handle runs it atomically.
- The batch add answers a partial batch as a failure, not as a normal result.
- The sync's begin and its reconcile are each one unit, so a crash cannot leave a run that does not exist.

**Acceptance criteria:**

- [ ] A throw in the middle of a batch add leaves no track and no association behind.
- [ ] A failed batch add does not answer as though it succeeded.
- [ ] A crash between the playlist's syncing state and its run leaves neither.
- [ ] No feature module imports `sqlite` to open its own transaction.
- [ ] Tests cover the rollback of a partial batch and of a failed run start.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The persistence library and the schema.
- The worker's claim loop and the wake-on-applied-move invariant (issue 32).
- The audience and event rules.

## Observed

- The handle hands out `sqlite` and `db`, with no unit of work.
- `addTrackToPlaylists` loops `addAssociation`, each its own transaction.
- `beginRun` writes the syncing state and the run row as two statements.

## Expected

One transaction seam the write path crosses; a partial batch cannot be observed.

## Evidence

- `apps/server/src/platform/database/client.ts:7-10`.
- `apps/server/src/features/tracks/addTrackToPlaylists.ts:70-90`.
- `apps/server/src/features/playlists/associationService.ts:53`, `:93`.
- `apps/server/src/features/sync/services/syncService.ts:163-182`, `:261`, `:292`.
- Architecture review 2026-10-16, candidate 4.
