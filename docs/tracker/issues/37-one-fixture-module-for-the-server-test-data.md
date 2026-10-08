# 37: One fixture module for the server test data

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. `apps/server/src/app/testing/fixtures.ts` owns the builders and the 16 suites compose them.

- The module exports `seedAccount`, `seedPlaylist`, `seedTrack`, `associate`, `seedShare`, `seedSyncRun` and the `seedStoredTrack` composite, over the `SeededAccount` / `SeededPlaylist` / `SeededTrack` records. Every insert is raw drizzle; no builder calls a service. The chosen defaults (stored track, 180 seconds, read share, idle playlist, user account) are stated once, alongside the columns the schema requires.
- `seedTrack` never inserts an association; every membership is an explicit `associate` call whose position defaults to `nextPositionFor`.
- `seedStoredTrack` writes real audio and thumbnail under `mediaPaths` and sets `filePath`/`thumbnailPath`; the streaming suites call it.
- All 16 suites import from the module and their local builders are deleted, including the inline inserts in `pruneScheduler.test.ts` and `audit.test.ts`. The column-restating builders are gone; a few thin per-suite composites remain (`seed` in `downloadWorker.test.ts`, `seedOwnedTrack`, `seedCast`) because they compose the shared builders and are genuinely repetitive, which is the composite the agreed design allows. `seedFailedTrack` was inlined as it was used once.
- `eventRoutes.test.ts` keeps its `grantShare`, which calls the HTTP API rather than the database, so it is outside this seam.

Tests: the new `fixtures.test.ts` covers the defaults, the overrides, the association position and origin, the share level, the sync run and the stored-media composite. Server unit suite 344 (was 330); `pnpm run build` and `pnpm run lint` pass. Not committed. The `pnpm-lock.yaml` and the web changes in the tree are not from this ticket.
