# 28: Guard the sync failure's reason

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Done, and the guard is the change.

- **The retry is absent when it cannot work.**
  [`SyncError.tsx`](../../../apps/web/src/shared/components/SyncError/SyncError.tsx) draws the retry only
  when `onRetry` is defined, so a caller who cannot sync gets no dead control. The design record's "offered
  only where retrying can work" and the header's "a control that is there and cannot be pressed is worse
  than no control" now hold in the code, not only in the comment.
- **The band's contract is asserted.**
  [`SyncError.test.tsx`](../../../apps/web/src/shared/components/SyncError/SyncError.test.tsx) covers the
  sentence, the reassurance (with a count, in the singular, and quiet at zero and unknown), the retry
  (retryable, absent, retrying) and the reveal. Removing any of the words fails the suite.
- **The page pairs the status with the reason.**
  [`PlaylistDetailPage.test.tsx`](../../../apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.test.tsx)
  asserts a failed run draws the band with the run's own `error`, the reassurance and the retry, and that
  the summary is absent.
- **The journey is the load-bearing check.** The failed-sync case in
  [`e2e/tests/sync.spec.ts`](../../../e2e/tests/sync.spec.ts) now creates a playlist, settles it, removes
  its source, resyncs from the library's overflow, then opens the detail and asserts the sentence, the
  reassurance, the retry and the revealed diagnostic. It fails if the path from the library to the reason
  breaks.
- **Four pre-existing broken tracker links** in tasks 21, 22 and 24, left by the folder refactor, were
  corrected.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (314 tests) and the e2e suite (27 tests)
all pass. Not committed.
