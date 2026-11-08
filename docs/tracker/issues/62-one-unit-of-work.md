# 62: One unit of work

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`DatabaseHandle` now carries `unitOfWork<Result>(operation: () => Result): Result`, implemented once over `sqlite.transaction` in `platform/database/client.ts`. The operation is synchronous, and a nested unit becomes a savepoint, so a feature composes units without a second commit. `addAssociation` and `removeAssociation` call it instead of `database.sqlite.transaction`, and the E2E reset uses it too.

The batch add runs the track creation, every association and every count move in one unit inside `withDownloadQueue`. A throw halfway rolls all of it back, skips the worker wake and the announcement, and the request fails instead of answering a partial `AddTrackResult`.

The sync begin runs the playlist insert or lookup, the source URL refresh, the `Syncing` state and the run insert in one unit; `reconcile` starts only after it commits. The reconcile runs the suppression lift, track creation and retry, associations, retention and the settled run in one unit, and its failure path writes the failed run in its own unit. Announcements stay after the commit, as issue 61 requires.

`trackRoutes.test.ts` makes a writable playlist vanish during the source read so its association fails, then asserts no track, association or count survives and the worker was not woken. `syncService.test.ts` blocks the run insert with a trigger and asserts the playlist and run are both absent.
