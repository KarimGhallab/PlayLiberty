# 44: Multi-layer redundancy

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** A behavior implemented in a lower module is re-asserted at a higher layer that adds no boundary claim, so the same rule has several owners and a change to it breaks several suites.

**Current behavior:**
The refetch merge rules are asserted in the store and again through `useQueueRefetch` (whose own comment concedes the merge rules are the store's). The problem-sentence mapping is asserted in `problem.test.ts` and again in `ReadFailure`. The volume clamp is asserted in the store and again in `VolumeControl`. The shuffle toggle is asserted in the hook and again from the library. The route suites repeat every status member of the lifecycle's refusal tables.

**Desired behavior:**
Each behavior has one owner test, the module whose branch implements it, plus at most one assembly test that proves a real boundary. The pass-through re-assertions in the Cut table are removed.

**Acceptance criteria:**

- [x] The Cut re-assertions are removed, and the named owner tests stay.
- [x] Each kept assembly test proves a boundary the owner cannot.
- [x] The web and server suites pass.
- [x] `pnpm run build` and `pnpm run lint` pass.

**Out of scope:**

- The e2e suite; that is issue 45.
- The web presentation cuts (issue 40), type shapes (42), constants (41) and duplicates (43).

## Manifest

### Cut

| File:line                      | Test                                                                                | Restates                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `useQueueRefetch.test.tsx:88`  | drops a track the refetch no longer returns, keeping the current one                | `playerStore.test.ts:100` merge rule                                                            |
| `useQueueRefetch.test.tsx:102` | leaves the queue alone when it belongs to another playlist                          | `playerStore.test.ts:143` foreign-playlist rule                                                 |
| `ReadFailure.test.tsx:53`      | shows the server's own detail when the ApiError carries one                         | `problem.test.ts:31` fallback mapping                                                           |
| `ReadFailure.test.tsx:60`      | renders a known problem code as the catalog sentence                                | `problem.test.ts:17` mapping                                                                    |
| `VolumeControl.test.tsx:193`   | clamps the arrows at the ends                                                       | `playerStore.test.ts:639` clamp (`VolumeControl:257` keeps the component's own pointer clamp)   |
| `LibraryPage.test.tsx:654`     | starts a fresh shuffled queue on a second press and takes the order back on a third | `useShufflePlaylist.test.tsx:109`, `:146` toggle                                                |
| `playerQueue.test.ts:131`      | starts shuffled when asked                                                          | `playerStore.test.ts:503` shuffle-on-start                                                      |
| `trackRoutes.test.ts:548`      | it.each over `Unavailable, Stored, Pending, Downloading`                            | `trackLifecycle.test.ts:216` refusal rule; keep one member (Stored) for the route's 409 mapping |
| `trackRoutes.test.ts:725`      | it.each over `Stored, Downloading, Unavailable`                                     | `trackLifecycle.test.ts:268`; keep one member                                                   |
| `trackRoutes.test.ts:656`      | it.each over `Failed, Pending`                                                      | `trackLifecycle.test.ts:234`; keep the Failed member                                            |

### Keep as owner

- `playerStore.test.ts` (order, shuffle, merge, clamp), `playerQueue.test.ts` (stored filter, first playable, empty refusal), `useShufflePlaylist.test.tsx`, `streamFailure.test.ts`, `problem.test.ts`, `queries.test.ts`, `mediaSession.test.ts`, `useDeferredAction.test.ts`.
- `trackLifecycle.test.ts`, `trackService.test.ts`, `entry.test.ts`, `downloadQueue.test.ts`, `mediaPaths.test.ts`, `pruneService.test.ts`, `shareAccess.test.ts`, and the youtube URL and error suites.

### Keep as assembly

- `useQueueRefetch.test.tsx:61` (the hook reaches `applyRefetch` after the read answers), with `:112` keeping the hook's own guard.
- `ReadFailure.test.tsx:41`, `:47`, `:78`, `:87` (fallbacks, retry, lock); `SyncError.test.tsx` (no overlap).
- `VolumeControl.test.tsx:257` (the component's own pointer clamp).
- `PlayerAudio.test.tsx:316`, `:340`, `:364` (real `error` event plus async probe into the store).
- `LibraryPage.test.tsx:567`, `:587`, `:260`; `PlaylistDetailPage.test.tsx:305`, `:266`, `:279` (page to hook to store wiring, refusal render, pressed derivation).
- `PlaylistDetailPage.test.tsx:327` (the page's row-press handler picking "move playhead" over "rebuild" while shuffled).
- `PlaylistHeader.test.tsx:439`; the deferred-action toast and Cancel wiring in `LibraryPage.test.tsx:816`, `:853` and `PlaylistDetailPage.test.tsx:476`, `:497`, `:529`, `:551`, `:566`.
- Server: the 404-not-403 and CSRF contracts (`trackRoutes.test.ts:582`, `:764`, the client-header tables; `playlistRoutes.test.ts:493`, `:1008`, `:1386`, `:1570`, `:1725`, `:1845`), the cache headers (`trackRoutes.test.ts:851`, `:867`, `:883`), the download-queue `kick` wiring, the worker typed-error mapping (`downloadWorker.test.ts:421`, `:441`), the sync route 400 (`syncService.test.ts:407`), the share-route contracts and revocation (`shareRoutes.test.ts:129`, `:148`, `:176`, `:237`, `:249`, `:274`, `:293`, `:310`, `:378`, `:397`), `pruneScheduler.test.ts:25`, and the startup-sweep and media-path consumers.

## Observed

- The Cut table above, catalogued from the web and server suites on 2026-10-08.

## Expected

One owner per behavior, one assembly where a boundary needs proving, and the rest cut.

## Outcome

Done. Each behavior has one owner and at most one assembly.

- Removed the pass-through re-assertions: the refetch merge and foreign-playlist cases in `useQueueRefetch.test.tsx`, the two problem-mapping cases in `ReadFailure.test.tsx`, the store clamp in `VolumeControl.test.tsx`, the shuffle toggle in `LibraryPage.test.tsx`, and the shuffle-on-start in `playerQueue.test.ts`. The now-unused `OTHER` fixture and the stale `ReadFailure` comment went with them.
- Trimmed the redundant status members from the three `trackRoutes.test.ts` refusal tables to one each (Stored, Failed, Stored).
- Kept the owner suites, and the assemblies that prove a boundary: the hook's `applyRefetch` wiring with its guard, `ReadFailure`'s fallback/retry/lock, the component's own pointer clamp, the page-to-store shuffle wiring, the page's shuffled row-press handler, the real error-event classification in `PlayerAudioAudio`, the security and cache-header contracts, the download-queue kick wiring, the worker typed-error mapping, the share-route contracts, and the real cron and filesystem boundaries.

Verification: the full unit suite passes (server 337, web 389, youtube 31, i18n 39, tokens 3, ui-foundation 6). `pnpm run build` and `pnpm run lint` are clean.

## Evidence

- Test pruning review 2026-10-08 (issue 44 manifest, explore pass over `apps/web/src` and `apps/server/src`).
