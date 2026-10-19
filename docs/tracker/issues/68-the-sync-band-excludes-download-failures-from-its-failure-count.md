# 68: The sync band's failure count excludes download failures

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The detail's sync band draws the last run's counts, so a playlist whose every download failed afterwards shows "failed 0" beside a chip rail and four rows that all read Failed, and the word means two different things on one screen.

**Current behavior:**
`SyncSummary.tsx:34-70` draws `run.retainedCount`, `run.addedCount`, `run.removedCount` and `run.failedCount`, the numbers of the last sync run. The run reconciles the source and queues the new tracks; the downloads fail later, in the worker, after the run has settled. So on "Deep Focus" (4 tracks, every download failed) the band reads `0 kept / 4 added / 0 removed / 0 failed` while the chip rail reads `Failed 4` and all four rows read Failed. The component's own preamble (`SyncSummary.tsx:7-11`) says a playlist with no run renders nothing rather than four zeroes, but it does not address a run whose downloads have since failed.

**Desired behavior:**
The band either names what it counts (for example that these are the last run's numbers) or reflects the tracks that actually ended failed, so a failure figure on the screen never contradicts the rows and chips beside it.

**Key interfaces:**

- `SyncSummary` keeps its four cells and the in-flight line.
- `SyncRun`'s shape is unchanged; this is which measurement the band presents and how it is worded.

**Acceptance criteria:**

- [ ] A playlist whose every download failed does not present a failure figure that contradicts its rows or its chips.
- [ ] The wording of the band names the measurement it reports.
- [ ] A test holds a settled run whose tracks have since failed.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The sync pipeline and the download worker's own state machine.
- The `SyncError` component, which replaces the band rather than sitting beside it.

## Observed

- "Deep Focus": band `0 kept / 4 added / 0 removed / 0 failed`; rail `Failed 4`; four rows Failed.
- The band counts the last run; the rows count current file status.

## Expected

- The band and the rows cannot disagree about whether anything failed.

## Evidence

- `apps/web/src/shared/components/SyncSummary/SyncSummary.tsx:7-11,34-70`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:474`.
- Impeccable critique of `apps/web`, 2026-10-16, priority issue P2; reproduced in the seeded e2e stack with a source whose downloads are scripted to fail.
