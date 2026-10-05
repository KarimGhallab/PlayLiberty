# 02: A track's download state reaches the playlist detail

**What to build:** A listener adds a video to a playlist and watches its row move from pending to downloading
to playable in the open detail, without a reload. The download worker publishes to the bus when it claims a
track, when it stores one, when a download fails and when a video is gone, naming the playlists the track
belongs to and so the accounts that can see them. The detail's tracks read and its playlist read are
invalidated on those events, so the row's state word and the playlist's counts catch up. A track in another
playlist does not touch this screen. Reuses the bus, route, edge configuration and client stream from
[ticket 01](01-the-stream-and-a-playlists-sync-progress.md).

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The worker publishes a track event when a download is claimed, stored, failed, or found gone.
- [x] The event reaches the accounts that can see a playlist holding the track, and no other account.
- [x] The open detail updates the row's state without a reload, and a playlist that does not hold the track is
      not invalidated by its event.
- [x] An e2e test adds a video, watches the row move through the download states to playable without a reload.
- [x] Unit tests cover the worker's publish points and the detail's invalidation; build, lint and the suites
      pass.

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
