# 06: Paste a single video URL

**What to build:** A listener pastes a single video URL and gets a one-track Synced playlist whose source is
that video, with one remote association, named and covered from the video. It syncs and re-syncs like any
other playlist. This is distinct from adding a video to playlists that already exist, which spec 04 owns.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A single video URL creates a Synced playlist whose source is that video, with one remote association.
- [ ] The playlist's name and cover come from the video.
- [ ] Re-posting the same video URL returns the existing playlist rather than creating a second.
