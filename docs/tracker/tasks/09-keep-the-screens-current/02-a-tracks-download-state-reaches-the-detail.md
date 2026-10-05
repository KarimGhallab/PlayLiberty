# 02: A track's download state reaches the playlist detail

**What to build:** A listener adds a video to a playlist and watches its row move from pending to downloading
to playable in the open detail, without a reload. The download worker publishes to the bus when it claims a
track, when it stores one, when a download fails and when a video is gone, naming the playlists the track
belongs to and so the accounts that can see them. The detail's tracks read and its playlist read are
invalidated on those events, so the row's state word and the playlist's counts catch up. A track in another
playlist does not touch this screen. Reuses the bus, route, edge configuration and client stream from
[ticket 01](01-the-stream-and-a-playlists-sync-progress.md).

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The worker publishes a track event when a download is claimed, stored, failed, or found gone.
- [ ] The event reaches the accounts that can see a playlist holding the track, and no other account.
- [ ] The open detail updates the row's state without a reload, and a playlist that does not hold the track is
      not invalidated by its event.
- [ ] An e2e test adds a video, watches the row move through the download states to playable without a reload.
- [ ] Unit tests cover the worker's publish points and the detail's invalidation; build, lint and the suites
      pass.
