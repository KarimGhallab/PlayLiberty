# 18: One owner for the track lifecycle

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The track state machine (`pending`, `downloading`, `stored`, `failed`, `unavailable`, plus `sourceStatus: removed` and suppression) is written inline by six modules, so the legal transitions are recoverable only by reading all six, and the one shared helper is a write, not a guard.

**Current behavior:**
The sync service, the download worker, the startup sweep, the track service (retry and fetch-whole), the track lifecycle helper and the prune service each write the track state columns directly. `markTrackSourceRemoved` is shared between two callers, but it writes rather than guards, so a new caller can still make an illegal transition. The eligibility rule for a removed source is re-decided at each call site.

**Desired behavior:**
One module owns the lifecycle. It exposes the transitions as a small interface (claim for download, store, fail, retry, mark source removed) and refuses an illegal one, so a caller crosses one seam and the state machine is testable there. The six writers call it. The observable behaviour and the database schema are unchanged.

**Key interfaces:**

- The lifecycle interface takes a track id (or a row) and the transition's inputs, and returns the outcome.
- Suppression stays where it is unless the module needs to own it; if it moves, the sync and the association service call the module.
- The worker's double emit on claim and on terminal is a transition fact the module can own.

**Acceptance criteria:**

- [x] The track state columns are written by one module and nowhere else.
- [x] Each transition is expressed once, with its guard, and an illegal transition is refused.
- [x] The sync, the worker, the sweep, the retry, the fetch-whole and the prune call the module.
- [x] The observable sync, download and prune behaviour and the schema are unchanged.
- [x] The lifecycle has a test at its interface; the existing sync, worker and lifecycle tests keep passing.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The event bus (a transition could emit, but deriving events is a separate decision).
- The access checks (issue 22).
- New states or a schema change.

## Outcome

Done. `trackLifecycle.ts` is the one owner of the track lifecycle and the only production writer of the `track` table.

- The module exposes the transitions as named functions: `createPendingTrack` (the birth), `claimPendingTracks` (pending to downloading), `storeTrack` and `failTrack` (downloading to stored or failed), `retryTrack` (failed to pending), `fetchTrackWhole` (pending or failed to pending, policy off), `markTrackSourceRemoved`, `resetDownloadingTracks` (the startup sweep's downloading-to-pending), `storeThumbnail` and `removeTrack` (the prune's death).
- Every single-track transition reads the row it acts on, refuses when the row is not in a state the move leaves, and writes only when the move applies. The move and its guard are one expression: the write is conditional on the leaving state, and the read afterwards only says which refusal happened. The outcome is `TrackTransitionOutcome` (`Applied`, `Refused`, `Missing`).
- `markTrackSourceRemoved` now reads the file status itself, so the eligibility rule (a stored file is kept, no file becomes unavailable) is applied in one place and the callers no longer pass the status in. The sync's retention and the worker's gone-video both call it.
- The six callers cross the seam. The sync calls `createPendingTrack`, `retryTrack` and `markTrackSourceRemoved`; the worker calls `claimPendingTracks`, `storeTrack`, `failTrack`, `markTrackSourceRemoved` and `storeThumbnail`; the sweep calls `resetDownloadingTracks`; the retry and fetch-whole services call `retryTrack` and `fetchTrackWhole` and map the module's outcome to their route outcomes; the prune calls `removeTrack`.
- What stays with the caller is what genuinely differs. The worker's double emit on claim and on terminal stays in the worker, because the sync's source-removed does not emit a track change and the event bus is out of scope. The prune keeps its downloading skip, because the media must be removed before the row and the guard has to run before that; it then calls `removeTrack` for the write. Suppression stays in the sync.

Tests: `trackLifecycle.test.ts` now tests the transitions and their guards at the interface (creation, claim and its cap, store, fail, retry, fetch-whole, source-removed including the stored-file rule, the startup reset, the artwork and the row removal), alongside the existing sync, worker, route, prune and sweep tests.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (server 305, web 372, i18n 39, ui-foundation 6, youtube 29, tokens 3) pass. Not committed.

## Observed

- Inline state writes in `syncService.ts`, `downloadWorker.ts`, `startupSweep`, `trackService.ts`, `trackLifecycle.ts`, `pruneService.ts`.
- `markTrackSourceRemoved` is the only shared rule, and it writes.
- `trackLifecycle.test.ts` tests the helper, not the callers' eligibility rule.

## Expected

One module owns the transitions and their guards; the six writers call it.

## Evidence

- The state-write table in the architecture review, candidate 3.
- `trackLifecycle.ts`: `markTrackSourceRemoved`, a write rather than a guard.
