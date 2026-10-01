# 02: Resync a playlist without duplicating

**What to build:** A listener can refresh an existing playlist. Starting a sync on a playlist they own or
write to reads the source again and reconciles it: a video already associated stays exactly where it is, a
video new to the source is appended after it, and running the same sync twice changes nothing the second
time. Re-pasting a source the listener already synced returns the existing playlist and starts a run rather
than creating a second. While a run is in flight, a second request is refused rather than queued.

**Blocked by:** 01.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] Starting a sync on an existing playlist answers `202` with a run in `running`.
- [x] A video already associated is left exactly as it is, including its position and its metadata, and a video new to the source is appended after it.
- [x] Running the same sync twice changes nothing the second time.
- [x] Re-pasting a source the caller already synced returns the existing playlist and starts a run, not a second playlist.
- [x] A second sync while one is in flight answers `409` with a problem document.

## Outcome

Implemented and verified. `POST /playlists/:id/sync` starts a run on an existing playlist and answers `202`
with it; a caller who is neither the owner nor a write collaborator answers not-found, so the route never
confirms a playlist the caller cannot write. The reconcile reads the source again from a stored, normalized
source URL (new nullable `source_url` column, migration `0003`) and leaves an associated video exactly as it
is, appends a new one after it, and reuses a track the instance already holds. A second run while one is in
flight answers `409 sync_already_running`, on the resync route and on a re-paste alike. Ticket 01's create
path now stores the source URL and shares `beginRun` with the resync route.

Verification: `pnpm run test` (73 server tests, 5 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.

Known gap, not this ticket's: a run left `running` by a crash is never reclaimed, so its playlist would answer
`409` until something marks it failed. No current ticket owns that recovery.
