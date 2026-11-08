# 37: One fixture module for the server test data

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`apps/server/src/app/testing/fixtures.ts` owns the builders and the 16 suites compose them. The module exports `seedAccount`, `seedPlaylist`, `seedTrack`, `associate`, `seedShare`, `seedSyncRun` and the `seedStoredTrack` composite, over the `SeededAccount` / `SeededPlaylist` / `SeededTrack` records, with every insert raw drizzle, no builder calling a service, and the chosen defaults (stored track, 180 seconds, read share, idle playlist, user account) stated once alongside the columns the schema requires. `seedTrack` never inserts an association; every membership is an explicit `associate` call whose position defaults to `nextPositionFor`. `seedStoredTrack` writes real audio and thumbnail under `mediaPaths` and sets `filePath`/`thumbnailPath`, and the streaming suites call it. All 16 suites import from the module and their local builders are deleted, including the inline inserts in `pruneScheduler.test.ts` and `audit.test.ts`, with a few thin per-suite composites remaining (`seed` in `downloadWorker.test.ts`, `seedOwnedTrack`, `seedCast`) and `seedFailedTrack` inlined as it was used once; `eventRoutes.test.ts` keeps its `grantShare`, which calls the HTTP API rather than the database.
