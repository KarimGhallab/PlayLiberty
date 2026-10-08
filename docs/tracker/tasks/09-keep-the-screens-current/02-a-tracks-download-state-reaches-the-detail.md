# 02: A track's download state reaches the playlist detail

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md).
**Status:** resolved

## Outcome

Implemented and verified. The worker is the second publisher on the bus ticket 01 built, and a track's state
is the second thing the client reacts to.

Two decisions worth naming.

The event names the playlists, not the track. `track.changed` carries `playlistIds` and nothing else, so the
client invalidates each playlist that holds the track and never one that does not; the row's state word and the
playlist's counts come from the refetch rather than from the wire. The audience is `trackAudience`, which
resolves the playlists holding the track and the accounts that can see any of them in one join, so a track
shared across playlists tells all of them and one file fetched once updates every screen that shows it.

The worker publishes at each transition it owns: when it claims a track, when it stores one, when a download
fails, and when a video is gone. The stored publish is after the artwork fetch, so one refetch carries the
stored row and its picture; a failed artwork still publishes, because the audio is what makes the track
playable.

Tests: four in `downloadWorker.test.ts` (claim and store, fail, gone, and a collaborator receives while a
stranger does not) and one in `liveEvents.test.ts` (every named playlist is invalidated and no other is). The
e2e fake gained `downloadDelayMs` so the downloading state is observable rather than gone before the browser
reads it; the `live.spec.ts` journey adds the video through the API rather than the dialog, so the detail never
asked about it and only the worker's events can make the row appear and change.

Verification: `pnpm run build`, `pnpm run lint`, `pnpm test:unit` (server 263, web 293, packages green) and
`pnpm --filter @playliberty/e2e exec playwright test` (25 passed, 1.3m) all pass. No em dashes. Not committed.
