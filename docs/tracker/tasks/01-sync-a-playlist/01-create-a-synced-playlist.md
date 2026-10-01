# 01: Create a synced playlist and run its first sync

**What to build:** A listener pastes a YouTube playlist URL and ends up with a Synced playlist that holds the
source's videos. The request creates the playlist (named and covered from the source), starts a sync run, and
returns immediately with the run in `running`; the run reads the source membership once through the YouTube
adapter and, for every video, creates a track in `pending` plus a remote association appended in source order.
When the run finishes it reports how many associations it added, and the playlist records when it last synced
and that it is `idle`. Pasting the same source again must not create a second playlist, so the schema's
source-uniqueness constraint becomes per owner.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] Posting a YouTube playlist URL creates exactly one Synced playlist owned by the caller, named and covered from the source, and answers `202` with a run in `running`.
- [x] The reconcile reads the source once through the adapter and creates one `pending` track plus a remote association per video, in source order, with positions appended.
- [x] The playlist's track count equals the associations created, and a video the instance already holds gains an association and no second track.
- [x] Completing the run writes its added count and the playlist's last-synced time and `idle` status in one transaction.
- [x] A source with no usable title names the playlist after its source id.
- [x] Two owners may each hold the same source without collision.
- [x] The suite substitutes a fake adapter; nothing spawns a process or touches the network.

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
