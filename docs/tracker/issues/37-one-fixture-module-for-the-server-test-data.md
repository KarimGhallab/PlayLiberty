# 37: One fixture module for the server test data

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Every server test suite re-declares its own `seedAccount` / `seedPlaylist` / `seedTrack` / `seedShare` builders by inserting schema rows directly, and the copies have drifted, so a schema column or default change silently skews only some suites.

**Current behavior:**
`createTestContext` owns the app, the database and the media root, but not the data. Each suite writes its own builders against `database.db`: about 40 helpers across 16 files, restating required columns and defaults. The copies have drifted in three ways. The share level is required in some, defaults to `Read` in two and is hardcoded `Read` with no parameter in two. `skipNonMusic` is an option in some, a positional argument in one, hardcoded `true` in two and not set at all in the rest. Some `seedTrack` builders insert the playlist association, some leave it to a separate call, and the return is an id in some and a record in others.

**Desired behavior:**
One fixtures module at `apps/server/src/app/testing/fixtures.ts` owns the builders. Every suite takes its data from it, every local builder is deleted, and the schema defaults have one owner, so a column or default change edits one file. The association is explicit rather than bundled into `seedTrack`, and the one composite that writes real media stays a composite because the streaming suites genuinely repeat it.

**Key interfaces:**

- `seedAccount(database, options?): SeededAccount`, where `SeededAccount = { accountId, pangolinUserId, displayName }`; options `{ displayName?, pangolinUserId?, role?, email? }`.
- `seedPlaylist(database, ownerAccountId, options?): SeededPlaylist`, where `SeededPlaylist = { playlistId, ownerAccountId }`; options `{ name?, sourcePlaylistId?, sourceUrl?, syncStatus?, skipNonMusic?, lastSyncedAt?, createdAt? }`.
- `seedTrack(database, options?): SeededTrack`, where `SeededTrack = { trackId, videoId }`; no association; options `{ videoId?, title?, durationSeconds?, skipNonMusic?, fileStatus?, sourceStatus?, filePath?, thumbnailPath?, failureReason? }`.
- `associate(database, playlistId, trackId, options?): void`; the position defaults to `nextPositionFor`, the origin defaults remote.
- `seedShare(database, playlistId, accountId, options?): void`; the level defaults `Read`.
- `seedSyncRun(database, playlistId, options?): { runId }`; options `{ status?, startedAt?, finishedAt?, error?, addedCount?, retainedCount?, removedCount?, failedCount? }`.
- `seedStoredTrack(testContext, options?): Promise<{ account, playlist, track }>`; the one composite. It creates the account, playlist and track it is not given and writes the audio and thumbnail through `mediaPaths`, setting `filePath` and `thumbnailPath`.
- Every builder inserts with raw drizzle. One options object and one return record per entity.

**Acceptance criteria:**

- [x] `apps/server/src/app/testing/fixtures.ts` owns the builders, with the schema defaults and the fixture-chosen share level stated once.
- [x] The 16 unit suites use the module and no local `seed*` builder remains, including the inline inserts in `pruneScheduler.test.ts` and `audit.test.ts`.
- [x] The builders insert with raw drizzle and do not call the services, so a service bug cannot hide behind a green fixture.
- [x] `seedTrack` never inserts an association; the association is an explicit `associate` call.
- [x] `seedStoredTrack` writes real media through `mediaPaths`, and the streaming suites that need it use it.
- [x] Tests: the module is covered (defaults, overrides, the association, the stored-media composite) and the existing suites keep passing.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The `createTestContext` lifecycle boilerplate each suite repeats (`let context` / `afterEach(cleanup)` / `database()`). That is a separate seam.
- The e2e suite, which seeds through the HTTP API and the fake adapter, not the database.
- The `e2eYoutube` fixtures and `registerE2eRoutes`.

## Outcome

Done. `apps/server/src/app/testing/fixtures.ts` owns the builders and the 16 suites compose them.

- The module exports `seedAccount`, `seedPlaylist`, `seedTrack`, `associate`, `seedShare`, `seedSyncRun` and the `seedStoredTrack` composite, over the `SeededAccount` / `SeededPlaylist` / `SeededTrack` records. Every insert is raw drizzle; no builder calls a service. The chosen defaults (stored track, 180 seconds, read share, idle playlist, user account) are stated once, alongside the columns the schema requires.
- `seedTrack` never inserts an association; every membership is an explicit `associate` call whose position defaults to `nextPositionFor`.
- `seedStoredTrack` writes real audio and thumbnail under `mediaPaths` and sets `filePath`/`thumbnailPath`; the streaming suites call it.
- All 16 suites import from the module and their local builders are deleted, including the inline inserts in `pruneScheduler.test.ts` and `audit.test.ts`. The column-restating builders are gone; a few thin per-suite composites remain (`seed` in `downloadWorker.test.ts`, `seedOwnedTrack`, `seedCast`) because they compose the shared builders and are genuinely repetitive, which is the composite the agreed design allows. `seedFailedTrack` was inlined as it was used once.
- `eventRoutes.test.ts` keeps its `grantShare`, which calls the HTTP API rather than the database, so it is outside this seam.

Tests: the new `fixtures.test.ts` covers the defaults, the overrides, the association position and origin, the share level, the sync run and the stored-media composite. Server unit suite 344 (was 330); `pnpm run build` and `pnpm run lint` pass. Not committed. The `pnpm-lock.yaml` and the web changes in the tree are not from this ticket.

## Observed

- 16 test files declare ~40 local builders: `seedTrack` x7, `seedAccount` x5, `seedShare` x4, `seedPlaylist` x5 variants, plus `associate`, `seedRun`, `seedStoredTrack`, `seedCast` and the inline inserts.
- The share level, `skipNonMusic` and the association side effect have already drifted across the copies.
- `createTestContext` owns the database but no builders.

## Expected

One fixtures module owns the builders; every suite composes them.

## Evidence

- `apps/server/src/app/testing/createTestContext.ts:23-67`.
- `apps/server/src/features/playlists/routes/playlistRoutes.test.ts:49-155`.
- `apps/server/src/features/tracks/routes/trackRoutes.test.ts:90-188`.
- `apps/server/src/shared/access/entry.test.ts:56-133`.
- `apps/server/src/features/downloads/worker/downloadWorker.test.ts:134-208`.
- `apps/server/src/platform/database/schema.ts:23-196`.
- Architecture review 2026-10-08, candidate 2.
