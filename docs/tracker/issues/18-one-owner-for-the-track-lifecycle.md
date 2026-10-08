# 18: One owner for the track lifecycle

**State:** `ready-for-agent`
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

- [ ] The track state columns are written by one module and nowhere else.
- [ ] Each transition is expressed once, with its guard, and an illegal transition is refused.
- [ ] The sync, the worker, the sweep, the retry, the fetch-whole and the prune call the module.
- [ ] The observable sync, download and prune behaviour and the schema are unchanged.
- [ ] The lifecycle has a test at its interface; the existing sync, worker and lifecycle tests keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The event bus (a transition could emit, but deriving events is a separate decision).
- The access checks (issue 22).
- New states or a schema change.

## Observed

- Inline state writes in `syncService.ts`, `downloadWorker.ts`, `startupSweep`, `trackService.ts`, `trackLifecycle.ts`, `pruneService.ts`.
- `markTrackSourceRemoved` is the only shared rule, and it writes.
- `trackLifecycle.test.ts` tests the helper, not the callers' eligibility rule.

## Expected

One module owns the transitions and their guards; the six writers call it.

## Evidence

- The state-write table in the architecture review, candidate 3.
- `trackLifecycle.ts`: `markTrackSourceRemoved`, a write rather than a guard.
