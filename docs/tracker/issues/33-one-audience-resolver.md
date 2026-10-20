# 33: One audience resolver

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

`playlistAudiences(database, playlistIds)` in `playlistAccess.ts` is the one account-to-playlists grouping: one query for the whole batch, grouped by account, in the order the caller named the playlists, with the owner first. A missing playlist and an empty batch add nobody.

`playlistAudience` is now a single-playlist projection of it, and `trackAudience` reads the track's holding playlists once and projects them through the same resolver. `publishTracksChangedForPlaylists` calls the batch resolver once instead of calling `playlistAudience` per id, while `publishPlaylistChanged` and `publishTrackChanged` reach the resolver through their projections. The events each listener receives are unchanged.

`playlistAccess.test.ts` covers the batch grouping, the missing and empty cases, both projections, and one query for a three-playlist batch. `liveEvents.test.ts` checks the batch publisher reads that resolver in one query, and the existing event tests pass unchanged. `pnpm run build`, `pnpm run lint`, the unit suites (499 web, 384 server, 39 i18n, 31 youtube, 2 tokens, 6 ui-foundation) and `pnpm test:e2e` (35 journeys) pass.

## Agent Brief

**Category:** enhancement
**Summary:** The account-to-holding-playlists grouping is hand-written twice, and the second copy walks a per-playlist resolver that costs two queries per id, so a track change fans out into an N+1.

**Current behavior:**
`trackAudience(database, trackId)` answers the account-to-holding-playlists map in one joined query, grouping in memory. `publishTracksChangedForPlaylists(context, playlistIds)` builds the same shaped map from the opposite direction: for each named playlist it calls `playlistAudience(database, playlistId)`, which costs two queries per playlist (an owner read and a collaborators read), then re-groups the results. The two groupings have to agree, and the second is an N+1 over the batch.

**Desired behavior:**
One batch resolver answers "for these playlists, which account hears which of them": `playlistAudiences(database, playlistIds)`. Both publishers read it once, and the two single-id resolvers become projections of it, so the grouping is stated once and the N+1 is gone. The events a listener receives are unchanged.

**Key interfaces:**

- A batch resolver keyed by explicit playlist ids, returning each account and the playlists it may hear about.
- `playlistAudience(playlistId)` and `trackAudience(trackId)` keep their shapes but derive from the batch resolver.
- The publishers in `liveEvents` call the batch resolver, once per classify.

**Acceptance criteria:**

- [ ] The account-to-playlists grouping is written in one place.
- [ ] Publishing a track change for N playlists costs O(1) queries, not 2N.
- [ ] `publishPlaylistChanged`, `publishTrackChanged` and `publishTracksChangedForPlaylists` all read the one resolver.
- [ ] The events a listener receives (who, and which playlist ids) are unchanged.
- [ ] Tests cover the batch resolver and the two publishers; the existing event tests keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The event bus and the SSE route.
- The access rule itself (who may see a playlist).
- A shared bus for multiple replicas.

## Observed

- `trackAudience` groups by account in one query.
- `publishTracksChangedForPlaylists` rebuilds the same map via `playlistAudience` per id.
- `playlistAudience` is two queries per call.

## Expected

One batch resolver; both publishers and both single-id resolvers read it.

## Evidence

- `apps/server/src/shared/access/playlistAccess.ts:204-277`.
- `apps/server/src/shared/events/liveEvents.ts:44-86`.
- Architecture review 2026-10-08, candidate 2.
