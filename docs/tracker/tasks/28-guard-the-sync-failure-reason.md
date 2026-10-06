# 28: Guard the sync failure's reason

**What to build:** The check with teeth for the sync-failure surface, so removing the reason fails the
suite, plus the one fix the check exposes.

The detail screen already draws the `sync-error` band (the sentence, the reassurance, the retry and the raw
reason behind "Show details"), so the ticket's bug is closed. What is missing is the guard the ticket's Q2
and Q8 ask for: nothing fails today if the reason becomes unreachable again. There is no `SyncError` test,
no web test asserts the band's words, and the e2e failed-sync case asserts only the library's `Sync failed`
word and never opens the detail.

1. **The retry is drawn only when there is something to do.** `SyncError` renders the retry in every case
   and disables it when `onRetry` is undefined, which contradicts its own prop doc ("the button is drawn
   only when there is something to do"), the `sync-error` record ("a retry is offered only where retrying
   can work") and the header's principle that "a control that is there and cannot be pressed is worse than
   no control". Gate it by absence: draw it only when `onRetry` is defined.
2. **A `SyncError` test with teeth.** Render the component and assert the sentence, the reassurance
   (present with a count, absent at zero), the retry (present and enabled when retryable, absent when not,
   "Syncing" while retrying) and the "Show details" reveal of `rawError`. Removing any of the words fails
   the suite.
3. **A `PlaylistDetailPage` test.** A failed run renders `SyncError` carrying the run's `error`; a settled
   run renders `SyncSummary` instead. The page, not only the component, is what pairs the status with the
   reason.
4. **The e2e case opens the detail.** Extend the existing failed-sync case in `e2e/tests/sync.spec.ts` so
   that, after `Sync failed` appears on the library, it opens the playlist and asserts the band (the
   sentence, the reassurance, the retry) and that "Show details" reveals the run's diagnostic. This is the
   load-bearing check: it fails if the path from the library to the reason breaks.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `bug`, `ready-for-agent`

- [x] `SyncError` draws the retry only when `onRetry` is defined.
- [x] A `SyncError` test asserts the sentence, the reassurance (with a count and at zero), the retry
      (retryable, not retryable, retrying) and the reveal of `rawError`.
- [x] A `PlaylistDetailPage` test asserts a failed run renders `SyncError` with the run's `error` and a
      settled run renders `SyncSummary`.
- [x] The e2e failed-sync case opens the detail and asserts the band and the revealed reason.
- [x] The web unit suite, the build and the lint pass; the e2e suite passes.

**Verification:** `pnpm run build`, `pnpm run lint`, the web unit suite, the e2e suite
(`pnpm --filter @playliberty/e2e test`) and `node docs/design/scripts/validate-design-tokens.cjs`.

## Origin

This is the guard for [`01-silent-failures-and-live-sync-progress`](../issues/01-silent-failures-and-live-sync-progress.md),
whose failure half is built and whose live half shipped under spec
[`09-keep-the-screens-current`](../specs/09-keep-the-screens-current.md). Issue 01 stays open until this
lands, then resolves with the outcome.

Settled while working the issue's frontier: the instance stays as built; the library keeps `Sync failed`
plus the link and the detail owns the words; the guard is both unit and e2e; it is scoped to the error and
not to `SyncSummary`; the e2e extends the existing case rather than adding a sibling.

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
  corrected, because the design check fails on them.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (314 tests), the e2e suite (27 tests)
and `node docs/design/scripts/validate-design-tokens.cjs` all pass. Not committed.
