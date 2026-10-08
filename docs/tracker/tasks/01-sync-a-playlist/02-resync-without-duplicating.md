# 02: Resync a playlist without duplicating

**Blocked by:** 01.
**Status:** resolved

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
