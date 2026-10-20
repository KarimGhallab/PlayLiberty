# 18: One owner for the track lifecycle

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

`trackLifecycle.ts` is the one owner of the track lifecycle and the only production writer of the `track` table. It exposes the transitions as named functions: `createPendingTrack`, `claimPendingTracks`, `storeTrack`, `failTrack`, `retryTrack`, `fetchTrackWhole`, `markTrackSourceRemoved`, `resetDownloadingTracks`, `storeThumbnail` and `removeTrack`; every single-track transition reads the row it acts on, refuses when the row is not in a state the move leaves, and writes only when the move applies, returning a `TrackTransitionOutcome` (`Applied`, `Refused`, `Missing`). `markTrackSourceRemoved` reads the file status itself, so the eligibility rule (a stored file is kept, no file becomes unavailable) is applied in one place, and the six callers cross the seam. What stays with the caller is what genuinely differs: the worker's double emit, the prune's downloading skip, and the sync's suppression.
