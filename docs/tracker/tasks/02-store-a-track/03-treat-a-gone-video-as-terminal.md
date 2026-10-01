# 03: Treat a video that is gone as terminal

**What to build:** When a video has been deleted, the download stops rather than hammering it. The adapter
signals that a video is unavailable distinctly from a transient failure, and the worker classifies it the way
the sync does: the track becomes `sourceStatus: removed`, and `fileStatus: unavailable` when there is no stored
file, while a track that already has a file keeps it and only its source status moves. A gone track is never
retried.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The adapter distinguishes a video that is gone from a transient failure.
- [ ] A download that finds the video gone sets `sourceStatus: removed` and, with no file, `fileStatus: unavailable`.
- [ ] A stored track keeps its file when its video turns out to be gone.
- [ ] A gone track is not retried by a later download pass or sync.
