# 28: A track change tells a listener only about playlists it can see

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** A `TrackChanged` event carries every playlist that holds the track to every account that can see any of them, so a listener learns the ids of playlists it cannot access.

**Current behavior:**
`trackAudience` returns every holding playlist id and the union of their owners and collaborators, and `publishTrackChanged` sends the whole list to all of them. A track is instance-wide and deduplicated, so it can be held by playlists across accounts. The `EventBus` documents the invariant that a listener never receives a fact about a playlist it cannot see.

**Desired behavior:**
The event is computed per recipient. Each account receives only the playlist ids it can access. The `EventBus` invariant holds again.

**Key interfaces:**

- `trackAudience` in `shared/access`, which currently returns a flat audience.
- `publishTrackChanged` and `publishTracksChangedForPlaylists` in `shared/events`.
- The `EventBus` publish signature, if a per-recipient payload needs a new shape.
- `LiveEventSchema`'s `TrackChanged` shape, which stays an array of playlist ids.

**Acceptance criteria:**

- [ ] An account that can access one holding playlist but not another receives only the accessible id.
- [ ] An account that can access none of them receives no event.
- [ ] The batch-add path filters the same way.
- [ ] Tests cover a track held by both an accessible and an inaccessible playlist.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The event's other kinds, which already carry a single playlist the recipient can see.
- Changing what the client does with the payload.

## Evidence

- `apps/server/src/shared/access/playlistAccess.ts:240-268`.
- `apps/server/src/shared/events/liveEvents.ts:45-59, 67-86`.
- `apps/server/src/shared/events/eventBus/EventBus.ts:4-6`.
- Security review 2026-10-08, finding 9.
