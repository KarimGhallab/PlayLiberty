# 01: Create a synced playlist and run its first sync

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `POST /playlists` validates the URL, creates the caller's Synced playlist and a run
in `running`, and answers `202` with the run; the reconcile finishes behind the response and a client reads it
from the latest-run route. It reads the source once through the adapter, creates one `pending` remote
association per video in source order, reuses a track the instance already holds, and writes the run's added
count with the playlist's name, cover, last-synced time and `idle` status in one transaction. Source
uniqueness is now per owner (migration `0002`), and `createTestContext` takes a substitutable adapter, with
`fakeYoutube` the fake shared with the CSRF suite.

Verification: `pnpm run test` (68 server tests, 7 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
`pnpm run script:unused-code` reports two unused exports, `PangolinConfig` and `PlayerStoreApi`, in files this
ticket does not touch, so that finding is pre-existing.
