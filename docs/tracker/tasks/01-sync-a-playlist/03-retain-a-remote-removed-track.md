# 03: Retain a track whose source video is gone

**What to build:** A source video that disappears no longer takes the track with it. On the next sync, a video
absent from the source marks its track remote-removed: the file is retained, the track still plays, and the run
counts it as retained rather than removed. A track that left the source before its audio was ever fetched
becomes `unavailable` instead of sitting `pending` forever. Because the flag lives on the track, a video gone
from the source reads the same way in every playlist that holds the track.

**Blocked by:** 02.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A video absent from the source marks its track `sourceStatus: removed`, keeps its file, and increments the run's retained count.
- [ ] The run's removed count stays zero.
- [ ] A remote-removed stored track still streams.
- [ ] A video that left the source before it was ever downloaded becomes `unavailable`, not `pending`, and is not queued.
- [ ] A track associated with two playlists that leaves the source reads remote-removed in both.
