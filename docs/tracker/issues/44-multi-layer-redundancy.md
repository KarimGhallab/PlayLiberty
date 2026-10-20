# 44: Multi-layer redundancy

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Each behavior has one owner and at most one assembly. Removed the pass-through re-assertions: the refetch merge and foreign-playlist cases in `useQueueRefetch.test.tsx`, the two problem-mapping cases in `ReadFailure.test.tsx`, the store clamp in `VolumeControl.test.tsx`, the shuffle toggle in `LibraryPage.test.tsx`, and the shuffle-on-start in `playerQueue.test.ts`, along with the now-unused `OTHER` fixture and the stale `ReadFailure` comment. Trimmed the redundant status members from the three `trackRoutes.test.ts` refusal tables to one each (Stored, Failed, Stored). Kept the owner suites and the assemblies that prove a boundary: the hook's `applyRefetch` wiring with its guard, `ReadFailure`'s fallback/retry/lock, the component's own pointer clamp, the page-to-store shuffle wiring, the page's shuffled row-press handler, the real error-event classification in `PlayerAudioAudio`, the security and cache-header contracts, the download-queue kick wiring, the worker typed-error mapping, the share-route contracts, and the real cron and filesystem boundaries.
