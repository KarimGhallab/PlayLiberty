# 28: Guard the sync failure's reason

**Status:** resolved

## Outcome

`SyncError.tsx` draws the retry only when `onRetry` is defined, so a caller who cannot sync gets no dead control. `SyncError.test.tsx` covers the sentence, the reassurance (with a count, in the singular, and quiet at zero and unknown), the retry (retryable, absent, retrying) and the reveal, and `PlaylistDetailPage.test.tsx` asserts a failed run draws the band with the run's own `error`, the reassurance and the retry, with the summary absent. The failed-sync case in `e2e/tests/sync.spec.ts` creates a playlist, settles it, removes its source, resyncs from the library's overflow, then opens the detail and asserts the sentence, the reassurance, the retry and the revealed diagnostic.

See [`02-store-a-track`](../specs/02-store-a-track.md).
