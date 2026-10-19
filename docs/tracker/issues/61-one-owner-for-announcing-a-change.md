# 61: One owner for announcing a change

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

`liveEvents` keeps its four publishers and gains the one seam from a committed change to its event: `ChangeKind` names what changed, and `announce` maps it to the publisher. Only `announce` calls a publisher now, and no route module imports one.

Each committing module announces its own write: `playlistService` (rename, skip-non-music, sort, delete, track removal), `shareService` (grant and revoke), `trackService` (retry and fetch-whole), `addTrackToPlaylists`, and `syncService`. The download worker's four transitions go through the same seam. The change is built from the outcome the service already holds, so the seam re-reads nothing; delete reads the audience before the row goes, because it cannot be read after. A refusal returns before `announce`, so a failed or refused write says nothing.

`liveEvents.test.ts` covers a refused rename, track removal, share grant and retry beside the success cases, and the events a listener receives are unchanged. `pnpm run build`, `pnpm run lint` and the unit suites (484 web, 376 server, 39 i18n, 31 youtube, 2 tokens, 6 ui-foundation) pass.

## Agent Brief

**Category:** enhancement
**Summary:** The decision to announce a committed change lives at the call site: six handlers run service-then-publish by hand while the sync publishes from inside its own body, so a write path can commit in silence.

**Current behavior:**
Each mutating handler repeats one template: validate, call the service, map the outcome, and publish if the outcome was Ok. Rename, skip-non-music and sort each end in `publishPlaylistChanged` (`playlistRoutes.ts:200`, `:231`, `:262`); deleting a playlist publishes a removal (`:321`); removing a track publishes `publishTracksChangedForPlaylists` (`:370`); retry and fetch-whole publish a track change (`trackRoutes.ts:178`, `:214`). The share route publishes its own two events (`shareRoutes.ts:100`, `:131`, `:134`). `syncService` does the opposite and publishes from inside its implementation (`:184`, `:285`, `:310`), and the download worker announces at four sites (`downloadWorker.ts:103`, `:148`, `:160`, `:170`).

The rule therefore has no owner. A new write path can commit state and announce nothing, which leaves every open client stale until its next refetch, and no test can fail on that omission because nothing states the rule.

**Desired behavior:**
The module that commits a change also announces it, in the same interior, and one seam decides which event a change produces. A route validates, calls, maps the outcome and sends; it imports no publisher. An event stays an invalidation hint and never data, as the architecture decision has it.

**Key interfaces:**

- The service's outcome carries what changed, so the announcing seam can classify the event without re-reading.
- The publishing seam keeps its current input: the accounts and playlist ids an event is addressed to.
- `liveEvents` keeps its four publishers; what moves is who calls them.

**Acceptance criteria:**

- [ ] No route module imports a publisher.
- [ ] Each mutating service announces its own commit, on the success path only.
- [ ] A failed or refused write announces nothing.
- [ ] The events a listener receives, who and which playlist ids, are unchanged.
- [ ] Tests cover the announce-on-commit rule where it is owned; the existing event tests keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The SSE transport and the client's reconnect.
- The audience rule for who may hear about a playlist (issue 33).
- The event each transition produces, which the seam keeps as it is.

## Observed

- Six route handlers publish after a service call.
- `syncService` publishes from inside the implementation.
- Nothing states where a commit must be announced, so a new write path can omit it.

## Expected

The committing module announces; the routes stop publishing.

## Evidence

- `apps/server/src/features/playlists/routes/playlistRoutes.ts:200`, `:231`, `:262`, `:321`, `:370`.
- `apps/server/src/features/tracks/routes/trackRoutes.ts:178`, `:214`.
- `apps/server/src/features/shares/routes/shareRoutes.ts:100`, `:131`, `:134`.
- `apps/server/src/features/sync/services/syncService.ts:184`, `:285`, `:310`.
- `apps/server/src/features/downloads/worker/downloadWorker.ts:103`, `:148`, `:160`, `:170`.
- Architecture review 2026-10-16, candidate 3.
