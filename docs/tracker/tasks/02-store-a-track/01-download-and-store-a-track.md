# 01: Download and store a pending track

**What to build:** A track a sync left `pending` becomes playable on its own. The worker claims pending tracks,
downloads each through the YouTube adapter into the temporary directory, moves the finished file into the media
store at its sharded path in one step, and marks it `stored` with its path and a cleared failure reason, so the
stream route serves it. A stored track is never claimed again, whoever asks for it: a second playlist or a
second account that associates it is immediately playable with no second fetch, and the media store holds one
file per video id.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A pending track is claimed, downloaded, moved into the media store, and marked `stored` with its path and a cleared failure reason.
- [ ] The stream route serves the stored bytes, and the file sits at the sharded path the media store defines.
- [ ] A track already `stored` is never claimed, and a second association to it is immediately streamable with no download.
- [ ] One video id maps to one track row and one stored file.
- [ ] The claim moves a track from `pending` to `downloading` only if it is still `pending`, so two passes cannot start the same download.
- [ ] A test can drive one pass of the worker without waiting on its interval.
