# 62: One unit of work

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

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
