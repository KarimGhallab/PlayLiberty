# 18: One owner for the track lifecycle

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. `trackLifecycle.ts` is the one owner of the track lifecycle and the only production writer of the `track` table.

- The module exposes the transitions as named functions: `createPendingTrack` (the birth), `claimPendingTracks` (pending to downloading), `storeTrack` and `failTrack` (downloading to stored or failed), `retryTrack` (failed to pending), `fetchTrackWhole` (pending or failed to pending, policy off), `markTrackSourceRemoved`, `resetDownloadingTracks` (the startup sweep's downloading-to-pending), `storeThumbnail` and `removeTrack` (the prune's death).
- Every single-track transition reads the row it acts on, refuses when the row is not in a state the move leaves, and writes only when the move applies. The move and its guard are one expression: the write is conditional on the leaving state, and the read afterwards only says which refusal happened. The outcome is `TrackTransitionOutcome` (`Applied`, `Refused`, `Missing`).
- `markTrackSourceRemoved` now reads the file status itself, so the eligibility rule (a stored file is kept, no file becomes unavailable) is applied in one place and the callers no longer pass the status in. The sync's retention and the worker's gone-video both call it.
- The six callers cross the seam. The sync calls `createPendingTrack`, `retryTrack` and `markTrackSourceRemoved`; the worker calls `claimPendingTracks`, `storeTrack`, `failTrack`, `markTrackSourceRemoved` and `storeThumbnail`; the sweep calls `resetDownloadingTracks`; the retry and fetch-whole services call `retryTrack` and `fetchTrackWhole` and map the module's outcome to their route outcomes; the prune calls `removeTrack`.
- What stays with the caller is what genuinely differs. The worker's double emit on claim and on terminal stays in the worker, because the sync's source-removed does not emit a track change and the event bus is out of scope. The prune keeps its downloading skip, because the media must be removed before the row and the guard has to run before that; it then calls `removeTrack` for the write. Suppression stays in the sync.

Tests: `trackLifecycle.test.ts` now tests the transitions and their guards at the interface (creation, claim and its cap, store, fail, retry, fetch-whole, source-removed including the stored-file rule, the startup reset, the artwork and the row removal), alongside the existing sync, worker, route, prune and sweep tests.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (server 305, web 372, i18n 39, ui-foundation 6, youtube 29, tokens 3) pass. Not committed.
